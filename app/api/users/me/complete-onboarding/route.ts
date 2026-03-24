/**
 * POST /api/users/me/complete-onboarding
 * Mark user as having seen onboarding
 */

import type { NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { ApiErrors, getAuthToken, successResponse } from "@/lib/api-response"

class UsersMeCompleteOnboardingController {
  async post(request: NextRequest) {
    try {
      const token = getAuthToken(request)
      if (!token) return ApiErrors.unauthorized("Missing authentication token")
      const decoded = await verifyIdToken(token, true)
      if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

      const db = getAdminDb()
      const ref = db.collection("users").doc(decoded.uid)
      await ref.update({
        hasSeenOnboarding: true,
        updatedAt: FieldValue.serverTimestamp(),
      })
      return successResponse({ completed: true })
    } catch (e) {
      console.error("[Users Me API] complete-onboarding Error:", e)
      return ApiErrors.internalError("Internal server error")
    }
  }
}

const controller = new UsersMeCompleteOnboardingController()
export async function POST(request: NextRequest) {
  return controller.post(request)
}
