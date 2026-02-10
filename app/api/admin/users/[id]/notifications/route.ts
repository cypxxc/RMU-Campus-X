/**
 * Admin User Notifications API
 * GET /api/admin/users/[id]/notifications
 * DELETE /api/admin/users/[id]/notifications
 *
 * Request body (optional):
 * - notificationId: string (delete one specific notification)
 * - notificationIds: string[] (delete selected notifications)
 * - reason: string (for admin audit log)
 */

import { NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from "@/lib/admin-api"

const BATCH_DELETE_LIMIT = 450

type DeleteNotificationsPayload = {
  notificationId?: string
  notificationIds?: string[]
  reason?: string
}

async function deleteInBatches(
  refs: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>[]
) {
  const db = getAdminDb()
  for (let i = 0; i < refs.length; i += BATCH_DELETE_LIMIT) {
    const batch = db.batch()
    refs.slice(i, i + BATCH_DELETE_LIMIT).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
}

function toIsoString(value: unknown): string | null {
  if (!value) return null
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in (value as { toDate?: () => Date }) &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return null
}

function normalizeNotificationIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((id) => typeof id === "string")
        .map((id) => (id as string).trim())
        .filter(Boolean)
    )
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const { id: userId } = await params
    if (!userId) {
      return errorResponse(AdminErrorCode.VALIDATION_ERROR, "Missing user id", 400)
    }

    const { searchParams } = new URL(request.url)
    const parsedLimit = Number(searchParams.get("limit") || 100)
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(200, Math.floor(parsedLimit)))
      : 100

    const db = getAdminDb()
    const notificationsSnap = await db
      .collection("notifications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()

    const notifications = notificationsSnap.docs.map((doc) => {
      const data = doc.data() ?? {}
      return {
        id: doc.id,
        userId: data.userId ?? userId,
        title: typeof data.title === "string" ? data.title : "",
        message: typeof data.message === "string" ? data.message : "",
        type: typeof data.type === "string" ? data.type : "system",
        isRead: Boolean(data.isRead),
        relatedId: typeof data.relatedId === "string" ? data.relatedId : null,
        createdAt: toIsoString(data.createdAt),
      }
    })

    return successResponse({
      userId,
      notifications,
    })
  } catch (err) {
    console.error("[Admin API] GET user notifications error:", err)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      err instanceof Error ? err.message : "Failed to fetch notifications",
      500
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, user, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const { id: userId } = await params
    if (!userId) {
      return errorResponse(AdminErrorCode.VALIDATION_ERROR, "Missing user id", 400)
    }

    const payload = (await request
      .json()
      .catch(() => ({}))) as DeleteNotificationsPayload

    const notificationId =
      typeof payload.notificationId === "string" ? payload.notificationId.trim() : ""
    const notificationIds = normalizeNotificationIdList(payload.notificationIds)
    const reason = typeof payload.reason === "string" ? payload.reason.trim() : ""

    const db = getAdminDb()
    let deletedCount = 0

    if (notificationIds.length > 0) {
      const refs = notificationIds.map((id) => db.collection("notifications").doc(id))
      const snaps = await Promise.all(refs.map((ref) => ref.get()))
      const refsToDelete: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>[] = []

      for (const snap of snaps) {
        if (!snap.exists) continue
        const notificationData = snap.data()
        if (notificationData?.userId !== userId) {
          return errorResponse(
            AdminErrorCode.VALIDATION_ERROR,
            "At least one selected notification does not belong to this user",
            400
          )
        }
        refsToDelete.push(snap.ref)
      }

      if (refsToDelete.length > 0) {
        await deleteInBatches(refsToDelete)
        deletedCount = refsToDelete.length
      }
    } else if (notificationId) {
      const notificationRef = db.collection("notifications").doc(notificationId)
      const notificationSnap = await notificationRef.get()

      if (notificationSnap.exists) {
        const notificationData = notificationSnap.data()
        if (notificationData?.userId !== userId) {
          return errorResponse(
            AdminErrorCode.VALIDATION_ERROR,
            "Notification does not belong to this user",
            400
          )
        }
        await notificationRef.delete()
        deletedCount = 1
      }
    } else {
      const notificationsSnap = await db
        .collection("notifications")
        .where("userId", "==", userId)
        .get()

      if (!notificationsSnap.empty) {
        await deleteInBatches(notificationsSnap.docs.map((doc) => doc.ref))
        deletedCount = notificationsSnap.size
      }
    }

    try {
      await db.collection("adminLogs").add({
        actionType: "user_notifications_delete",
        adminId: user?.uid,
        adminEmail: user?.email,
        targetType: "user",
        targetId: userId,
        description: notificationIds.length > 0
          ? `Deleted ${deletedCount}/${notificationIds.length} selected notification(s) for user ${userId}`
          : notificationId
          ? `Deleted notification ${notificationId} for user ${userId}`
          : `Deleted ${deletedCount} notification(s) for user ${userId}`,
        status: "success",
        reason: reason || null,
        metadata: {
          notificationId: notificationId || null,
          notificationIds: notificationIds.length > 0 ? notificationIds : null,
          deletedCount,
        },
        createdAt: FieldValue.serverTimestamp(),
      })
    } catch (logError) {
      console.error("[Admin API] Failed to write admin log:", logError)
    }

    return successResponse({
      userId,
      notificationId: notificationId || null,
      notificationIds: notificationIds.length > 0 ? notificationIds : null,
      deletedCount,
    })
  } catch (err) {
    console.error("[Admin API] DELETE user notifications error:", err)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      err instanceof Error ? err.message : "Failed to delete notifications",
      500
    )
  }
}
