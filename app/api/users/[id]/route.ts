/**
 * GET /api/users/[id] – โปรไฟล์สาธารณะ (ไม่ต้อง auth)
 * คืนเฉพาะ displayName, photoURL, bio, uid, rating, status
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { ApiErrors } from "@/lib/api-response"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    if (!userId) return NextResponse.json({ error: "Missing user ID" }, { status: 400 })

    const db = getAdminDb()
    const snap = await db.collection("users").doc(userId).get()
    if (!snap.exists) return ApiErrors.notFound("User not found")

    const data = snap.data()
    const publicProfile = {
      uid: userId,
      displayName: data?.displayName ?? null,
      photoURL: data?.photoURL ?? null,
      bio: data?.bio ?? null,
      rating: data?.rating ?? null,
      status: data?.status ?? "ACTIVE",
    }
    return NextResponse.json({ success: true, user: publicProfile })
  } catch (e) {
    console.error("[Users API] GET [id] Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}
