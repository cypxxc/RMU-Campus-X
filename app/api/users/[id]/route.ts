/**
 * GET /api/users/[id] – โปรไฟล์สาธารณะ (ไม่ต้อง auth)
 * คืนเฉพาะ displayName, photoURL, bio, uid, rating, status
 * เมื่อ id === 'me' จะ forward ไป GET /api/users/me (ต้องมี Authorization)
 */

import { NextRequest, NextResponse } from "next/server"
import { usersCollection } from "@/lib/db/collections"
import { ApiErrors } from "@/lib/api-response"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    if (!userId) return NextResponse.json({ error: "Missing user ID" }, { status: 400 })

    // เมื่อเรียก /api/users/me บางครั้ง Next อาจ match มาที่ [id] ด้วย id=me → forward ไป handler ของ me
    if (userId === "me") {
      const { GET: getMe } = await import("../me/route")
      return getMe(request)
    }

    const snap = await usersCollection().doc(userId).get()
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
