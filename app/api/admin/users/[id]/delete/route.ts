
import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, getAdminAuth, verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"
import { cloudinary } from "@/lib/cloudinary"
import { FieldValue } from "firebase-admin/firestore"

export const runtime = 'nodejs'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params
  
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  try {
    // 1. Verify Admin Authentication
    const token = extractBearerToken(request.headers.get("Authorization"))
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Verify token and check for admin custom claim or db role
    const decodedToken = await verifyIdToken(token)
    if (!decodedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const db = getAdminDb()
    const auth = getAdminAuth()

    // Check if requester is actually an admin
    const adminDoc = await db.collection("admins").doc(decodedToken.uid).get()
    if (!adminDoc.exists) {
       return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    console.log(`[HardDelete] Starting deletion for user: ${userId}`)

    // 2. Collection Phase - Gather all data to delete and Cloudinary IDs
    const cloudinaryPublicIds: string[] = []
    const refsToDelete: FirebaseFirestore.DocumentReference[] = []

    // 2.1 User Profile (Avatar)
    const userDoc = await db.collection("users").doc(userId).get()
    if (userDoc.exists) {
      refsToDelete.push(userDoc.ref)
      const data = userDoc.data()
      // Extract avatar ID if it's a cloudinary URL
      if (data?.photoURL?.includes("cloudinary")) {
         // Simple extraction logic or store public_id in db
         // Assuming we can derive it or it's not critical if missed (low risk orphan)
         // Better: If we stored public_id, use it. If not, Regex.
         try {
            const matches = data.photoURL.match(/\/v\d+\/([^/]+)\./)
            if (matches?.[1]) cloudinaryPublicIds.push(matches[1])
         } catch (e) {}
      }
    } else {
        // User might be already deleted from DB but auth remains? Continue.
    }

    // 2.2 Items (Images)
    const itemsSnapshot = await db.collection("items").where("ownerId", "==", userId).get()
    itemsSnapshot.docs.forEach(doc => {
        refsToDelete.push(doc.ref)
        const data = doc.data()
        // Extract images
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

    // 2.4 Chat Messages (Images)
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

    // 2.6 Reports (Reporter OR Target)
    const reportsRef = db.collection("reports")
    const [reproterSnap, targetSnap, reportedUserSnap] = await Promise.all([
        reportsRef.where("reporterId", "==", userId).get(),
        reportsRef.where("targetId", "==", userId).get(),
        reportsRef.where("reportedUserId", "==", userId).get()
    ])
    const reportIds = new Set()
    const addReport = (d: FirebaseFirestore.QueryDocumentSnapshot) => {
        if (!reportIds.has(d.id)) {
            refsToDelete.push(d.ref)
            reportIds.add(d.id)
        }
    }
    reproterSnap.docs.forEach(addReport)
    targetSnap.docs.forEach(addReport)
    reportedUserSnap.docs.forEach(addReport)

    // 2.7 Warnings
    const warningsSnapshot = await db.collection("userWarnings").where("userId", "==", userId).get()
    warningsSnapshot.docs.forEach(d => refsToDelete.push(d.ref))
    
    // 2.8 Drafts & Favorites
    const draftsSnap = await db.collection("drafts").where("userId", "==", userId).get()
    draftsSnap.docs.forEach(d => refsToDelete.push(d.ref))
     
    const favSnap = await db.collection("favorites").where("userId", "==", userId).get()
    favSnap.docs.forEach(d => refsToDelete.push(d.ref))
    
    // 2.9 Support Tickets
    const supportSnap = await db.collection("support_tickets").where("userId", "==", userId).get()
    supportSnap.docs.forEach(d => refsToDelete.push(d.ref))

    
    console.log(`[HardDelete] Found ${refsToDelete.length} docs and ${cloudinaryPublicIds.length} images`)

    // 3. Execution Phase

    // 3.1 Cloudinary Delete
    if (cloudinaryPublicIds.length > 0) {
        try {
            // Delete in chunks of 100 if many
             const chunkedIds = []
             for (let i = 0; i < cloudinaryPublicIds.length; i += 100) {
                 chunkedIds.push(cloudinaryPublicIds.slice(i, i + 100))
             }
             
             await Promise.all(chunkedIds.map(ids => 
                 cloudinary.api.delete_resources(ids, { type: 'upload', resource_type: 'image' })
             ))
             console.log("[HardDelete] Cloudinary Cleanup Done")
        } catch (error) {
            console.error("[HardDelete] Cloudinary Error (Non-blocking):", error)
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
    console.log("[HardDelete] Firestore Cleanup Done")

    // 3.3 Auth Delete
    try {
        await auth.deleteUser(userId)
        console.log("[HardDelete] Auth User Deleted")
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.log("[HardDelete] User already deleted from Auth")
        } else {
            console.error("[HardDelete] Auth Delete Error:", error)
        }
    }
    
    // 3.4 Log Deletion to Admin Logs (System) - Keeping a trace just for audit is usually required even in hard delete, 
    // unless strictly prohibited. We'll store a "UserDataDeleted" log referencing the ID but no PII.
    await db.collection("adminLogs").add({
        actionType: "hard_delete_user",
        adminId: decodedToken.uid, // The admin acting
        targetId: userId,
        description: "Hard delete of user and all associated data",
        performedAt: FieldValue.serverTimestamp()
    })

    return NextResponse.json({ success: true, deletedDocs: refsToDelete.length, deletedImages: cloudinaryPublicIds.length })

  } catch (error: any) {
    console.error("[HardDelete] Fatal Error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
