/**
 * Notifications API Route
 * Creates notifications for users using Admin SDK (for system/cross-user notifications)
 */

import { NextRequest } from "next/server"
import { successResponse, ApiErrors, validateRequiredFields, parseRequestBody, getAuthToken } from "@/lib/api-response"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

interface NotificationBody {
  userId: string
  title: string
  message: string
  type: 'exchange' | 'support' | 'system' | 'warning'
  relatedId?: string
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
