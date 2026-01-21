import { extractItemImagePublicIds } from "@/lib/services/items/cloudinary-utils"
import { ItemDeletionError } from "@/lib/services/items/errors"
import type { ItemDeletionContext, ItemDeletionDeps } from "@/lib/services/items/types"

const asString = (value: unknown): string => (typeof value === "string" ? value : "")

export async function deleteItemAsOwner(
  context: ItemDeletionContext,
  deps: ItemDeletionDeps
): Promise<void> {
  const { itemId, requesterId } = context

  const item = await deps.getItemById(itemId)
  if (!item) {
    throw new ItemDeletionError("Item not found", "NOT_FOUND", 404)
  }

  const ownerId = asString(item.postedBy)
  if (ownerId !== requesterId) {
    throw new ItemDeletionError("Forbidden: You do not own this item", "FORBIDDEN", 403)
  }

  const status = asString(item.status)
  if (status === "pending") {
    throw new ItemDeletionError("Cannot delete item with active exchange", "CONFLICT", 409)
  }

  const hasActiveExchanges = await deps.hasActiveExchanges(itemId)
  if (hasActiveExchanges) {
    throw new ItemDeletionError("Cannot delete item with active exchange", "CONFLICT", 409)
  }

  const publicIds = extractItemImagePublicIds(item)
  if (publicIds.length > 0) {
    try {
      await deps.deleteCloudinaryResources(publicIds)
    } catch (error) {
      console.error("[ItemDelete] Cloudinary cleanup failed:", error)
    }
  }

  await deps.deleteItem(itemId)
}
