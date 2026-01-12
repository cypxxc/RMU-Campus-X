
import { NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const reviewerId = decodedToken.uid

    const body = await req.json()
    const { exchangeId, targetUserId, rating, comment, itemTitle, reviewerName, reviewerAvatar } = body

    if (!exchangeId || !targetUserId || !rating || !itemTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 1. Check for existing review
    const reviewsRef = adminDb.collection("reviews")
    const existingQuery = await reviewsRef
      .where("exchangeId", "==", exchangeId)
      .where("reviewerId", "==", reviewerId)
      .get()

    if (!existingQuery.empty) {
      return NextResponse.json({ error: "You have already reviewed this exchange" }, { status: 400 })
    }

    // 2. Create Review
    await reviewsRef.add({
      exchangeId,
      reviewerId,
      targetUserId,
      rating,
      comment: comment || "",
      itemTitle,
      reviewerName,
      reviewerAvatar: reviewerAvatar || null,
      createdAt: FieldValue.serverTimestamp()
    })

    // 3. Aggregate Rating (Securely on Server)
    const userReviewsQuery = await reviewsRef.where("targetUserId", "==", targetUserId).get()
    const totalReviews = userReviewsQuery.size
    
    let averageRating = 0
    if (totalReviews > 0) {
      const totalScore = userReviewsQuery.docs.reduce((sum, doc) => sum + (doc.data().rating || 0), 0)
      averageRating = Number((totalScore / totalReviews).toFixed(1))
    }

    // 4. Update Target User Profile
    await adminDb.collection("users").doc(targetUserId).update({
      rating: {
        average: averageRating,
        count: totalReviews
      }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("Review API Error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
