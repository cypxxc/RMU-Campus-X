import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { AppNotification } from "@/types"
import { authFetchJson } from "@/lib/api-client"

// สร้าง notification – บน client ใช้ API เท่านั้น (ไม่ใช้ Firestore)
export const createNotification = async (notificationData: Omit<AppNotification, "id" | "createdAt" | "isRead">) => {
  if (typeof window !== "undefined") {
    const res = await authFetchJson<{ notificationId?: string }>("/api/notifications", {
      method: "POST",
      body: notificationData,
    })
    return res?.data?.notificationId ?? "notified"
  }
  let isSelfNotification = false
  try {
    const { getAuth } = await import("firebase/auth")
    const currentUserId = getAuth().currentUser?.uid
    if (currentUserId && currentUserId === notificationData.userId) isSelfNotification = true
  } catch {
    isSelfNotification = false
  }
  if (isSelfNotification) {
    const db = getFirebaseDb()
    const docRef = await addDoc(collection(db, "notifications"), {
      ...notificationData,
      isRead: false,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  }
  const { getAuth } = await import("firebase/auth")
  const token = await getAuth().currentUser?.getIdToken()
  if (!token) throw new Error("Authentication required for notifications")
  const response = await fetch("/api/notifications", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(notificationData),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to create notification")
  }
  const result = await response.json()
  return result.data?.notificationId ?? "notified"
}

export interface GetNotificationsOptions {
  pageSize?: number
  lastId?: string | null
}

export interface GetNotificationsResult {
  notifications: AppNotification[]
  lastId: string | null
  hasMore: boolean
  totalCount: number
}

export const getNotifications = async (
  _userId: string,
  options: GetNotificationsOptions = {}
): Promise<GetNotificationsResult> => {
  const { pageSize = 10, lastId } = options
  const params = new URLSearchParams()
  params.set("pageSize", String(pageSize))
  if (lastId) params.set("lastId", lastId)

  const j = await authFetchJson<{
    notifications?: AppNotification[]
    lastId?: string | null
    hasMore?: boolean
    totalCount?: number
  }>(`/api/notifications?${params.toString()}`, { method: "GET" })
  const d = j.data

  return {
    notifications: d?.notifications ?? [],
    lastId: d?.lastId ?? null,
    hasMore: d?.hasMore ?? false,
    totalCount: d?.totalCount ?? 0,
  }
}

export const markNotificationAsRead = async (notificationId: string) => {
  await authFetchJson(`/api/notifications/${notificationId}`, { method: "PATCH" })
}

export const markAllNotificationsAsRead = async (_userId: string) => {
  await authFetchJson("/api/notifications/read-all", { method: "POST" })
}

export const deleteNotification = async (notificationId: string) => {
  await authFetchJson(`/api/notifications/${notificationId}`, { method: "DELETE" })
}
