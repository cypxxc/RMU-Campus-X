/**
 * POST /api/users/me/accept-terms – ยอมรับข้อกำหนดและนโยบาย
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
    const ref = db.collection("users").doc(decoded.uid)
    await ref.update({
      termsAccepted: true,
      termsAcceptedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ success: true, message: "Terms accepted" })
  } catch (e) {
    console.error("[Users Me accept-terms] POST Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}
