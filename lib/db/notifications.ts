import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { AppNotification, NotificationType } from "@/types"
import { authFetchJson } from "@/lib/api-client"

// Create notification - client should use API only
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
  types?: NotificationType[]
  unreadOnly?: boolean
  includeTotalCount?: boolean
}

export interface GetNotificationsResult {
  notifications: AppNotification[]
  lastId: string | null
  hasMore: boolean
  totalCount: number
}

function normalizeNotificationTypes(types?: NotificationType[]): NotificationType[] {
  if (!types || types.length === 0) return []
  return Array.from(new Set(types.filter(Boolean))).slice(0, 10)
}

export const getNotifications = async (
  _userId: string,
  options: GetNotificationsOptions = {}
): Promise<GetNotificationsResult> => {
  const { pageSize = 10, lastId, types, unreadOnly, includeTotalCount = true } = options
  const params = new URLSearchParams()

  params.set("pageSize", String(pageSize))
  if (lastId) params.set("lastId", lastId)

  const notificationTypes = normalizeNotificationTypes(types)
  if (notificationTypes.length > 0) {
    params.set("types", notificationTypes.join(","))
  }

  if (unreadOnly) {
    params.set("unreadOnly", "true")
  }
  if (!includeTotalCount) {
    params.set("includeTotalCount", "false")
  }

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

export interface AdminDeleteUserNotificationsResult {
  userId: string
  notificationId: string | null
  notificationIds?: string[] | null
  deletedCount: number
}

export const deleteUserNotificationsByAdmin = async (
  userId: string,
  options: { reason?: string; notificationId?: string; notificationIds?: string[] } = {}
): Promise<AdminDeleteUserNotificationsResult> => {
  const res = await authFetchJson<AdminDeleteUserNotificationsResult>(
    `/api/admin/users/${userId}/notifications`,
    {
      method: "DELETE",
      body: {
        reason: options.reason,
        notificationId: options.notificationId,
        notificationIds: options.notificationIds,
      },
    }
  )

  if (!res?.data) {
    throw new Error("Failed to delete notifications")
  }

  return {
    userId: res.data.userId,
    notificationId: res.data.notificationId ?? null,
    notificationIds: res.data.notificationIds ?? null,
    deletedCount: Number(res.data.deletedCount) || 0,
  }
}
