/**
 * Notification API – PATCH mark as read
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { ApiErrors, getAuthToken } from "@/lib/api-response"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const { id: notificationId } = await params
    if (!notificationId) return NextResponse.json({ error: "Missing notification ID" }, { status: 400 })

    const db = getAdminDb()
    const ref = db.collection("notifications").doc(notificationId)
    const snap = await ref.get()
    if (!snap.exists) return ApiErrors.notFound("Notification not found")

    const data = snap.data()
    if (data?.userId !== decoded.uid) return ApiErrors.forbidden("Not your notification")

    await ref.update({ isRead: true, updatedAt: FieldValue.serverTimestamp() })
    return NextResponse.json({ success: true, message: "Marked as read" })
  } catch (e) {
    console.error("[Notifications API] PATCH Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}

/** DELETE /api/notifications/[id] – ลบการแจ้งเตือน */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getAuthToken(_request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const { id: notificationId } = await params
    if (!notificationId) return NextResponse.json({ error: "Missing notification ID" }, { status: 400 })

    const db = getAdminDb()
    const ref = db.collection("notifications").doc(notificationId)
    const snap = await ref.get()
    if (!snap.exists) return ApiErrors.notFound("Notification not found")

    const data = snap.data()
    if (data?.userId !== decoded.uid) return ApiErrors.forbidden("Not your notification")

    await ref.delete()
    return NextResponse.json({ success: true, message: "Deleted" })
  } catch (e) {
    console.error("[Notifications API] DELETE Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}
