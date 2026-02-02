/**
 * Favorites API – DELETE by itemId
 * DELETE /api/favorites/[itemId] – ลบรายการโปรด
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { ApiErrors, getAuthToken } from "@/lib/api-response"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const token = getAuthToken(_request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const { itemId } = await params
    if (!itemId) return NextResponse.json({ error: "Missing itemId" }, { status: 400 })

    const favoriteId = `${decoded.uid}_${itemId}`
    const db = getAdminDb()
    const ref = db.collection("favorites").doc(favoriteId)
    const snap = await ref.get()
    if (!snap.exists) return ApiErrors.notFound("Favorite not found")

    await ref.delete()
    return NextResponse.json({ success: true, message: "Removed from favorites" })
  } catch (e) {
    console.error("[Favorites API] DELETE Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}
