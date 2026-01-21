// ============================================================
// Item Update Service (SOLID: Dependency Inversion)
// Business logic for updating items with injectable dependencies
// ============================================================

import { generateKeywords } from "@/lib/db/items-helpers"

// ============ Types ============

export interface ItemData {
  id?: string
  title?: string
  description?: string
  status?: string
  postedBy?: string
  imageUrls?: string[]
  searchKeywords?: string[]
  [key: string]: unknown
}

export interface ItemUpdateInput {
  itemId: string
  requesterId: string
  data: Partial<ItemData>
}

export interface ItemUpdateDeps {
  getItemById: (id: string) => Promise<ItemData | null>
  updateItem: (id: string, data: Partial<ItemData>) => Promise<void>
}

export class ItemUpdateError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message)
    this.name = "ItemUpdateError"
  }
}

// ============ Business Logic ============

/**
 * Update item with business rules validation
 * SRP: This function only handles update validation and execution
 * DIP: Dependencies are injected, not hardcoded
 */
export async function updateItemWithValidation(
  input: ItemUpdateInput,
  deps: ItemUpdateDeps
): Promise<void> {
  const { itemId, requesterId, data } = input

  // 1. Get existing item
  const item = await deps.getItemById(itemId)
  if (!item) {
    throw new ItemUpdateError("Item not found", "NOT_FOUND", 404)
  }

  // 2. Verify ownership
  if (item.postedBy !== requesterId) {
    throw new ItemUpdateError("Forbidden: You do not own this item", "FORBIDDEN", 403)
  }

  // 3. Business Rule: Cannot edit item with pending status
  if ((data.title || data.description) && item.status === "pending") {
    throw new ItemUpdateError(
      "Cannot edit item details while an exchange is pending",
      "CONFLICT",
      409
    )
  }

  // 4. Prepare updates
  const updates: Partial<ItemData> = { ...data }

  // 5. Regenerate search keywords if title or description changed
  if (data.title || data.description) {
    const newTitle = data.title || item.title || ""
    const newDesc = data.description || item.description || ""
    updates.searchKeywords = generateKeywords(newTitle, newDesc)
  }

  // 6. Perform update
  await deps.updateItem(itemId, updates)
}
