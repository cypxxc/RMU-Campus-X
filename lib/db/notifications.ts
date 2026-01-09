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
  getCountFromServer
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { AppNotification } from "@/types"

// Notifications
export const createNotification = async (notificationData: Omit<AppNotification, "id" | "createdAt" | "isRead">) => {
  const db = getFirebaseDb()
  const docRef = await addDoc(collection(db, "notifications"), {
    ...notificationData,
    isRead: false,
    createdAt: serverTimestamp(),
  })
  return docRef.id
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
    where("isRead", "==", false)
  )
  const snapshot = await getDocs(q)
  const promises = snapshot.docs.map((doc) => updateDoc(doc.ref, { isRead: true }))
  await Promise.all(promises)
}

export const deleteNotification = async (notificationId: string) => {
  const db = getFirebaseDb()
  const docRef = doc(db, "notifications", notificationId)
  await deleteDoc(docRef)
}

