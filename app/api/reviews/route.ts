import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 })
    }

    const adminAuth = getAdminAuth()
    const decodedToken = await adminAuth.verifyIdToken(token)
    const reviewerId = decodedToken.uid

    const body = await req.json()
    const { exchangeId, targetUserId, rating, comment, itemTitle, reviewerName, reviewerAvatar } = body

    if (!exchangeId || !targetUserId || !rating || !itemTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const numericRating = Number(rating)
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json({ error: "Rating must be a number between 1 and 5" }, { status: 400 })
    }

    const adminDb = getAdminDb()
    
    // Use a transaction for atomic operations
    await adminDb.runTransaction(async (transaction) => {
      // 1. Check for existing review (Deduplication)
      const reviewId = `${exchangeId}_${reviewerId}`
      const reviewRef = adminDb.collection("reviews").doc(reviewId)
      const reviewDoc = await transaction.get(reviewRef)

      if (reviewDoc.exists) {
        throw new Error("You have already reviewed this exchange")
      }

      // 2. Validate Exchange Existence & Participation (Security)
      const exchangeRef = adminDb.collection("exchanges").doc(exchangeId)
      const exchangeDoc = await transaction.get(exchangeRef)
      
      if (!exchangeDoc.exists) {
        throw new Error("Exchange not found")
      }

      const exchangeData = exchangeDoc.data()
      // Ensure the reviewer was actually part of this exchange
      if (exchangeData?.ownerId !== reviewerId && exchangeData?.requesterId !== reviewerId) {
        throw new Error("You were not a participant in this exchange")
      }

      // 3. Get Target User Data (For Incremental Update)
      const userRef = adminDb.collection("users").doc(targetUserId)
      const userDoc = await transaction.get(userRef)

      if (!userDoc.exists) {
        throw new Error("Target user not found")
      }

      const userData = userDoc.data()
      const currentRating = userData?.rating?.average || 0
      const currentCount = userData?.rating?.count || 0

      // 4. Calculate New Rating (Incremental)
      // New Average = ((Current * Count) + New) / (Count + 1)
      const newCount = currentCount + 1
      const newAverage = Number(
        (((currentRating * currentCount) + numericRating) / newCount).toFixed(1)
      )

      // 5. Perform Writes
      // Create Review
      transaction.set(reviewRef, {
        exchangeId,
        reviewerId,
        targetUserId,
        rating: numericRating,
        comment: comment || "",
        itemTitle,
        reviewerName,
        reviewerAvatar: reviewerAvatar || null,
        createdAt: FieldValue.serverTimestamp()
      })

      // Update User
      transaction.update(userRef, {
        rating: {
          average: newAverage,
          count: newCount
        }
      })
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("Review API Error:", error)
    // Handle specific transaction errors or custom errors
    const errorMessage = error.message === "You have already reviewed this exchange" 
      ? error.message 
      : "Internal Server Error"
      
    // Return 400 for bad requests (like duplicates), 500 for system errors
    const status = error.message === "You have already reviewed this exchange" ? 400 : 500
    
    return NextResponse.json({ error: errorMessage }, { status })
  }
}
