/**
 * GET /api/favorites/check?itemId=xxx – ตรวจว่า item ถูกโปรดหรือไม่
 */

import { NextRequest } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { ApiErrors, getAuthToken, successResponse } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const itemId = request.nextUrl.searchParams.get("itemId")
    if (!itemId) return ApiErrors.badRequest("Missing itemId")

    const favoriteId = `${decoded.uid}_${itemId}`
    const db = getAdminDb()
    const snap = await db.collection("favorites").doc(favoriteId).get()
    return successResponse({ isFavorite: snap.exists })
  } catch (e) {
    console.error("[Favorites Check API] GET Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}
