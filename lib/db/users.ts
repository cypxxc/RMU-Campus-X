import {
  collection,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { getFirebaseDb } from "@/lib/firebase"
import type { User, UserStatus, UserWarning } from "@/types"
import { createNotification } from "./notifications"
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

// Refactored to use API Routes (Bypassing Rules via Admin SDK)
export const updateUserStatus = async (
  userId: string,
  status: UserStatus,
  _adminId: string, // Kept for interface compatibility
  _adminEmail: string, // Kept for interface compatibility
  reason?: string,
  suspendDays?: number,
  suspendMinutes?: number
) => {
  const auth = getAuth()
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
  
  if (!token) throw new Error("Unauthorized: Login required")

  const response = await fetch(`/api/admin/users/${userId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      status,
      reason,
      suspendDays,
      suspendMinutes
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to update user status")
  }

  const result = await response.json()

  // Trigger LINE Notification (Client-side trigger for now)
  // Note: ideally this should be server-side too, but keeping parity.
  notifyUserStatusChange(userId, status, reason, result.suspendedUntil)
      .catch(err => console.error("Failed to send LINE notification:", err))

  return result
}

// Issue warning - Admin approval required
export const issueWarning = async (
  userId: string,
  _userEmail: string, // Unused in API but kept for signature
  reason: string,
  _adminId: string,
  _adminEmail: string,
  relatedReportId?: string,
  relatedItemId?: string
) => {
  const auth = getAuth()
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
  
  if (!token) throw new Error("Unauthorized: Login required")

  const response = await fetch(`/api/admin/users/${userId}/warning`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      reason,
      relatedReportId,
      relatedItemId
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to issue warning")
  }

  const result = await response.json()

  // Send LINE notification
  notifyUserWarning(userId, reason, result.warningCount)
      .catch(err => console.error("Failed to send LINE warning:", err))
  
  return result
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
// Note: getAdminLineUserIds is implemented server-side in API routes
// using Admin SDK to avoid client-side permission issues.

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
