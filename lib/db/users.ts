import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
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
  
  // Check if user document exists, create if not
  const userDoc = await getDoc(userRef)
  if (!userDoc.exists()) {
    // Create minimal user document
    await setDoc(userRef, {
      uid: userId,
      status: 'ACTIVE',
      warningCount: 0,
      createdAt: serverTimestamp(),
    })
  }
  
  const updates: any = {
    status,
    updatedAt: serverTimestamp(),
  }

  if (status === 'SUSPENDED' && (suspendDays !== undefined || suspendMinutes !== undefined)) {
    const suspendUntil = new Date()
    // Add days
    if (suspendDays && suspendDays > 0) {
      suspendUntil.setDate(suspendUntil.getDate() + suspendDays)
    }
    // Add minutes
    if (suspendMinutes && suspendMinutes > 0) {
      suspendUntil.setMinutes(suspendUntil.getMinutes() + suspendMinutes)
    }
    updates.suspendedUntil = Timestamp.fromDate(suspendUntil)
    updates.restrictions = {
      canPost: false,
      canExchange: false,
      canChat: false,
    }
  }

  if (status === 'BANNED') {
    updates.bannedReason = reason
    updates.restrictions = {
      canPost: false,
      canExchange: false,
      canChat: false,
    }
  }

  if (status === 'ACTIVE') {
    updates.warningCount = 0
    updates.restrictions = {
      canPost: true,
      canExchange: true,
      canChat: true,
    }
    updates.suspendedUntil = null
    updates.bannedReason = null
  }

  await updateDoc(userRef, updates)
  
  // Notify the user of account status change
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

  // Create warning record
  await addDoc(collection(db, 'userWarnings'), {
    userId,
    reason: reason || 'Status updated by admin',
    issuedBy: adminId,
    issuedByEmail: adminEmail,
    issuedAt: serverTimestamp(),
    action: status === 'WARNING' ? 'WARNING' : status === 'SUSPENDED' ? 'SUSPEND' : 'BAN',
    resolved: false,
  })

  // Log admin action
  await createAdminLog({
    actionType: status === 'ACTIVE' ? 'user_activate' : status === 'SUSPENDED' ? 'user_suspend' : 'user_ban',
    adminId,
    adminEmail,
    targetType: 'user',
    targetId: userId,
    targetInfo: (await getDoc(userRef)).data()?.email || userId,
    description: `เปลี่ยนสถานะเป็น ${status}${reason ? `: ${reason}` : ''}`,
    metadata: { status, reason, suspendDays, suspendMinutes }
  })

  // Send LINE notification for account status change (async)
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://rmu-app-3-1-2569-wwn2.vercel.app'
  
  try {
    const auth = getAuth()
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
    
    if (token) {
      fetch(`${baseUrl}/api/line/notify-user-action`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          action: 'status_change',
          status,
          reason,
          suspendedUntil: updates.suspendedUntil?.toDate?.()?.toISOString()
        })
      }).catch(err => console.log('[LINE] Notify status change error:', err))
    }
  } catch (lineError) {
    console.log('[LINE] Notify status change error:', lineError)
  }
}

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
  
  const userData = userDoc.data()
  const currentWarnings = userData.warningCount || 0
  const newWarningCount = currentWarnings + 1

  const updates: any = {
    warningCount: newWarningCount,
    lastWarningDate: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  // Only update warning count - Admin must manually change status
  await updateDoc(userRef, updates)

  // Create warning record
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
  
  // Only add optional fields if they are defined
  if (relatedReportId) warningData.relatedReportId = relatedReportId
  if (relatedItemId) warningData.relatedItemId = relatedItemId
  
  await addDoc(collection(db, 'userWarnings'), warningData)

  // Send notification
  await createNotification({
    userId,
    title: 'ได้รับคำเตือน',
    message: `${reason} (คำเตือนครั้งที่ ${newWarningCount})`,
    type: 'warning',
  })

  // Log admin action
  await createAdminLog({
    actionType: 'user_warning',
    adminId,
    adminEmail,
    targetType: 'user',
    targetId: userId,
    targetInfo: userEmail,
    description: `ออกคำเตือนครั้งที่ ${newWarningCount}: ${reason}`,
    metadata: { warningCount: newWarningCount, relatedReportId, relatedItemId }
  })

  // Send LINE notification for warning (async)
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://rmu-app-3-1-2569-wwn2.vercel.app'
  
  try {
    const auth = getAuth()
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null

    if (token) {
      fetch(`${baseUrl}/api/line/notify-user-action`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          action: 'warning',
          reason,
          warningCount: newWarningCount
        })
      }).catch(err => console.log('[LINE] Notify warning error:', err))
    }
  } catch (lineError) {
    console.log('[LINE] Notify warning error:', lineError)
  }
}

