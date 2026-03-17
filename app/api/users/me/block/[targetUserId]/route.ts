/**
 * DELETE /api/users/me/block/[targetUserId] – ยกเลิกการบล็อก
 */

import type { NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { verifyIdToken } from "@/lib/firebase-admin"
import { usersCollection } from "@/lib/db/collections"
import { ApiErrors, getAuthToken, successResponse } from "@/lib/api-response"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ targetUserId: string }> }
) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const { targetUserId } = await params
    if (!targetUserId) return ApiErrors.badRequest("Missing targetUserId")

    const userRef = usersCollection().doc(decoded.uid)
    const userSnap = await userRef.get()
    if (!userSnap.exists) return ApiErrors.notFound("User not found")

    const existing = (userSnap.data()?.blockedUserIds as string[] | undefined) ?? []
    const updated = existing.filter((id) => id !== targetUserId)

    if (updated.length === existing.length) {
      return successResponse({ unblocked: true, message: "Was not blocked" })
    }

    await userRef.update({
      blockedUserIds: updated,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return successResponse({ unblocked: true })
  } catch (e) {
    console.error("[Users Me Unblock API] Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}
