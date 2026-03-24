/**
 * POST /api/users/me/block – บล็อกผู้ใช้
 * body: { targetUserId: string }
 */

import type { NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { verifyIdToken } from "@/lib/firebase-admin"
import { usersCollection } from "@/lib/db/collections"
import { ApiErrors, getAuthToken, successResponse } from "@/lib/api-response"

class UsersMeBlockController {
  async post(request: NextRequest) {
    try {
      const token = getAuthToken(request)
      if (!token) return ApiErrors.unauthorized("Missing authentication token")
      const decoded = await verifyIdToken(token, true)
      if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

      let body: { targetUserId?: string }
      try {
        body = await request.json()
      } catch {
        return ApiErrors.badRequest("Invalid JSON body")
      }

      const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId.trim() : ""
      if (!targetUserId) return ApiErrors.badRequest("Missing targetUserId")
      if (targetUserId === decoded.uid) return ApiErrors.badRequest("Cannot block yourself")

      const userRef = usersCollection().doc(decoded.uid)
      const userSnap = await userRef.get()
      if (!userSnap.exists) return ApiErrors.notFound("User not found")

      const existing = (userSnap.data()?.blockedUserIds as string[] | undefined) ?? []
      if (existing.includes(targetUserId)) {
        return successResponse({ blocked: true, message: "Already blocked" })
      }

      const updated = Array.from(new Set([...existing, targetUserId])).slice(0, 500) // max 500
      await userRef.update({
        blockedUserIds: updated,
        updatedAt: FieldValue.serverTimestamp(),
      })

      return successResponse({ blocked: true })
    } catch (e) {
      console.error("[Users Me Block API] Error:", e)
      return ApiErrors.internalError("Internal server error")
    }
  }
}

const controller = new UsersMeBlockController()

export async function POST(request: NextRequest) {
  return controller.post(request)
}
