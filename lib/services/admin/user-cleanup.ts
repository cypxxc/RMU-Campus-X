import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin"
import { cloudinary } from "@/lib/cloudinary"

export interface CleanupStats {
  deletedDocs: number
  deletedImages: number
}

/** Return type includes user IDs that need rating recalc after we remove reviews they received from the deleted user */
export interface CollectUserResourcesResult {
  refsToDelete: FirebaseFirestore.DocumentReference[]
  cloudinaryPublicIds: string[]
  userDoc: FirebaseFirestore.DocumentSnapshot
  /** targetUserIds of reviews written BY the deleted user — recalc their rating after delete */
  ratingRecalcUserIds: string[]
}

/**
 * Collect all user resources (document references and image IDs)
 */
export async function collectUserResources(userId: string): Promise<CollectUserResourcesResult> {
  const db = getAdminDb()
  const refsToDelete: FirebaseFirestore.DocumentReference[] = []
  const cloudinaryPublicIds: string[] = []
  const ratingRecalcUserIds: string[] = []

  // Helpers
  const addRef = (ref: FirebaseFirestore.DocumentReference) => refsToDelete.push(ref)
  const addImage = (id: string | null) => { if (id) cloudinaryPublicIds.push(id) }

  // 1. User Profile
  const userDoc = await db.collection("users").doc(userId).get()
  if (userDoc.exists) {
    addRef(userDoc.ref)
    const data = userDoc.data()
    if (data?.photoURL?.includes("cloudinary")) {
        const matches = data.photoURL.match(/\/v\d+\/([^/]+)\./)
        if (matches?.[1]) addImage(matches[1])
    }
  }

  // 2. Items (ใช้ postedBy ตาม schema)
  const itemsSnapshot = await db.collection("items").where("postedBy", "==", userId).get()
  itemsSnapshot.docs.forEach(doc => {
    addRef(doc.ref)
    const data = doc.data()
    if (Array.isArray(data.imageUrls)) {
        data.imageUrls.forEach((url: string) => {
            if (url.includes("cloudinary")) {
                const matches = url.match(/\/rmu-exchange\/items\/([^/.]+)/)
                if (matches?.[1]) addImage(`rmu-exchange/items/${matches[1]}`)
            }
        })
    }
  })

  // 3. Exchanges
  const exchangesRef = db.collection("exchanges")
  const [reqExchanges, ownExchanges] = await Promise.all([
      exchangesRef.where("requesterId", "==", userId).get(),
      exchangesRef.where("ownerId", "==", userId).get()
  ])
  reqExchanges.docs.forEach(d => addRef(d.ref))
  ownExchanges.docs.forEach(d => addRef(d.ref))

  // 4. Chat Messages
  const chatsSnapshot = await db.collection("chatMessages").where("senderId", "==", userId).get()
  chatsSnapshot.docs.forEach(doc => {
      addRef(doc.ref)
      const data = doc.data()
      if (data.imageUrl && data.imageUrl.includes("cloudinary")) {
           const matches = data.imageUrl.match(/\/rmu-exchange\/chat\/([^/.]+)/)
           if (matches?.[1]) addImage(`rmu-exchange/chat/${matches[1]}`)
      }
  })

  // 5. Notifications
  const notifSnapshot = await db.collection("notifications").where("userId", "==", userId).get()
  notifSnapshot.docs.forEach(d => addRef(d.ref))

  // 6. Reports
  const reportsRef = db.collection("reports")
  const [reporterSnap, targetSnap, reportedUserSnap] = await Promise.all([
      reportsRef.where("reporterId", "==", userId).get(),
      reportsRef.where("targetId", "==", userId).get(),
      reportsRef.where("reportedUserId", "==", userId).get()
  ])
  
  const reportIds = new Set()
  const addReport = (d: FirebaseFirestore.QueryDocumentSnapshot) => {
      if (!reportIds.has(d.id)) {
          addRef(d.ref)
          reportIds.add(d.id)
      }
  }
  reporterSnap.docs.forEach(addReport)
  targetSnap.docs.forEach(addReport)
  reportedUserSnap.docs.forEach(addReport)

  // 7. Warnings
  const warningsSnapshot = await db.collection("userWarnings").where("userId", "==", userId).get()
  warningsSnapshot.docs.forEach(d => addRef(d.ref))
  
  // 8. Drafts & Favorites & Support
  const draftsSnap = await db.collection("drafts").where("userId", "==", userId).get()
  draftsSnap.docs.forEach(d => addRef(d.ref))
   
  const favSnap = await db.collection("favorites").where("userId", "==", userId).get()
  favSnap.docs.forEach(d => addRef(d.ref))
  
  const supportSnap = await db.collection("support_tickets").where("userId", "==", userId).get()
  supportSnap.docs.forEach(d => addRef(d.ref))

  // 9. User sessions (ล็อกอิน / อุปกรณ์)
  const sessionsSnap = await db.collection("userSessions").where("userId", "==", userId).get()
  sessionsSnap.docs.forEach(d => addRef(d.ref))

  // 10. Reviews: ลบทั้งรีวิวที่ user เป็นผู้เขียน (reviewerId) และที่ user เป็นผู้ถูกรีวิว (targetUserId)
  const [reviewsAsReviewer, reviewsAsTarget] = await Promise.all([
    db.collection("reviews").where("reviewerId", "==", userId).get(),
    db.collection("reviews").where("targetUserId", "==", userId).get(),
  ])
  reviewsAsTarget.docs.forEach(d => addRef(d.ref))
  reviewsAsReviewer.docs.forEach(d => {
    addRef(d.ref)
    const targetId = d.data()?.targetUserId
    if (targetId && targetId !== userId) ratingRecalcUserIds.push(targetId)
  })

  return { refsToDelete, cloudinaryPublicIds, userDoc, ratingRecalcUserIds }
}

