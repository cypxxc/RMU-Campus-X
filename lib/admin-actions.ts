/**
 * Admin Server Actions
 * Server-side actions for admin operations
 */

'use server'

import { revalidatePath } from 'next/cache'
import { doc, updateDoc, deleteDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore'
import { getFirebaseDb } from './firebase'

/**
 * Suspend user
 */
export async function suspendUser(
  userId: string,
  reason: string,
  duration: number, // days
  adminEmail: string
) {
  try {
    const db = getFirebaseDb()
    const userRef = doc(db, 'users', userId)
    
    const suspendUntil = new Date()
    suspendUntil.setDate(suspendUntil.getDate() + duration)
    
    await updateDoc(userRef, {
      status: 'SUSPENDED',
      suspendedUntil: suspendUntil,
      suspendReason: reason,
      suspendedBy: adminEmail,
      suspendedAt: serverTimestamp(),
    })
    
    // Log action
    await logAdminAction(adminEmail, 'suspend_user', userId, {
      reason,
      duration,
    })
    
    revalidatePath('/admin/users')
    return { success: true }
  } catch (error: any) {
    console.error('[Admin] Error suspending user:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Ban user permanently
 */
export async function banUser(
  userId: string,
  reason: string,
  adminEmail: string
) {
  try {
    const db = getFirebaseDb()
    const userRef = doc(db, 'users', userId)
    
    await updateDoc(userRef, {
      status: 'BANNED',
      banReason: reason,
      bannedBy: adminEmail,
      bannedAt: serverTimestamp(),
    })
    
    // Log action
    await logAdminAction(adminEmail, 'ban_user', userId, { reason })
    
    revalidatePath('/admin/users')
    return { success: true }
  } catch (error: any) {
    console.error('[Admin] Error banning user:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Unban/unsuspend user
 */
export async function reinstateUser(userId: string, adminEmail: string) {
  try {
    const db = getFirebaseDb()
    const userRef = doc(db, 'users', userId)
    
    await updateDoc(userRef, {
      status: 'ACTIVE',
      suspendedUntil: null,
      suspendReason: null,
      banReason: null,
      reinstatedBy: adminEmail,
      reinstatedAt: serverTimestamp(),
    })
    
    // Log action
    await logAdminAction(adminEmail, 'reinstate_user', userId, {})
    
    revalidatePath('/admin/users')
    return { success: true }
  } catch (error: any) {
    console.error('[Admin] Error reinstating user:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Approve item
 */
export async function approveItem(itemId: string, adminEmail: string) {
  try {
    const db = getFirebaseDb()
    const itemRef = doc(db, 'items', itemId)
    
    await updateDoc(itemRef, {
      approved: true,
      approvedBy: adminEmail,
      approvedAt: serverTimestamp(),
    })
    
    // Log action
    await logAdminAction(adminEmail, 'approve_item', itemId, {})
    
    revalidatePath('/admin/items')
    return { success: true }
  } catch (error: any) {
    console.error('[Admin] Error approving item:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Reject item
 */
export async function rejectItem(
  itemId: string,
  reason: string,
  adminEmail: string
) {
  try {
    const db = getFirebaseDb()
    const itemRef = doc(db, 'items', itemId)
    
    await updateDoc(itemRef, {
      status: 'rejected',
      rejectedReason: reason,
      rejectedBy: adminEmail,
      rejectedAt: serverTimestamp(),
    })
    
    // Log action
    await logAdminAction(adminEmail, 'reject_item', itemId, { reason })
    
    revalidatePath('/admin/items')
    return { success: true }
  } catch (error: any) {
    console.error('[Admin] Error rejecting item:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete item
 */
export async function deleteItemAdmin(
  itemId: string,
  reason: string,
  adminEmail: string
) {
  try {
    const db = getFirebaseDb()
    const itemRef = doc(db, 'items', itemId)
    
    await deleteDoc(itemRef)
    
    // Log action
    await logAdminAction(adminEmail, 'delete_item', itemId, { reason })
    
    revalidatePath('/admin/items')
    return { success: true }
  } catch (error: any) {
    console.error('[Admin] Error deleting item:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Resolve report
 */
export async function resolveReport(
  reportId: string,
  action: 'ban_user' | 'remove_item' | 'warn_user' | 'dismiss',
  notes: string,
  adminEmail: string,
  _notifyReporter: boolean = true
) {
  try {
    const db = getFirebaseDb()
    const reportRef = doc(db, 'reports', reportId)
    
    await updateDoc(reportRef, {
      status: 'resolved',
      resolution: action,
      resolutionNotes: notes,
      resolvedBy: adminEmail,
      resolvedAt: serverTimestamp(),
    })
    
    // Log action
    await logAdminAction(adminEmail, 'resolve_report', reportId, {
      action,
      notes,
    })
    
    revalidatePath('/admin/reports')
    return { success: true }
  } catch (error: any) {
    console.error('[Admin] Error resolving report:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Log admin action
 */
async function logAdminAction(
  adminEmail: string,
  action: string,
  targetId: string,
  details: any
) {
  try {
    const db = getFirebaseDb()
    await addDoc(collection(db, 'adminLogs'), {
      adminEmail,
      action,
      targetId,
      details,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error('[Admin] Failed to log action:', error)
  }
}
