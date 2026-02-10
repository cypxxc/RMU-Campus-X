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

const WARNING_LIMIT_FOR_SUSPENSION = 3
const AUTO_SUSPEND_DAYS = 7
const SUSPENSION_LIMIT_FOR_BAN = 2

function buildSuspendUntil(suspendDays?: number, suspendMinutes?: number): Date {
  const suspendUntil = new Date()
  if (suspendDays && suspendDays > 0) {
    suspendUntil.setDate(suspendUntil.getDate() + suspendDays)
  }
  if (suspendMinutes && suspendMinutes > 0) {
    suspendUntil.setMinutes(suspendUntil.getMinutes() + suspendMinutes)
  }
  return suspendUntil
}

function buildStatusUpdates(
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED',
  reason?: string,
  suspendDays?: number,
  suspendMinutes?: number
): Partial<UserData> {
  const updates: Partial<UserData> = { status }

  if (status === 'SUSPENDED') {
    updates.suspendedUntil = buildSuspendUntil(suspendDays, suspendMinutes)
    updates.restrictions = { canPost: false, canExchange: false, canChat: false }
    updates.bannedReason = null
  }

  if (status === 'BANNED') {
    updates.bannedReason = reason
    updates.suspendedUntil = null
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
      return 'ใช้งานได้ตามปกติ'
    case 'SUSPENDED':
      return 'ถูกระงับชั่วคราว'
    case 'BANNED':
      return 'ถูกแบนถาวร'
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
  const currentSuspensionCount = Number(existingUser?.suspensionCount) || 0

  try {
    let effectiveStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED' = status
    let effectiveReason = reason
    let updates = buildStatusUpdates(status, reason, suspendDays, suspendMinutes)

    const metadata: Record<string, unknown> = {
      requestedStatus: status,
      requestedSuspendDays: suspendDays,
      requestedSuspendMinutes: suspendMinutes,
      currentSuspensionCount,
    }

    // Policy: suspended 2 times => auto banned
    if (status === 'SUSPENDED') {
      const nextSuspensionCount = currentSuspensionCount + 1
      updates.suspensionCount = nextSuspensionCount
      metadata.nextSuspensionCount = nextSuspensionCount

      if (nextSuspensionCount >= SUSPENSION_LIMIT_FOR_BAN) {
        effectiveStatus = 'BANNED'
        effectiveReason =
          reason ||
          `บัญชีถูกแบนอัตโนมัติ เนื่องจากถูกระงับครบ ${SUSPENSION_LIMIT_FOR_BAN} ครั้ง`
        updates = buildStatusUpdates(effectiveStatus, effectiveReason)
        updates.suspensionCount = nextSuspensionCount
        metadata.autoEscalatedToBan = true
      }
    }

    // 1. Update or create user
    if (!existingUser) {
      await deps.createUser(userId, updates)
    } else {
      await deps.updateUser(userId, updates)
    }

    // 2. Create Audit Log
    const afterState = { ...beforeState, ...updates }
    await deps.createAuditLog({
      actionType: getActionType(effectiveStatus),
      adminId,
      adminEmail,
      targetType: 'user',
      targetId: userId,
      targetInfo: (existingUser as UserData | null)?.email || userId,
      description: `เปลี่ยนสถานะเป็น ${effectiveStatus}${effectiveReason ? `: ${effectiveReason}` : ''}`,
      status: 'success',
      reason: effectiveReason,
      beforeState: beforeState as Record<string, unknown>,
      afterState: afterState as Record<string, unknown>,
      metadata,
    })

    // 3. Create Notification
    let msg = `บัญชีของคุณถูกเปลี่ยนสถานะเป็น: ${getStatusText(effectiveStatus)}`
    if (effectiveReason) msg += ` เนื่องด้วยเหตุผล: ${effectiveReason}`

    await deps.createNotification({
      userId,
      title: 'อัปเดตสถานะบัญชี',
      message: msg,
      type: effectiveStatus === 'ACTIVE' ? 'system' : 'warning',
      relatedId: userId,
      isRead: false,
    })

    // 4. Create Warning Record if negative action
    if (effectiveStatus !== 'ACTIVE') {
      const warningAction = effectiveStatus === 'SUSPENDED' ? 'SUSPEND' : 'BAN'
      await deps.createWarningRecord({
        userId,
        reason: effectiveReason || 'Status updated by admin',
        issuedBy: adminId,
        issuedByEmail: adminEmail,
        action: warningAction,
        resolved: false,
      })
    }

    return {
      success: true,
      status: effectiveStatus,
      userId,
      suspendedUntil: updates.suspendedUntil,
    }
  } catch (error: unknown) {
    console.error('[AdminService] Update Status Failed:', error)

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
    const safeReason = reason || 'พฤติกรรมไม่เหมาะสมในการใช้งานระบบ'
    const currentWarnings = Number(beforeState.warningCount) || 0
    const currentSuspensionCount = Number(beforeState.suspensionCount) || 0
    const newWarningCount = currentWarnings + 1

    let autoAction: 'NONE' | 'SUSPENDED' | 'BANNED' = 'NONE'
    let suspendedUntil: Date | null = null
    let nextSuspensionCount = currentSuspensionCount

    const updates: Partial<UserData> = {
      warningCount: newWarningCount,
      lastWarningDate: new Date(),
    }

    // Policy: warning 3 times => suspend 7 days
    if (newWarningCount >= WARNING_LIMIT_FOR_SUSPENSION) {
      nextSuspensionCount = currentSuspensionCount + 1
      updates.suspensionCount = nextSuspensionCount

      // Policy: suspended 2 times => banned
      if (nextSuspensionCount >= SUSPENSION_LIMIT_FOR_BAN) {
        autoAction = 'BANNED'
        updates.status = 'BANNED'
        updates.suspendedUntil = null
        updates.restrictions = { canPost: false, canExchange: false, canChat: false }
        updates.bannedReason =
          `บัญชีถูกแบนอัตโนมัติ เนื่องจากถูกระงับครบ ${SUSPENSION_LIMIT_FOR_BAN} ครั้ง`
      } else {
        autoAction = 'SUSPENDED'
        suspendedUntil = buildSuspendUntil(AUTO_SUSPEND_DAYS)
        updates.status = 'SUSPENDED'
        updates.suspendedUntil = suspendedUntil
        updates.restrictions = { canPost: false, canExchange: false, canChat: false }
        updates.bannedReason = null
        updates.warningCount = 0
      }
    }

    // 1. Update User
    await deps.updateUser(userId, updates)

    // 2. Create Warning Record (always)
    await deps.createWarningRecord({
      userId,
      userEmail: beforeState.email,
      reason: safeReason,
      issuedBy: adminId,
      issuedByEmail: adminEmail,
      action: 'WARNING',
      resolved: false,
    })

    // 2.1 Create Warning Record for policy enforcement
    if (autoAction === 'SUSPENDED') {
      await deps.createWarningRecord({
        userId,
        userEmail: beforeState.email,
        reason: `ครบ ${WARNING_LIMIT_FOR_SUSPENSION} คำเตือน ระบบระงับบัญชีอัตโนมัติ ${AUTO_SUSPEND_DAYS} วัน`,
        issuedBy: adminId,
        issuedByEmail: adminEmail,
        action: 'SUSPEND',
        resolved: false,
      })
    }

    if (autoAction === 'BANNED') {
      await deps.createWarningRecord({
        userId,
        userEmail: beforeState.email,
        reason:
          `ถูกระงับครบ ${SUSPENSION_LIMIT_FOR_BAN} ครั้ง ระบบแบนบัญชีอัตโนมัติ`,
        issuedBy: adminId,
        issuedByEmail: adminEmail,
        action: 'BAN',
        resolved: false,
      })
    }

    // 3. Notify User
    await deps.createNotification({
      userId,
      title: 'ได้รับคำเตือน',
      message: `${safeReason} (คำเตือนครั้งที่ ${newWarningCount})`,
      type: 'warning',
      isRead: false,
    })

    if (autoAction === 'SUSPENDED') {
      await deps.createNotification({
        userId,
        title: 'บัญชีถูกระงับชั่วคราวอัตโนมัติ',
        message: `คุณได้รับคำเตือนครบ ${WARNING_LIMIT_FOR_SUSPENSION} ครั้ง ระบบจึงระงับบัญชี ${AUTO_SUSPEND_DAYS} วัน${suspendedUntil ? ` จนถึง ${suspendedUntil.toLocaleString('th-TH')}` : ''}`,
        type: 'warning',
        isRead: false,
      })
    }

    if (autoAction === 'BANNED') {
      await deps.createNotification({
        userId,
        title: 'บัญชีถูกแบนอัตโนมัติ',
        message: `คุณถูกระงับครบ ${SUSPENSION_LIMIT_FOR_BAN} ครั้ง ระบบจึงแบนบัญชีถาวร กรุณาติดต่อทีมสนับสนุนหากต้องการอุทธรณ์`,
        type: 'warning',
        isRead: false,
      })
    }

    // 4. Audit Log
    const afterState = { ...beforeState, ...updates }
    await deps.createAuditLog({
      actionType: 'user_warning',
      adminId,
      adminEmail,
      targetType: 'user',
      targetId: userId,
      targetInfo: beforeState.email,
      description: `ออกคำเตือนครั้งที่ ${newWarningCount}: ${safeReason}`,
      status: 'success',
      reason: safeReason,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: afterState as unknown as Record<string, unknown>,
      metadata: {
        warningCount: newWarningCount,
        autoAction,
        suspensionCount: nextSuspensionCount,
      },
    })

    if (autoAction !== 'NONE') {
      await deps.createAuditLog({
        actionType: autoAction === 'SUSPENDED' ? 'user_suspend' : 'user_ban',
        adminId,
        adminEmail,
        targetType: 'user',
        targetId: userId,
        targetInfo: beforeState.email,
        description:
          autoAction === 'SUSPENDED'
            ? `ระงับอัตโนมัติจากคำเตือนครบ ${WARNING_LIMIT_FOR_SUSPENSION} ครั้ง`
            : `แบนอัตโนมัติจากการถูกระงับครบ ${SUSPENSION_LIMIT_FOR_BAN} ครั้ง`,
        status: 'success',
        reason:
          autoAction === 'SUSPENDED'
            ? `ครบ ${WARNING_LIMIT_FOR_SUSPENSION} คำเตือน`
            : `ครบ ${SUSPENSION_LIMIT_FOR_BAN} การระงับ`,
        beforeState: beforeState as unknown as Record<string, unknown>,
        afterState: afterState as unknown as Record<string, unknown>,
        metadata: {
          autoPolicy: true,
          warningCount: newWarningCount,
          suspensionCount: nextSuspensionCount,
        },
      })
    }

    return {
      success: true,
      warningCount: newWarningCount,
      autoAction,
      suspendedUntil,
      suspensionCount: nextSuspensionCount,
    }
  } catch (error: unknown) {
    console.error('[AdminService] Issue Warning Failed:', error)

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
