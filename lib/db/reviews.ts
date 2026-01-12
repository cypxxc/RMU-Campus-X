import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  limit,
  Timestamp,
  type FieldValue
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"

export interface Review {
  id: string
  exchangeId: string
  reviewerId: string
  reviewerName: string
  reviewerAvatar?: string
  targetUserId: string
  rating: number // 1-5
  comment?: string
  itemTitle: string
  createdAt: Timestamp | FieldValue
}

export interface UserRating {
  averageRating: number
  totalReviews: number
}

// Create a review
export const createReview = async (
  exchangeId: string,
  reviewerId: string,
  targetUserId: string,
  rating: number,
  comment: string,
  itemTitle: string,
  reviewerName: string,
  reviewerAvatar?: string
) => {
  const db = getFirebaseDb()
  
  // 1. Check if review already exists for this exchange by this user
  // This prevents double reviewing (though UI should prevent it too)
  const q = query(
    collection(db, "reviews"),
    where("exchangeId", "==", exchangeId),
    where("reviewerId", "==", reviewerId)
  )
  const existingSnap = await getDocs(q)
  if (!existingSnap.empty) {
    throw new Error("You have already reviewed this exchange.")
  }

  // 2. Create the review
  const reviewRef = await addDoc(collection(db, "reviews"), {
    exchangeId,
    reviewerId,
    targetUserId,
    rating,
    comment,
    itemTitle,
    reviewerName,
    reviewerAvatar: reviewerAvatar || null,
    createdAt: serverTimestamp()
  })

  // 3. Update User's Aggregated Rating
  await updateUserRating(targetUserId)
  
  return reviewRef.id
}

// Recalculate and update user's average rating
const updateUserRating = async (userId: string) => {
  const db = getFirebaseDb()
  
  // Get all reviews for this user
  const q = query(collection(db, "reviews"), where("targetUserId", "==", userId))
  const snapshot = await getDocs(q)
  
  const totalReviews = snapshot.size
  if (totalReviews === 0) {
     await updateDoc(doc(db, "users", userId), {
       rating: { average: 0, count: 0 }
     })
     return
  }

  const totalScore = snapshot.docs.reduce((sum, doc) => sum + (doc.data().rating || 0), 0)
  const averageRating = Number((totalScore / totalReviews).toFixed(1))

  await updateDoc(doc(db, "users", userId), {
    rating: {
      average: averageRating,
      count: totalReviews
    }
  })
}

// Get reviews for a user
export const getUserReviews = async (userId: string, limitCount = 10) => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "reviews"),
    where("targetUserId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review))
}

// Get pending reviews for a user (Exchanges completed but not reviewed)
// Note: This requires complex query or fetching exchanges and filtering.
// For now, simpler approach: Client fetches completed exchanges and checks if reviewed.
// Helper function to check if an exchange is reviewed by user
export const checkExchangeReviewed = async (exchangeId: string, reviewerId: string): Promise<boolean> => {
   const db = getFirebaseDb()
   const q = query(
    collection(db, "reviews"),
    where("exchangeId", "==", exchangeId),
    where("reviewerId", "==", reviewerId)
  )
  const snapshot = await getDocs(q)
  return !snapshot.empty
}
