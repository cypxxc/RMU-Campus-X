import { describe, it, expect, vi } from "vitest"
import { deleteItemAsOwner } from "@/lib/services/items/item-deletion"
import { ItemDeletionError } from "@/lib/services/items/errors"
import type { ItemDeletionDeps } from "@/lib/services/items/types"

const baseDeps = (): ItemDeletionDeps => ({
  getItemById: async () => null,
  hasActiveExchanges: async () => false,
  deleteItem: async () => undefined,
  deleteCloudinaryResources: async () => undefined,
})

describe("deleteItemAsOwner", () => {
  it("throws when item is missing", async () => {
    const deps = baseDeps()

    await expect(
      deleteItemAsOwner({ itemId: "missing", requesterId: "user-1" }, deps)
    ).rejects.toBeInstanceOf(ItemDeletionError)
  })

  it("deletes item and cleans cloudinary resources", async () => {
    const deleted: string[][] = []
    const deps: ItemDeletionDeps = {
      ...baseDeps(),
      getItemById: async () => ({
        postedBy: "user-1",
        status: "available",
        imageUrls: [
          "https://res.cloudinary.com/demo/image/upload/rmu-exchange/items/abc123.jpg",
        ],
      }),
      deleteCloudinaryResources: async (publicIds) => {
        deleted.push(publicIds)
      },
      deleteItem: vi.fn(async () => undefined),
    }

    await deleteItemAsOwner({ itemId: "item-1", requesterId: "user-1" }, deps)

    expect(deleted).toEqual([["rmu-exchange/items/abc123"]])
    expect(deps.deleteItem).toHaveBeenCalledWith("item-1")
  })
})
