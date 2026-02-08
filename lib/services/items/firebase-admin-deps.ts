import { FieldValue } from "firebase-admin/firestore"
import { itemsCollection, exchangesCollection } from "@/lib/db/collections"
import { cloudinary } from "@/lib/cloudinary"
import type { ItemDeletionDeps } from "@/lib/services/items/types"
import type { ItemUpdateDeps } from "@/lib/services/items/item-update"

export function createFirebaseAdminItemDeps(): ItemDeletionDeps {
  return {
    getItemById: async (id: string) => {
      const snap = await itemsCollection().doc(id).get()
      return snap.exists ? (snap.data() as Record<string, unknown>) : null
    },
    hasActiveExchanges: async (itemId: string) => {
      const snapshot = await exchangesCollection()
        .where("itemId", "==", itemId)
        .where("status", "in", ["pending", "accepted", "in_progress"])
        .limit(1)
        .get()
      return !snapshot.empty
    },
    deleteItem: async (id: string) => {
      await itemsCollection().doc(id).delete()
    },
    deleteCloudinaryResources: async (publicIds: string[]) => {
      await cloudinary.api.delete_resources(publicIds, { type: "upload", resource_type: "image" })
    },
  }
}

export function createItemUpdateAdminDeps(): ItemUpdateDeps {
  return {
    getItemById: async (id: string) => {
      const snap = await itemsCollection().doc(id).get()
      return snap.exists ? (snap.data() as Record<string, unknown>) : null
    },
    updateItem: async (id: string, data: Record<string, unknown>) => {
      const ref = itemsCollection().doc(id)
      await ref.update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      })
    },
  }
}
