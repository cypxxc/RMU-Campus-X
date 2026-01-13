import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export interface AdminActionParams {
  adminId: string
  adminEmail: string
  userId: string
  reason?: string
}

export interface UpdateStatusParams extends AdminActionParams {
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'
  suspendDays?: number
  suspendMinutes?: number
}

/**
 * Server-Side: Update User Status (Suspend/Ban/Activate)
 * Bypasses Firestore Rules using Admin SDK
 */
export async function updateUserStatus(params: UpdateStatusParams) {
  const db = getAdminDb()
  const { adminId, adminEmail, userId, status, reason, suspendDays, suspendMinutes } = params
  
  const userRef = db.collection('users').doc(userId)
  const userDoc = await userRef.get()
  
  // 1. Capture exact state before change
  const beforeState = userDoc.exists ? userDoc.data() : { status: 'NEW (Auto-created)' }
  
  try {
    const updates: any = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Handle Suspension
    if (status === 'SUSPENDED') {
      const suspendUntil = new Date()
      if (suspendDays && suspendDays > 0) suspendUntil.setDate(suspendUntil.getDate() + suspendDays)
      if (suspendMinutes && suspendMinutes > 0) suspendUntil.setMinutes(suspendUntil.getMinutes() + suspendMinutes)
      
      updates.suspendedUntil = suspendUntil
      updates.restrictions = { canPost: false, canExchange: false, canChat: false }
    }

    // Handle Ban
    if (status === 'BANNED') {
      updates.bannedReason = reason
      updates.restrictions = { canPost: false, canExchange: false, canChat: false }
    }

    // Handle Activation
    if (status === 'ACTIVE') {
      updates.warningCount = 0
      updates.restrictions = { canPost: true, canExchange: true, canChat: true }
      updates.suspendedUntil = null
      updates.bannedReason = null
    }

    // 2. Perform Update
    if (!userDoc.exists) {
        // Edge case: Create if missing (rare but possible)
        await userRef.set({
            uid: userId,
            createdAt: FieldValue.serverTimestamp(),
            ...updates
        })
    } else {
        await userRef.update(updates)
    }

    // 3. Create Audit Log (Server Side)
    const afterState = { ...beforeState, ...updates }
    
    await db.collection('adminLogs').add({
      actionType: status === 'ACTIVE' ? 'user_activate' : status === 'SUSPENDED' ? 'user_suspend' : 'user_ban',
      adminId,
      adminEmail,
      targetType: 'user',
      targetId: userId,
      targetInfo: (beforeState as any)?.email || userId,
      description: `เปลี่ยนสถานะเป็น ${status}${reason ? `: ${reason}` : ''}`,
      status: 'success',
      reason: reason,
      beforeState: beforeState || {},
      afterState: afterState,
      metadata: { status, reason, suspendDays },
      createdAt: FieldValue.serverTimestamp()
    })

    // 4. Create Notification (System Notification)
    let statusText = status === 'ACTIVE' ? 'ได้รับสิทธิ์ใช้งานปกติ' : status === 'SUSPENDED' ? 'ถูกระงับการใช้งานชั่วคราว' : 'ถูกระงับการใช้งานถาวร'
    let msg = `บัญชีของคุณได้ถูกเปลี่ยนสถานะเป็น: ${statusText}`
    if (reason) msg += ` เนื่องด้วยเหตุผล: ${reason}`

    await db.collection('notifications').add({
      userId: userId,
      title: "อัปเดตสถานะบัญชี",
      message: msg,
      type: status === 'ACTIVE' ? 'system' : 'warning',
      relatedId: userId,
      createdAt: FieldValue.serverTimestamp(),
      isRead: false
    })

    // 5. Create Warning Record if negative action
    if (status !== 'ACTIVE') {
        const warningAction = status === 'SUSPENDED' ? 'SUSPEND' : 'BAN'
        await db.collection('userWarnings').add({
            userId,
            reason: reason || 'Status updated by admin',
            issuedBy: adminId,
            issuedByEmail: adminEmail,
            issuedAt: FieldValue.serverTimestamp(),
            action: warningAction,
            resolved: false,
        })
    }

    return { success: true, status, userId, suspendedUntil: updates.suspendedUntil }

  } catch (error: any) {
    console.error("[AdminService] Update Status Failed:", error)
    
    // Log Failure
    await db.collection('adminLogs').add({
      actionType: status === 'ACTIVE' ? 'user_activate' : status === 'SUSPENDED' ? 'user_suspend' : 'user_ban',
      adminId,
      adminEmail,
      targetType: 'user',
      targetId: userId,
      status: 'failed',
      reason: error.message,
      metadata: { error: error.toString() },
      createdAt: FieldValue.serverTimestamp()
    })
    
    throw error
  }
}

/**
 * Server-Side: Issue Warning
 */
export async function issueWarning(params: AdminActionParams) {
  const db = getAdminDb()
  const { adminId, adminEmail, userId, reason } = params
  
  const userRef = db.collection('users').doc(userId)
  const userDoc = await userRef.get()
  
  if (!userDoc.exists) throw new Error('User not found')
  
  const beforeState = userDoc.data()
  
  try {
    const currentWarnings = beforeState?.warningCount || 0
    const newWarningCount = currentWarnings + 1

    const updates = {
      warningCount: newWarningCount,
      lastWarningDate: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    // 1. Update User
    await userRef.update(updates)

    // 2. Create Warning Record
    await db.collection('userWarnings').add({
      userId,
      userEmail: beforeState?.email,
      reason,
      issuedBy: adminId,
      issuedByEmail: adminEmail,
      issuedAt: FieldValue.serverTimestamp(),
      action: 'WARNING',
      resolved: false,
    })

    // 3. Notify User
    await db.collection('notifications').add({
      userId,
      title: 'ได้รับคำเตือน',
      message: `${reason} (คำเตือนครั้งที่ ${newWarningCount})`,
      type: 'warning',
      createdAt: FieldValue.serverTimestamp(),
      isRead: false
    })

    // 4. Audit Log
    await db.collection('adminLogs').add({
      actionType: 'user_warning',
      adminId,
      adminEmail,
      targetType: 'user',
      targetId: userId,
      targetInfo: beforeState?.email,
      description: `ออกคำเตือนครั้งที่ ${newWarningCount}: ${reason}`,
      status: 'success',
      reason: reason,
      beforeState: beforeState || {},
      afterState: { ...beforeState, ...updates },
      metadata: { warningCount: newWarningCount },
      createdAt: FieldValue.serverTimestamp()
    })

    return { success: true, warningCount: newWarningCount }

  } catch (error: any) {
    console.error("[AdminService] Issue Warning Failed:", error)
    await db.collection('adminLogs').add({
      actionType: 'user_warning',
      adminId,
      adminEmail,
      targetType: 'user',
      targetId: userId,
      status: 'failed',
      reason: error.message,
      createdAt: FieldValue.serverTimestamp()
    })
    throw error
  }
}