export const deleteUserAndData = async (userId: string) => {
  const db = getFirebaseDb()
  console.log("[deleteUserAndData] Starting full delete for:", userId)

  try {
    // Collect all references to delete
    const refsToDelete: any[] = []

    // 1. User Document
    refsToDelete.push(doc(db, "users", userId))

    // 2. Items
    const itemsQ = query(collection(db, "items"), where("ownerId", "==", userId))
    const itemsSnap = await getDocs(itemsQ)
    itemsSnap.docs.forEach(d => refsToDelete.push(d.ref))

    // 3. Exchanges (as requester or owner)
    const exchangesQ1 = query(collection(db, "exchanges"), where("requesterId", "==", userId))
    const exchangesQ2 = query(collection(db, "exchanges"), where("ownerId", "==", userId))
    const [exchangesSnap1, exchangesSnap2] = await Promise.all([getDocs(exchangesQ1), getDocs(exchangesQ2)])
    
    // Add unique exchange refs
    const exchangeIds = new Set()
    exchangesSnap1.docs.forEach(d => {
      if (!exchangeIds.has(d.id)) {
        refsToDelete.push(d.ref)
        exchangeIds.add(d.id)
      }
    })
    exchangesSnap2.docs.forEach(d => {
      if (!exchangeIds.has(d.id)) {
        refsToDelete.push(d.ref)
        exchangeIds.add(d.id)
      }
    })

    // 4. Reports (Reporter or Target or ReportedUser)
    const reportsQ1 = query(collection(db, "reports"), where("reporterId", "==", userId))
    const reportsQ2 = query(collection(db, "reports"), where("reportedUserId", "==", userId))
    const reportsQ3 = query(collection(db, "reports"), where("targetId", "==", userId))
    
    const [reportsSnap1, reportsSnap2, reportsSnap3] = await Promise.all([
      getDocs(reportsQ1), 
      getDocs(reportsQ2),
      getDocs(reportsQ3)
    ])
    
    const reportIds = new Set()
    const addUniqueReport = (d: any) => {
        if (!reportIds.has(d.id)) {
            refsToDelete.push(d.ref)
            reportIds.add(d.id)
        }
    }
    reportsSnap1.docs.forEach(addUniqueReport)
    reportsSnap2.docs.forEach(addUniqueReport)
    reportsSnap3.docs.forEach(addUniqueReport)

    // 5. Warnings
    const warningsQ = query(collection(db, "userWarnings"), where("userId", "==", userId))
    const warningsSnap = await getDocs(warningsQ)
    warningsSnap.docs.forEach(d => refsToDelete.push(d.ref))

    console.log(`[deleteUserAndData] Found ${refsToDelete.length} documents to delete`)

    // Batch delete in chunks of 500
    const { writeBatch } = await import("firebase/firestore")
    const CHUNK_SIZE = 500
    
    for (let i = 0; i < refsToDelete.length; i += CHUNK_SIZE) {
      const chunk = refsToDelete.slice(i, i + CHUNK_SIZE)
      const batch = writeBatch(db)
      chunk.forEach(ref => batch.delete(ref))
      await batch.commit()
      console.log(`[deleteUserAndData] Batch ${Math.floor(i / CHUNK_SIZE) + 1} committed`)
    }

    console.log("[deleteUserAndData] Cleanup complete")
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
