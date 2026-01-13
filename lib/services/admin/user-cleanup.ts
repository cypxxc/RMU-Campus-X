import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin"
import { cloudinary } from "@/lib/cloudinary"

export interface CleanupStats {
  deletedDocs: number
  deletedImages: number
}

/**
 * Collect all user resources (document references and image IDs)
 */
export async function collectUserResources(userId: string) {
  const db = getAdminDb()
  const refsToDelete: FirebaseFirestore.DocumentReference[] = []
  const cloudinaryPublicIds: string[] = []

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

  // 2. Items
  const itemsSnapshot = await db.collection("items").where("ownerId", "==", userId).get()
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

  return { refsToDelete, cloudinaryPublicIds, userDoc }
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
