/**
 * Reviews API
 * GET: list รีวิวที่ user ได้รับ
 * POST: สร้างรีวิว (auth + termsAccepted, withValidation)
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { withValidation, type ValidationContext } from "@/lib/api-validation"
import { getAuthToken, successResponse } from "@/lib/api-response"
import { createReviewSchema } from "@/lib/schemas"

/** GET /api/reviews?targetUserId=xxx – list รีวิวที่ user ได้รับ */
export async function GET(req: NextRequest) {
  try {
    const token = getAuthToken(req)
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const targetUserId = searchParams.get("targetUserId")
    if (!targetUserId) {
      return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 })
    }

    const limitCount = Math.min(Number(searchParams.get("limit")) || 20, 50)
    const adminDb = getAdminDb()
    const snapshot = await adminDb
      .collection("reviews")
      .where("targetUserId", "==", targetUserId)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get()

    type RawReview = { id: string; reviewerId?: string; [key: string]: unknown }
    const rawReviews: RawReview[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RawReview))
    const reviewerIds = [...new Set(rawReviews.map((r) => r.reviewerId).filter((id): id is string => Boolean(id)))]
    const existingReviewerIds = new Set<string>()
    if (reviewerIds.length > 0) {
      const refs = reviewerIds.map((uid) => adminDb.collection("users").doc(uid))
      const userSnaps = await adminDb.getAll(...refs)
      userSnaps.forEach((snap, i) => {
        const id = reviewerIds[i]
        if (snap.exists && id) existingReviewerIds.add(id)
      })
    }
    const reviews = rawReviews.filter((r) => existingReviewerIds.has(r.reviewerId ?? ""))
    return successResponse({ reviews })
  } catch (e) {
    console.error("[Reviews API] GET Error:", e)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/** POST /api/reviews – สร้างรีวิว (ต้องยอมรับ terms แล้ว) */
export const POST = withValidation(
  createReviewSchema,
  async (_req, data, ctx: ValidationContext | null) => {
    if (!ctx) {
      return NextResponse.json({ error: "Authentication required", code: "AUTH_ERROR" }, { status: 401 })
    }

    const reviewerId = ctx.userId
    const { exchangeId, targetUserId, rating, itemTitle, comment, reviewerName, reviewerAvatar } = data
    const adminDb = getAdminDb()

    try {
      await adminDb.runTransaction(async (transaction) => {
        const reviewId = `${exchangeId}_${reviewerId}`
        const reviewRef = adminDb.collection("reviews").doc(reviewId)
        const reviewDoc = await transaction.get(reviewRef)

        if (reviewDoc.exists) {
          throw new Error("You have already reviewed this exchange")
        }

        const exchangeRef = adminDb.collection("exchanges").doc(exchangeId)
        const exchangeDoc = await transaction.get(exchangeRef)
        if (!exchangeDoc.exists) {
          throw new Error("Exchange not found")
        }

        const exchangeData = exchangeDoc.data()
        if (exchangeData?.ownerId !== reviewerId && exchangeData?.requesterId !== reviewerId) {
          throw new Error("You were not a participant in this exchange")
        }

        const userRef = adminDb.collection("users").doc(targetUserId)
        const userDoc = await transaction.get(userRef)
        if (!userDoc.exists) {
          throw new Error("Target user not found")
        }

        const userData = userDoc.data()
        const currentRating = userData?.rating?.average || 0
        const currentCount = userData?.rating?.count || 0
        const newCount = currentCount + 1
        const newAverage = Number(
          (((currentRating * currentCount) + rating) / newCount).toFixed(1)
        )

        transaction.set(reviewRef, {
          exchangeId,
          reviewerId,
          targetUserId,
          rating,
          comment: comment ?? "",
          itemTitle,
          reviewerName: reviewerName ?? null,
          reviewerAvatar: reviewerAvatar && reviewerAvatar !== "" ? reviewerAvatar : null,
          createdAt: FieldValue.serverTimestamp(),
        })

        transaction.update(userRef, {
          rating: { average: newAverage, count: newCount },
        })
      })

      return NextResponse.json({
        success: true,
        data: { reviewId: `${exchangeId}_${reviewerId}` },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      if (
        message === "You have already reviewed this exchange" ||
        message.includes("already reviewed")
      ) {
        return NextResponse.json({ error: message, code: "DUPLICATE_REVIEW" }, { status: 400 })
      }
      if (message === "Exchange not found" || message === "Target user not found") {
        return NextResponse.json({ error: message, code: "NOT_FOUND" }, { status: 404 })
      }
      if (message.includes("not a participant")) {
        return NextResponse.json({ error: message, code: "FORBIDDEN" }, { status: 403 })
      }
      console.error("[Reviews API] POST Error:", error)
      return NextResponse.json({ error: "Internal Server Error", code: "INTERNAL_ERROR" }, { status: 500 })
    }
  },
  { requireAuth: true, requireTermsAccepted: true }
)