/**
 * Recalculate and update a user's aggregate rating from remaining reviews (server-side).
 * Call after deleting reviews that targeted this user (e.g. when reviewer was deleted).
 */
export async function recalculateUserRating(targetUserId: string): Promise<void> {
  const db = getAdminDb()
  const snapshot = await db
    .collection("reviews")
    .where("targetUserId", "==", targetUserId)
    .get()
  const totalReviews = snapshot.size
  const userRef = db.collection("users").doc(targetUserId)
  if (totalReviews === 0) {
    await userRef.update({ rating: { average: 0, count: 0 } })
    return
  }
  const totalScore = snapshot.docs.reduce((sum, d) => sum + (d.data().rating || 0), 0)
  const average = Number((totalScore / totalReviews).toFixed(1))
  await userRef.update({ rating: { average, count: totalReviews } })
}

/**
 * Execute cleanup (Delete docs and images)
 */
export async function executeCleanup(
    refsToDelete: FirebaseFirestore.DocumentReference[], 
    cloudinaryPublicIds: string[]
): Promise<void> {
  const db = getAdminDb()

  // 1. Cloudinary
  if (cloudinaryPublicIds.length > 0) {
      try {
           const chunkedIds = []
           for (let i = 0; i < cloudinaryPublicIds.length; i += 100) {
               chunkedIds.push(cloudinaryPublicIds.slice(i, i + 100))
           }
           
           await Promise.all(chunkedIds.map(ids => 
               cloudinary.api.delete_resources(ids, { type: 'upload', resource_type: 'image' })
           ))
      } catch (error) {
          console.error("[HardDelete] Cloudinary Cleanup Error:", error)
      }
  }

  // 2. Firestore Batch
  const batchSize = 500
  for (let i = 0; i < refsToDelete.length; i += batchSize) {
      const batch = db.batch()
      const chunk = refsToDelete.slice(i, i + batchSize)
      chunk.forEach(ref => batch.delete(ref))
      await batch.commit()
  }
}

/**
 * Delete User Auth
 */
export async function deleteUserAuth(userId: string) {
  try {
      const auth = getAdminAuth()
      await auth.deleteUser(userId)
  } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
          throw error
      }
  }
}

/**
 * Delete Firestore user documents that no longer have a Firebase Auth user.
 * Use when accounts were removed from Auth (e.g. Firebase Console) but docs remain.
 */
export async function deleteOrphanUserDocs(): Promise<{ deleted: number }> {
  const db = getAdminDb()
  const auth = getAdminAuth()
  const usersSnap = await db.collection("users").get()
  const toDelete: string[] = []

  for (const doc of usersSnap.docs) {
    const uid = doc.id
    try {
      await auth.getUser(uid)
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        toDelete.push(uid)
      } else {
        throw err
      }
    }
  }

  const batchSize = 500
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = db.batch()
    const chunk = toDelete.slice(i, i + batchSize)
    chunk.forEach((uid) => batch.delete(db.collection("users").doc(uid)))
    await batch.commit()
  }

  return { deleted: toDelete.length }
}
