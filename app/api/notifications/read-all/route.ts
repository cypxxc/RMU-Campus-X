/**
 * POST /api/notifications/read-all – อ่านทั้งหมด (mark all as read)
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { ApiErrors, getAuthToken } from "@/lib/api-response"

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const db = getAdminDb()
    const snapshot = await db
      .collection("notifications")
      .where("userId", "==", decoded.uid)
      .where("isRead", "==", false)
      .limit(500)
      .get()

    if (snapshot.empty) {
      return NextResponse.json({ success: true, message: "Already read", count: 0 })
    }

    const batch = db.batch()
    snapshot.docs.forEach((d) => {
      batch.update(d.ref, { isRead: true, updatedAt: FieldValue.serverTimestamp() })
    })
    await batch.commit()
    return NextResponse.json({ success: true, message: "Marked all as read", count: snapshot.size })
  } catch (e) {
    console.error("[Notifications API] read-all Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}
