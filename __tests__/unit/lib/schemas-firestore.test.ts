import { describe, expect, it } from "vitest"
import { Timestamp } from "firebase-admin/firestore"
import { parseItemFromFirestore } from "@/lib/schemas-firestore"

function buildBaseItemData() {
  return {
    title: "Sample title",
    description: "Sample description",
    category: "books",
    status: "available",
    postedBy: "uid_123",
    postedByEmail: "uid_123@rmu.ac.th",
    postedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }
}

describe("parseItemFromFirestore", () => {
  it("parses Firebase Timestamp fields without throwing", () => {
    const data = buildBaseItemData()

    expect(() => parseItemFromFirestore("item_1", data)).not.toThrow()
    const parsed = parseItemFromFirestore("item_1", data)

    expect(parsed).not.toBeNull()
    expect(parsed?.id).toBe("item_1")
    expect(parsed?.title).toBe("Sample title")
  })

  it("returns fallback dates for malformed timestamp-like data instead of throwing", () => {
    const data = {
      ...buildBaseItemData(),
      postedAt: { toDate: () => new Date("invalid-date") },
      updatedAt: { toDate: () => new Date("invalid-date") },
    }

    const result = parseItemFromFirestore("item_2", data)
    expect(result).not.toBeNull()
    expect(result?.postedAt).toBeInstanceOf(Date)
    expect(result?.updatedAt).toBeInstanceOf(Date)
  })
})

