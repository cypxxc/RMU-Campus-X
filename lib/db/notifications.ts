import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  serverTimestamp,
  DocumentSnapshot,
  getCountFromServer,
  writeBatch
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { AppNotification } from "@/types"

// Notifications
// For cross-user notifications (e.g., system sending to another user), uses server API
// For self-notifications, can use direct write (allowed by rules)
export const createNotification = async (notificationData: Omit<AppNotification, "id" | "createdAt" | "isRead">) => {
  // Check if this is a cross-user notification (current user != target user)
  // If we have auth, check if we're the target
  let isSelfNotification = false
  
  try {
    const { getAuth } = await import("firebase/auth")
    const auth = getAuth()
    const currentUserId = auth.currentUser?.uid
    
    if (currentUserId && currentUserId === notificationData.userId) {
      isSelfNotification = true
    }
  } catch {
    // If auth check fails, assume cross-user (use API)
    isSelfNotification = false
  }
  
  if (isSelfNotification) {
    // Self-notification: direct write allowed by rules
    const db = getFirebaseDb()
    const docRef = await addDoc(collection(db, "notifications"), {
      ...notificationData,
      isRead: false,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  } else {
    // Cross-user notification: use API (Admin SDK)
    try {
      const { getAuth } = await import("firebase/auth")
      const auth = getAuth()
      const token = await auth.currentUser?.getIdToken()
      
      if (!token) {
        throw new Error("Authentication required for notifications")
      }
      
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create notification")
      }
      
      const result = await response.json()
      return result.data?.notificationId || 'notified'
    } catch (error) {
      console.error("[createNotification] API call failed:", error)
      throw error
    }
  }
}


interface GetNotificationsOptions {
  pageSize?: number
  lastDoc?: DocumentSnapshot | null
}

interface GetNotificationsResult {
  notifications: AppNotification[]
  lastDoc: DocumentSnapshot | null
  hasMore: boolean
  totalCount: number
}

export const getNotifications = async (
  userId: string, 
  options: GetNotificationsOptions = {}
): Promise<GetNotificationsResult> => {
  const db = getFirebaseDb()
  const { pageSize = 10, lastDoc } = options
  
  // Build query
  let q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(pageSize + 1) // Fetch one extra to check if there's more
  )
  
  // Add pagination cursor if provided
  if (lastDoc) {
    q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(pageSize + 1)
    )
  }
  
  const snapshot = await getDocs(q)
  const docs = snapshot.docs
  
  // Check if there are more results
  const hasMore = docs.length > pageSize
  const notifications = docs
    .slice(0, pageSize)
    .map((doc) => ({ id: doc.id, ...doc.data() }) as AppNotification)
  
  // Get total count
  const countQuery = query(
    collection(db, "notifications"),
    where("userId", "==", userId)
  )
  const countSnapshot = await getCountFromServer(countQuery)
  const totalCount = countSnapshot.data().count
  
  return {
    notifications,
    lastDoc: docs.length > 0 ? docs[Math.min(docs.length - 1, pageSize - 1)] ?? null : null,
    hasMore,
    totalCount
  }
}

export const markNotificationAsRead = async (notificationId: string) => {
  const db = getFirebaseDb()
  const docRef = doc(db, "notifications", notificationId)
  await updateDoc(docRef, { isRead: true })
}

export const markAllNotificationsAsRead = async (userId: string) => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("isRead", "==", false),
    limit(500) // Batch limit
  )
  
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) return

  const batch = writeBatch(db)
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { isRead: true })
  })
  
  await batch.commit()
}

export const deleteNotification = async (notificationId: string) => {
  const db = getFirebaseDb()
  const docRef = doc(db, "notifications", notificationId)
  await deleteDoc(docRef)
}

