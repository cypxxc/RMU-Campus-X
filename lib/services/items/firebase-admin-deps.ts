import { getAdminDb } from "@/lib/firebase-admin"
import { cloudinary } from "@/lib/cloudinary"
import type { ItemDeletionDeps } from "@/lib/services/items/types"

export function createFirebaseAdminItemDeps(): ItemDeletionDeps {
  const db = getAdminDb()

  return {
    getItemById: async (id: string) => {
      const snap = await db.collection("items").doc(id).get()
      return snap.exists ? (snap.data() as Record<string, unknown>) : null
    },
    hasActiveExchanges: async (itemId: string) => {
      const snapshot = await db.collection("exchanges")
        .where("itemId", "==", itemId)
        .where("status", "in", ["pending", "accepted", "in_progress"])
        .limit(1)
        .get()
      return !snapshot.empty
    },
    deleteItem: async (id: string) => {
      await db.collection("items").doc(id).delete()
    },
    deleteCloudinaryResources: async (publicIds: string[]) => {
      await cloudinary.api.delete_resources(publicIds, { type: "upload", resource_type: "image" })
    },
  }
}
