import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { getFirebaseDb } from "@/lib/firebase"
import type { User, UserStatus, UserWarning } from "@/types"
import { createNotification } from "./notifications"
import { createAdminLog } from "./logs"
import { notifyUserStatusChange, notifyUserWarning } from "@/lib/services/client-line-service"

// ============ User Profile Management ============

export const updateUserProfile = async (userId: string, data: Partial<{ displayName: string, photoURL: string, email: string, bio: string }>) => {
  const db = getFirebaseDb()
  const userRef = doc(db, 'users', userId)
  
  // Clean undefined values to prevent Firestore error
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  )
  
  await setDoc(userRef, {
    ...cleanData,
    uid: userId,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export const getUserProfile = async (userId: string) => {
  const db = getFirebaseDb()
  const userRef = doc(db, 'users', userId)
  const docSnap = await getDoc(userRef)
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as any as User
  }
  return null
}

export const getUserPublicProfile = async (userId: string) => {
  const db = getFirebaseDb()
  const userRef = doc(db, 'users', userId)
  const docSnap = await getDoc(userRef)
  
  if (docSnap.exists()) {
    const data = docSnap.data() as User
    // Return only public fields
    return {
      uid: data.uid,
      displayName: data.displayName,
      bio: data.bio,
      photoURL: data.photoURL,
      createdAt: data.createdAt,
      status: data.status,
      rating: data.rating, 
      // Add other safe fields if needed
    }
  }
  return null
}

// ============ User Status & Warning Management ============

export const updateUserStatus = async (
  userId: string,
  status: UserStatus,
  adminId: string,
  adminEmail: string,
  reason?: string,
  suspendDays?: number,
  suspendMinutes?: number
) => {
  const db = getFirebaseDb()
  const userRef = doc(db, 'users', userId)
  
  // 1. Capture Before State
  const userDoc = await getDoc(userRef)
  if (!userDoc.exists()) {
     // Create minimal if missing (edge case)
     await setDoc(userRef, {
      uid: userId,
      status: 'ACTIVE',
      warningCount: 0,
      createdAt: serverTimestamp(),
    })
  }
  const beforeState = userDoc.exists() ? userDoc.data() : { status: 'NEW (Auto-created)' }

  try {
    const updates: any = {
      status,
      updatedAt: serverTimestamp(),
    }

    if (status === 'SUSPENDED' && (suspendDays !== undefined || suspendMinutes !== undefined)) {
      const suspendUntil = new Date()
      if (suspendDays && suspendDays > 0) suspendUntil.setDate(suspendUntil.getDate() + suspendDays)
      if (suspendMinutes && suspendMinutes > 0) suspendUntil.setMinutes(suspendUntil.getMinutes() + suspendMinutes)
      
      updates.suspendedUntil = Timestamp.fromDate(suspendUntil)
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

    // 2. Perform Action
    await updateDoc(userRef, updates)
    
    // 3. Capture After State (Constructed from updates to avoid extra read, or read again if strict)
    // For strictness, let's use the updates object combined with known state, 
    // but reading again ensures we see exactly what DB has. 
    // Optimization: We know what we sent.
    const afterState = { ...beforeState, ...updates }

    // 4. Log Failure/Success Actions
    
    // Notify the user
    let statusText = status === 'ACTIVE' ? 'ได้รับสิทธิ์ใช้งานปกติ' : status === 'SUSPENDED' ? 'ถูกระงับการใช้งานชั่วคราว' : 'ถูกระงับการใช้งานถาวร'
    let msg = `บัญชีของคุณได้ถูกเปลี่ยนสถานะเป็น: ${statusText}`
    if (reason) msg += ` เนื่องด้วยเหตุผล: ${reason}`

    await createNotification({
      userId: userId,
      title: "อัปเดตสถานะบัญชี",
      message: msg,
      type: status === 'ACTIVE' ? 'system' : 'warning',
      relatedId: userId
    })

    if (status !== 'ACTIVE') {
        const warningAction = status === 'WARNING' ? 'WARNING' : status === 'SUSPENDED' ? 'SUSPEND' : 'BAN'
        await addDoc(collection(db, 'userWarnings'), {
            userId,
            reason: reason || 'Status updated by admin',
            issuedBy: adminId,
            issuedByEmail: adminEmail,
            issuedAt: serverTimestamp(),
            action: warningAction,
            resolved: false,
        })
    }

    // 5. Create Audit Log (Success)
    await createAdminLog({
      actionType: status === 'ACTIVE' ? 'user_activate' : status === 'SUSPENDED' ? 'user_suspend' : 'user_ban',
      adminId,
      adminEmail,
      targetType: 'user',
      targetId: userId,
      targetInfo: (beforeState as any)?.email || userId,
      description: `เปลี่ยนสถานะเป็น ${status}${reason ? `: ${reason}` : ''}`,
      status: 'success',
      reason: reason,
      beforeState: beforeState as Record<string, any>,
      afterState: afterState as Record<string, any>,
      metadata: { status, reason, suspendDays, suspendMinutes }
    })

    // Send LINE notification (Async, non-blocking)
    sendLineStatusNotification(userId, status, reason, updates.suspendedUntil)

  } catch (error: any) {
    // 6. Log Failure
    console.error("Update User Status Failed:", error)
    await createAdminLog({
      actionType: status === 'ACTIVE' ? 'user_activate' : status === 'SUSPENDED' ? 'user_suspend' : 'user_ban',
      adminId,
      adminEmail,
      targetType: 'user',
      targetId: userId,
      targetInfo: userId,
      description: `Failed to update status to ${status}`,
      status: 'failed',
      reason: error.message,
      beforeState: beforeState as Record<string, any>,
      afterState: undefined, // State didn't change
      metadata: { error: error.toString() }
    })
    throw error // Re-throw to UI
  }
}

// Helper for LINE notification removed (refactored to lib/services/client-line-service.ts)

// Issue warning - Admin approval required
export const issueWarning = async (
  userId: string,
  userEmail: string,
  reason: string,
  adminId: string,
  adminEmail: string,
  relatedReportId?: string,
  relatedItemId?: string
) => {
  const db = getFirebaseDb()
  const userRef = doc(db, 'users', userId)
  const userDoc = await getDoc(userRef)
  
  if (!userDoc.exists()) throw new Error('User not found')
  
  const beforeState = userDoc.data()
  
  try {
    const currentWarnings = beforeState.warningCount || 0
    const newWarningCount = currentWarnings + 1

    const updates: any = {
      warningCount: newWarningCount,
      lastWarningDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    // Capture After State
    const afterState = { ...beforeState, ...updates }

    // 1. Update User
    await updateDoc(userRef, updates)

    // 2. Create Warning Record
    const warningData: any = {
      userId,
      userEmail,
      reason,
      issuedBy: adminId,
      issuedByEmail: adminEmail,
      issuedAt: serverTimestamp(),
      action: 'WARNING',
      resolved: false,
    }
    
    if (relatedReportId) warningData.relatedReportId = relatedReportId
    if (relatedItemId) warningData.relatedItemId = relatedItemId
    
    await addDoc(collection(db, 'userWarnings'), warningData)

    // 3. Notify User
    await createNotification({
      userId,
      title: 'ได้รับคำเตือน',
      message: `${reason} (คำเตือนครั้งที่ ${newWarningCount})`,
      type: 'warning',
    })

    // 4. Audit Log (Success)
    await createAdminLog({
      actionType: 'user_warning',
      adminId,
      adminEmail,
      targetType: 'user',
      targetId: userId,
      targetInfo: userEmail,
      description: `ออกคำเตือนครั้งที่ ${newWarningCount}: ${reason}`,
      status: 'success',
      reason: reason,
      beforeState: beforeState as Record<string, any>,
      afterState: afterState as Record<string, any>,
      metadata: { warningCount: newWarningCount, relatedReportId, relatedItemId }
    })

    // Send LINE notification (Async)
    sendLineWarningNotification(userId, reason, newWarningCount)

  } catch (error: any) {
    // 5. Audit Log (Failure)
    console.error("Issue Warning Failed:", error)
    await createAdminLog({
      actionType: 'user_warning',
      adminId,
      adminEmail,
      targetType: 'user',
      targetId: userId,
      targetInfo: userEmail,
      description: `Failed to issue warning`,
      status: 'failed',
      reason: error.message,
      beforeState: beforeState as Record<string, any>,
      afterState: undefined,
      metadata: { error: error.toString() }
    })
    throw error // Re-throw
  }
}

// Helper for LINE warning removed (refactored to lib/services/client-line-service.ts)


export const deleteUserAndData = async (userId: string) => {
  console.log("[deleteUserAndData] Requesting hard delete for:", userId)

  const auth = getAuth()
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
        
  if (!token) throw new Error("Unauthorized: Login required for admin action")

  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://rmu-app-3-1-2569-wwn2.vercel.app'

  try {
     const response = await fetch(`${baseUrl}/api/admin/users/${userId}/delete`, {
         method: 'DELETE',
         headers: {
             'Authorization': `Bearer ${token}`
         }
     })

     if (!response.ok) {
         const errorData = await response.json()
         throw new Error(errorData.error || "Failed to delete user")
     }

     const result = await response.json()
     console.log("[deleteUserAndData] Success:", result)
     return result

  } catch (error) {
    console.error("[deleteUserAndData] Error:", error)
    throw error
  }
}

// Get user warnings
export const getUserWarnings = async (userId: string) => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, 'userWarnings'),
    where('userId', '==', userId),
    orderBy('issuedAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UserWarning)
}

// Get all warnings (admin)
export const getAllWarnings = async () => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, 'userWarnings'),
    orderBy('issuedAt', 'desc'),
    limit(100)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UserWarning)
}

