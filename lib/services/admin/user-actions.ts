// ============================================================
// Admin User Actions (SOLID: Dependency Inversion Principle)
// Business logic with injectable dependencies
// ============================================================

import type {
  AdminActionParams,
  UpdateStatusParams,
  UpdateStatusResult,
  IssueWarningResult,
  UserStatusUpdateDeps,
  WarningIssueDeps,
  UserData,
} from "@/lib/services/admin/types"
import {
  createUserStatusDeps,
  createWarningIssueDeps,
} from "@/lib/services/admin/firebase-admin-deps"

// Re-export types for backward compatibility
export type { AdminActionParams, UpdateStatusParams }

// ============ Helper Functions ============

function buildStatusUpdates(
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED',
  reason?: string,
  suspendDays?: number,
  suspendMinutes?: number
): Partial<UserData> {
  const updates: Partial<UserData> = { status }

  if (status === 'SUSPENDED') {
    const suspendUntil = new Date()
    if (suspendDays && suspendDays > 0) {
      suspendUntil.setDate(suspendUntil.getDate() + suspendDays)
    }
    if (suspendMinutes && suspendMinutes > 0) {
      suspendUntil.setMinutes(suspendUntil.getMinutes() + suspendMinutes)
    }
    updates.suspendedUntil = suspendUntil
    updates.restrictions = { canPost: false, canExchange: false, canChat: false }
  }

  if (status === 'BANNED') {
    updates.bannedReason = reason
    updates.restrictions = { canPost: false, canExchange: false, canChat: false }
  }

  if (status === 'ACTIVE') {
    updates.warningCount = 0
    updates.restrictions = { canPost: true, canExchange: true, canChat: true }
    updates.suspendedUntil = null
    updates.bannedReason = null
  }

  return updates
}

function getStatusText(status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'): string {
  switch (status) {
    case 'ACTIVE':
      return 'ได้รับสิทธิ์ใช้งานปกติ'
    case 'SUSPENDED':
      return 'ถูกระงับการใช้งานชั่วคราว'
    case 'BANNED':
      return 'ถูกระงับการใช้งานถาวร'
  }
}

function getActionType(status: 'ACTIVE' | 'SUSPENDED' | 'BANNED') {
  switch (status) {
    case 'ACTIVE':
      return 'user_activate' as const
    case 'SUSPENDED':
      return 'user_suspend' as const
    case 'BANNED':
      return 'user_ban' as const
  }
}

// ============ Core Business Logic (DIP) ============

/**
 * Update User Status - Core business logic with injectable dependencies
 * @param params - Update parameters
 * @param deps - Injectable dependencies (for testing or different implementations)
 */
export async function updateUserStatusWithDeps(
  params: UpdateStatusParams,
  deps: UserStatusUpdateDeps
): Promise<UpdateStatusResult> {
  const { adminId, adminEmail, userId, status, reason, suspendDays, suspendMinutes } = params

  const existingUser = await deps.getUserById(userId)
  const beforeState = existingUser ?? { status: 'NEW (Auto-created)' }

  try {
    const updates = buildStatusUpdates(status, reason, suspendDays, suspendMinutes)

    // 1. Update or create user
    if (!existingUser) {
      await deps.createUser(userId, updates)
    } else {
      await deps.updateUser(userId, updates)
    }

    // 2. Create Audit Log
    const afterState = { ...beforeState, ...updates }
    await deps.createAuditLog({
      actionType: getActionType(status),
      adminId,
      adminEmail,
      targetType: 'user',
      targetId: userId,
      targetInfo: (existingUser as UserData | null)?.email || userId,
      description: `เปลี่ยนสถานะเป็น ${status}${reason ? `: ${reason}` : ''}`,
      status: 'success',
      reason,
      beforeState: beforeState as Record<string, unknown>,
      afterState: afterState as Record<string, unknown>,
      metadata: { status, reason, suspendDays },
    })

    // 3. Create Notification
    let msg = `บัญชีของคุณได้ถูกเปลี่ยนสถานะเป็น: ${getStatusText(status)}`
    if (reason) msg += ` เนื่องด้วยเหตุผล: ${reason}`

    await deps.createNotification({
      userId,
      title: "อัปเดตสถานะบัญชี",
      message: msg,
      type: status === 'ACTIVE' ? 'system' : 'warning',
      relatedId: userId,
      isRead: false,
    })

    // 4. Create Warning Record if negative action
    if (status !== 'ACTIVE') {
      const warningAction = status === 'SUSPENDED' ? 'SUSPEND' : 'BAN'
      await deps.createWarningRecord({
        userId,
        reason: reason || 'Status updated by admin',
        issuedBy: adminId,
        issuedByEmail: adminEmail,
        action: warningAction,
        resolved: false,
      })
    }

    return {
      success: true,
      status,
      userId,
      suspendedUntil: updates.suspendedUntil,
    }
  } catch (error: unknown) {
    console.error("[AdminService] Update Status Failed:", error)

    // Log Failure
    await deps.createAuditLog({
      actionType: getActionType(status),
      adminId,
      adminEmail,
      targetType: 'user',
      targetId: userId,
      status: 'failed',
      reason: error instanceof Error ? error.message : String(error),
      metadata: { error: String(error) },
    })

    throw error
  }
}

