import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { cloudinary } from "@/lib/cloudinary"
import type { ItemDeletionDeps } from "@/lib/services/items/types"
import type { ItemUpdateDeps } from "@/lib/services/items/item-update"

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

export function createItemUpdateAdminDeps(): ItemUpdateDeps {
  const db = getAdminDb()
  return {
    getItemById: async (id: string) => {
      const snap = await db.collection("items").doc(id).get()
      return snap.exists ? (snap.data() as Record<string, unknown>) : null
    },
    updateItem: async (id: string, data: Record<string, unknown>) => {
      const ref = db.collection("items").doc(id)
      await ref.update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      })
    },
  }
}