// ============ Auto-Unsuspend System ============

/**
 * Check if a user's suspension has expired and auto-unsuspend them
 */
export const checkAndAutoUnsuspend = async (userId: string, existingUserData?: any): Promise<boolean> => {
  const db = getFirebaseDb()
  const userRef = doc(db, 'users', userId)
  
  try {
    let userData = existingUserData

    if (!userData) {
      const userDoc = await getDoc(userRef)
      if (!userDoc.exists()) return false
      userData = userDoc.data()
    }
    
    // Only process SUSPENDED users
    if (userData.status !== 'SUSPENDED') return false
    
    // Check if suspendedUntil exists and has expired
    const suspendedUntil = userData.suspendedUntil?.toDate?.()
    if (!suspendedUntil) return false
    
    const now = new Date()
    if (now >= suspendedUntil) {
      // Suspension has expired - auto unsuspend
      await updateDoc(userRef, {
        status: 'ACTIVE',
        updatedAt: serverTimestamp(),
      })
      
      // Notify user about auto-unsuspend
      await createNotification({
        userId,
        title: "🔓 บัญชีของคุณถูกปลดล็อคแล้ว",
        message: "ระยะเวลาระงับบัญชีของคุณสิ้นสุดแล้ว คุณสามารถใช้งานได้ตามปกติ",
        type: "system",
        relatedId: userId,
      })
      
      console.log(`[AutoUnsuspend] User ${userId} has been auto-unsuspended`)
      return true
    }
    
    return false
  } catch (error) {
    console.error("[AutoUnsuspend] Error checking suspension:", error)
    return false
  }
}

