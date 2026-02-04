/**
 * Notifications API Route
 * POST: สร้าง notification (system/cross-user)
 * GET: list notifications ของผู้ใช้ที่ล็อกอิน
 */

import { NextRequest } from "next/server"
import { successResponse, ApiErrors, validateRequiredFields, parseRequestBody, getAuthToken } from "@/lib/api-response"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

interface NotificationBody {
  userId: string
  title: string
  message: string
  type: "exchange" | "support" | "system" | "warning"
  relatedId?: string
}

/** GET /api/notifications – list ของผู้ใช้ที่ล็อกอิน */
export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const { searchParams } = new URL(request.url)
    const pageSize = Math.min(Number(searchParams.get("pageSize")) || 20, 50)
    const lastId = searchParams.get("lastId") ?? undefined

    const db = getAdminDb()
    let q = db
      .collection("notifications")
      .where("userId", "==", decoded.uid)
      .orderBy("createdAt", "desc")
      .limit(pageSize + 1)

    if (lastId) {
      const lastSnap = await db.collection("notifications").doc(lastId).get()
      if (lastSnap.exists) q = q.startAfter(lastSnap)
    }

    const snapshot = await q.get()
    const notifications = snapshot.docs.map((d) => {
      const data = d.data()
      return { id: d.id, ...data }
    })
    const hasMore = notifications.length > pageSize
    const page = notifications.slice(0, pageSize)

    let totalCount: number | undefined
    try {
      const countSnap = await db
        .collection("notifications")
        .where("userId", "==", decoded.uid)
        .count()
        .get()
      totalCount = countSnap.data().count
    } catch (_) {
      totalCount = undefined
    }

    return successResponse({
      notifications: page,
      lastId: page.length ? page[page.length - 1]?.id ?? null : null,
      hasMore,
      ...(totalCount !== undefined && { totalCount }),
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error"
    console.error("[Notifications API] GET Error:", e)
    if (message.includes("index") || message.includes("FAILED_PRECONDITION")) {
      return ApiErrors.internalError(
        "Notifications query requires a Firestore index. Run: firebase deploy --only firestore:indexes"
      )
    }
    return ApiErrors.internalError("Internal server error")
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const token = getAuthToken(request)
    if (!token) {
      return ApiErrors.unauthorized("Missing authentication token")
    }
    
    const decodedToken = await verifyIdToken(token, true)
    if (!decodedToken) {
      return ApiErrors.unauthorized("Invalid or expired session")
    }

    // 2. Parse and Validate Body
    const body = await parseRequestBody<NotificationBody>(request)
    if (!body) {
      return ApiErrors.badRequest("Invalid request body")
    }

    const validation = validateRequiredFields(body, ["userId", "title", "message", "type"])
    if (!validation.valid) {
      return ApiErrors.missingFields(validation.missing)
    }

    const db = getAdminDb()

    // 3. Create Notification
    const notificationRef = await db.collection("notifications").add({
      userId: body.userId,
      title: body.title,
      message: body.message,
      type: body.type,
      relatedId: body.relatedId || null,
      isRead: false,
      createdAt: FieldValue.serverTimestamp()
    })

    return successResponse({ success: true, notificationId: notificationRef.id })

  } catch (error: any) {
    console.error("[Notifications API] Error:", error)
    return ApiErrors.internalError(error.message)
  }
}