/**
 * Issue Warning - Core business logic with injectable dependencies
 * @param params - Warning parameters
 * @param deps - Injectable dependencies
 */
export async function issueWarningWithDeps(
  params: AdminActionParams,
  deps: WarningIssueDeps
): Promise<IssueWarningResult> {
  const { adminId, adminEmail, userId, reason } = params

  const existingUser = await deps.getUserById(userId)
  if (!existingUser) {
    throw new Error('User not found')
  }

  const beforeState = existingUser

  try {
    const currentWarnings = beforeState.warningCount || 0
    const newWarningCount = currentWarnings + 1

    const updates: Partial<UserData> = {
      warningCount: newWarningCount,
      lastWarningDate: new Date(),
    }

    // 1. Update User
    await deps.updateUser(userId, updates)

    // 2. Create Warning Record
    await deps.createWarningRecord({
      userId,
      userEmail: beforeState.email,
      reason: reason || '',
      issuedBy: adminId,
      issuedByEmail: adminEmail,
      action: 'WARNING',
      resolved: false,
    })

    // 3. Notify User
    await deps.createNotification({
      userId,
      title: 'ได้รับคำเตือน',
      message: `${reason} (คำเตือนครั้งที่ ${newWarningCount})`,
      type: 'warning',
      isRead: false,
    })

    // 4. Audit Log
    await deps.createAuditLog({
      actionType: 'user_warning',
      adminId,
      adminEmail,
      targetType: 'user',
      targetId: userId,
      targetInfo: beforeState.email,
      description: `ออกคำเตือนครั้งที่ ${newWarningCount}: ${reason}`,
      status: 'success',
      reason,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: { ...beforeState, ...updates } as unknown as Record<string, unknown>,
      metadata: { warningCount: newWarningCount },
    })

    return { success: true, warningCount: newWarningCount }
  } catch (error: unknown) {
    console.error("[AdminService] Issue Warning Failed:", error)

    await deps.createAuditLog({
      actionType: 'user_warning',
      adminId,
      adminEmail,
      targetType: 'user',
      targetId: userId,
      status: 'failed',
      reason: error instanceof Error ? error.message : String(error),
    })

    throw error
  }
}

// ============ Convenience Functions (Backward Compatible) ============

/**
 * Update User Status - Uses Firebase Admin SDK by default
 * This is the original API for backward compatibility
 */
export async function updateUserStatus(
  params: UpdateStatusParams
): Promise<UpdateStatusResult> {
  const deps = createUserStatusDeps()
  return updateUserStatusWithDeps(params, deps)
}

/**
 * Issue Warning - Uses Firebase Admin SDK by default
 * This is the original API for backward compatibility
 */
export async function issueWarning(
  params: AdminActionParams
): Promise<IssueWarningResult> {
  const deps = createWarningIssueDeps()
  return issueWarningWithDeps(params, deps)
}
