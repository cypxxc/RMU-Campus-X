/**
 * Users Me API – โปรไฟล์ผู้ใช้ที่ล็อกอิน
 * GET: ดึงโปรไฟล์
 * PATCH: แก้ไขโปรไฟล์ (displayName, photoURL, bio)
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { ApiErrors, getAuthToken, successResponse } from "@/lib/api-response"
import { userProfileSchema } from "@/lib/schemas"

/** GET /api/users/me – ดึงโปรไฟล์ผู้ใช้ */
export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const db = getAdminDb()
    const snap = await db.collection("users").doc(decoded.uid).get()
    if (!snap.exists) return ApiErrors.notFound("User not found")

    const data = snap.data()
    return successResponse({ user: { id: snap.id, ...data } })
  } catch (e) {
    console.error("[Users Me API] GET Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}

/** PATCH /api/users/me – แก้ไขโปรไฟล์ (displayName, photoURL, bio) */
export async function PATCH(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return ApiErrors.badRequest("Invalid JSON body")
    }
    const parsed = userProfileSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const ref = db.collection("users").doc(decoded.uid)
    const updates: Record<string, unknown> = {
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
    }
    await ref.update(updates)
    return NextResponse.json({ success: true, message: "Profile updated" })
  } catch (e) {
    console.error("[Users Me API] PATCH Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}

