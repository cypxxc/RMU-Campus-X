/**
 * User Self-Delete API
 * Allows users to permanently delete their own account and all associated data.
 * Reuses the robust cascade logic from Admin Hard Delete.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, getAdminAuth, verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"
import { cloudinary } from "@/lib/cloudinary"
import { recalculateUserRating } from "@/lib/services/admin/user-cleanup"

export const runtime = 'nodejs'

export async function DELETE(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const token = extractBearerToken(request.headers.get("Authorization"))
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    
    // Strict Status Check to ensure they are active enough to delete themselves? 
    // Actually, even suspended users should be allowed to delete themselves (GDPR).
    // So we just verify the token signature.
    const decodedToken = await verifyIdToken(token) 
    if (!decodedToken) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const userId = decodedToken.uid
    const db = getAdminDb()
    const auth = getAdminAuth()

    console.log(`[SelfDelete] Starting deletion for user: ${userId}`)

    // 2. Collection Phase - Gather all data to delete
    // (Identical logic to Admin Hard Delete)
    const cloudinaryPublicIds: string[] = []
    const refsToDelete: FirebaseFirestore.DocumentReference[] = []

    // 2.1 User Profile (Avatar)
    const userDoc = await db.collection("users").doc(userId).get()
    if (userDoc.exists) {
      refsToDelete.push(userDoc.ref)
      const data = userDoc.data()
      if (data?.photoURL?.includes("cloudinary")) {
          try {
            const matches = data.photoURL.match(/\/v\d+\/([^/]+)\./)
            if (matches?.[1]) cloudinaryPublicIds.push(matches[1])
          } catch (e) {}
      }
    }

    // 2.2 Items (Images)
    const itemsSnapshot = await db.collection("items").where("postedBy", "==", userId).get()
    itemsSnapshot.docs.forEach(doc => {
        refsToDelete.push(doc.ref)
        const data = doc.data()
        if (Array.isArray(data.imageUrls)) {
            data.imageUrls.forEach((url: string) => {
                if (url.includes("cloudinary")) {
                    const matches = url.match(/\/rmu-exchange\/items\/([^/.]+)/)
                    if (matches?.[1]) cloudinaryPublicIds.push(`rmu-exchange/items/${matches[1]}`)
                }
            })
        }
    })

    // 2.3 Exchanges
    const exchangesRef = db.collection("exchanges")
    const [reqExchanges, ownExchanges] = await Promise.all([
        exchangesRef.where("requesterId", "==", userId).get(),
        exchangesRef.where("ownerId", "==", userId).get()
    ])
    reqExchanges.docs.forEach(d => refsToDelete.push(d.ref))
    ownExchanges.docs.forEach(d => refsToDelete.push(d.ref))

    // 2.4 Chat Messages
    const chatsSnapshot = await db.collection("chatMessages").where("senderId", "==", userId).get()
    chatsSnapshot.docs.forEach(doc => {
        refsToDelete.push(doc.ref)
        const data = doc.data()
        if (data.imageUrl && data.imageUrl.includes("cloudinary")) {
             const matches = data.imageUrl.match(/\/rmu-exchange\/chat\/([^/.]+)/)
             if (matches?.[1]) cloudinaryPublicIds.push(`rmu-exchange/chat/${matches[1]}`)
        }
    })

    // 2.5 Notifications
    const notifSnapshot = await db.collection("notifications").where("userId", "==", userId).get()
    notifSnapshot.docs.forEach(d => refsToDelete.push(d.ref))

    // 2.6 Reports — ลบทั้งที่ user เป็นผู้รายงาน และที่ user ถูกระบุในรายงาน (ให้สอดคล้องการลบออกจากทั้งระบบ)
    const reportsRef = db.collection("reports")
    const [reporterSnap, targetSnap, reportedUserSnap] = await Promise.all([
      reportsRef.where("reporterId", "==", userId).get(),
      reportsRef.where("targetId", "==", userId).get(),
      reportsRef.where("reportedUserId", "==", userId).get(),
    ])
    const reportIds = new Set<string>()
    const addReport = (d: FirebaseFirestore.QueryDocumentSnapshot) => {
      if (!reportIds.has(d.id)) {
        reportIds.add(d.id)
        refsToDelete.push(d.ref)
      }
    }
    reporterSnap.docs.forEach(addReport)
    targetSnap.docs.forEach(addReport)
    reportedUserSnap.docs.forEach(addReport)

    const supportSnap = await db.collection("support_tickets").where("userId", "==", userId).get()
    supportSnap.docs.forEach(d => refsToDelete.push(d.ref))

    const warningsSnap = await db.collection("userWarnings").where("userId", "==", userId).get()
    warningsSnap.docs.forEach(d => refsToDelete.push(d.ref))
    
    // 2.7 Drafts & Favorites
    const draftsSnap = await db.collection("drafts").where("userId", "==", userId).get()
    draftsSnap.docs.forEach(d => refsToDelete.push(d.ref))
    const favSnap = await db.collection("favorites").where("userId", "==", userId).get()
    favSnap.docs.forEach(d => refsToDelete.push(d.ref))

    // 2.8 User sessions
    const sessionsSnap = await db.collection("userSessions").where("userId", "==", userId).get()
    sessionsSnap.docs.forEach(d => refsToDelete.push(d.ref))

    // 2.9 Reviews: ลบทั้งรีวิวที่ user เป็นผู้เขียน และที่ user เป็นผู้ถูกรีวิว
    const ratingRecalcUserIds: string[] = []
    const [reviewsAsReviewer, reviewsAsTarget] = await Promise.all([
      db.collection("reviews").where("reviewerId", "==", userId).get(),
      db.collection("reviews").where("targetUserId", "==", userId).get(),
    ])
    reviewsAsTarget.docs.forEach(d => refsToDelete.push(d.ref))
    reviewsAsReviewer.docs.forEach(d => {
      refsToDelete.push(d.ref)
      const targetId = d.data()?.targetUserId
      if (targetId && targetId !== userId) ratingRecalcUserIds.push(targetId)
    })

    console.log(`[SelfDelete] Found ${refsToDelete.length} docs and ${cloudinaryPublicIds.length} images`)

    // 3. Execution Phase

    // 3.1 Cloudinary Delete
    if (cloudinaryPublicIds.length > 0) {
        try {
             // Chunking
             const chunkedIds = []
             for (let i = 0; i < cloudinaryPublicIds.length; i += 100) {
                 chunkedIds.push(cloudinaryPublicIds.slice(i, i + 100))
             }
             await Promise.all(chunkedIds.map(ids => 
                 cloudinary.api.delete_resources(ids, { type: 'upload', resource_type: 'image' })
             ))
        } catch (error) {
            console.error("[SelfDelete] Cloudinary Error:", error)
        }
    }

    // 3.2 Firestore Delete (Batch)
    const batchSize = 500
    for (let i = 0; i < refsToDelete.length; i += batchSize) {
        const batch = db.batch()
        const chunk = refsToDelete.slice(i, i + batchSize)
        chunk.forEach(ref => batch.delete(ref))
        await batch.commit()
    }

    // 3.3 Recalculate rating for users who had received reviews from this user
    const recalcIds = [...new Set(ratingRecalcUserIds)]
    for (const uid of recalcIds) {
      try {
        await recalculateUserRating(uid)
      } catch (e) {
        console.error(`[SelfDelete] Recalc rating for ${uid} failed:`, e)
      }
    }

    // 3.4 Auth Delete
    try {
        await auth.deleteUser(userId)
    } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
             console.error("[SelfDelete] Auth Delete Error:", error)
        }
    }

    return NextResponse.json({ success: true, message: "Account deleted permanently" })

  } catch (error: any) {
    console.error("[SelfDelete] Fatal Error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