// ============ LINE Notification Helpers ============

/**
 * Get all admin LINE User IDs for notifications
 */
export const getAdminLineUserIds = async (): Promise<string[]> => {
  const db = getFirebaseDb()
  
  // Get all admin emails from admins collection
  const adminsSnapshot = await getDocs(collection(db, "admins"))
  const adminEmails = adminsSnapshot.docs.map(doc => doc.data().email)
  
  if (adminEmails.length === 0) {
    return []
  }
  
  // Find users with those emails who have LINE linked
  const lineUserIds: string[] = []
  
  for (const email of adminEmails) {
    const usersQuery = query(
      collection(db, "users"),
      where("email", "==", email)
    )
    const usersSnapshot = await getDocs(usersQuery)
    
    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0]!.data() as User
      if (userData.lineUserId && userData.lineNotifications?.enabled) {
        lineUserIds.push(userData.lineUserId)
      }
    }
  }
  
  return lineUserIds
}

export const getUserLineSettings = async (userId: string) => {
  const db = getFirebaseDb()
  const userRef = doc(db, "users", userId)
  const userDoc = await getDoc(userRef)
  
  if (!userDoc.exists()) {
    return null
  }
  
  const userData = userDoc.data() as User
  return {
    lineUserId: userData.lineUserId,
    enabled: userData.lineNotifications?.enabled ?? false,
    settings: userData.lineNotifications
  }
}

export const updateUserLineSettings = async (
  userId: string,
  settings: User['lineNotifications']
) => {
  const db = getFirebaseDb()
  await updateDoc(doc(db, "users", userId), {
    lineNotifications: settings,
    updatedAt: serverTimestamp()
  })
}

export const linkLineAccount = async (
  userId: string,
  lineUserId: string
) => {
  const db = getFirebaseDb()
  await updateDoc(doc(db, "users", userId), {
    lineUserId,
    lineNotifications: {
      enabled: true,
      exchangeRequest: true,
      exchangeStatus: true,
      exchangeComplete: true,
    },
    updatedAt: serverTimestamp()
  })
}

export const unlinkLineAccount = async (userId: string) => {
  const db = getFirebaseDb()
  await updateDoc(doc(db, "users", userId), {
    lineUserId: null,
    lineNotifications: {
      enabled: false,
      exchangeRequest: false,
      exchangeStatus: false,
      exchangeComplete: false,
    },
    updatedAt: serverTimestamp()
  })
}
