/**
 * Favorites API – list และ add
 * GET: list รายการโปรดของผู้ใช้
 * POST: add รายการโปรด (body: itemId, itemTitle?, itemImage?)
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { ApiErrors, getAuthToken, successResponse } from "@/lib/api-response"
import { z } from "zod"

const addFavoriteSchema = z.object({
  itemId: z.string().min(1, "กรุณาระบุ itemId"),
  itemTitle: z.string().optional(),
  itemImage: z.string().url().optional().nullable(),
})

/** GET /api/favorites – list รายการโปรด */
export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const db = getAdminDb()
    const snapshot = await db
      .collection("favorites")
      .where("userId", "==", decoded.uid)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get()

    const favorites = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    return successResponse({ favorites })
  } catch (e) {
    console.error("[Favorites API] GET Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}

/** POST /api/favorites – add รายการโปรด */
export async function POST(request: NextRequest) {
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
    const parsed = addFavoriteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { itemId, itemTitle, itemImage } = parsed.data
    const favoriteId = `${decoded.uid}_${itemId}`

    const db = getAdminDb()
    const ref = db.collection("favorites").doc(favoriteId)
    const existing = await ref.get()
    if (existing.exists) {
      return NextResponse.json({ success: true, id: favoriteId, added: false })
    }

    await ref.set({
      id: favoriteId,
      userId: decoded.uid,
      itemId,
      itemTitle: itemTitle ?? null,
      itemImage: itemImage ?? null,
      createdAt: FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ success: true, id: favoriteId, added: true }, { status: 201 })
  } catch (e) {
    console.error("[Favorites API] POST Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}
