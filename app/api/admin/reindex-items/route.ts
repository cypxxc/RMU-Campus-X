/**
 * POST /api/admin/reindex-items
 * Reindex items for search and update metadata
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { enforceAdminMutationRateLimit, verifyAdminAccess } from "@/lib/admin-api"

export const dynamic = "force-dynamic"

interface ReindexRequest {
  operation: "all" | "by-category" | "by-user" | "missing-search"
  categoryId?: string
  userId?: string
  batchSize?: number
}

interface ReindexResult {
  operation: string
  processed: number
  updated: number
  errors: number
  duration: number
  details?: {
    categories?: Record<string, number>
    users?: Record<string, number>
  }
}

async function processItemsInChunks(
  items: FirebaseFirestore.QueryDocumentSnapshot[],
  batchSize: number,
  onItem: (itemDoc: FirebaseFirestore.QueryDocumentSnapshot) => Promise<void>,
  onError: (itemDoc: FirebaseFirestore.QueryDocumentSnapshot, error: unknown) => void
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize)
    const results = await Promise.allSettled(chunk.map((itemDoc) => onItem(itemDoc)))

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        onError(chunk[index]!, result.reason)
      }
    })
  }
}

export async function POST(request: NextRequest) {
  const { authorized, user, error } = await verifyAdminAccess(request)
  if (!authorized) return error!
  if (!user?.uid) {
    return NextResponse.json({ success: false, error: "Admin identity missing" }, { status: 403 })
  }

  const rateLimited = await enforceAdminMutationRateLimit(request, user.uid, "reindex-items", 6, 60_000)
  if (rateLimited) return rateLimited

  try {
    const startTime = Date.now()
    const body: ReindexRequest = await request.json()
    const db = getAdminDb()
    const batchSize = Math.min(Math.max(body.batchSize ?? 100, 1), 500)

    if (!body.operation) {
      return NextResponse.json(
        { success: false, error: "Operation is required" },
        { status: 400 }
      )
    }

    let result: ReindexResult

    switch (body.operation) {
      case "all":
        result = await reindexAllItems(db, batchSize)
        break
      case "by-category":
        if (!body.categoryId) {
          return NextResponse.json(
            { success: false, error: "categoryId is required for by-category operation" },
            { status: 400 }
          )
        }
        result = await reindexByCategory(db, body.categoryId, batchSize)
        break
      case "by-user":
        if (!body.userId) {
          return NextResponse.json(
            { success: false, error: "userId is required for by-user operation" },
            { status: 400 }
          )
        }
        result = await reindexByUser(db, body.userId, batchSize)
        break
      case "missing-search":
        result = await reindexMissingSearchData(db, batchSize)
        break
      default:
        return NextResponse.json(
          { success: false, error: "Invalid operation" },
          { status: 400 }
        )
    }

    result.duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error("[Admin Reindex Items API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Reindex operation failed",
      },
      { status: 500 }
    )
  }
}

async function reindexAllItems(
  db: FirebaseFirestore.Firestore, 
  batchSize: number
): Promise<ReindexResult> {
  let processed = 0
  let updated = 0
  let errors = 0
  const categories: Record<string, number> = {}

  const itemsSnapshot = await db.collection("items").get()
  const items = itemsSnapshot.docs

  await processItemsInChunks(
    items,
    batchSize,
    async (itemDoc) => {
      processed++
      const data = itemDoc.data()
      const updateData = generateSearchIndex(data)

      // Track categories
      const category = data.category || "other"
      categories[category] = (categories[category] || 0) + 1

      await itemDoc.ref.update(updateData)
      updated++
    },
    (itemDoc, error) => {
      console.error(`Error reindexing item ${itemDoc.id}:`, error)
      errors++
    }
  )

  return {
    operation: "all",
    processed,
    updated,
    errors,
    duration: 0, // Will be set by caller
    details: { categories },
  }
}

async function reindexByCategory(
  db: FirebaseFirestore.Firestore, 
  categoryId: string,
  batchSize: number
): Promise<ReindexResult> {
  let processed = 0
  let updated = 0
  let errors = 0

  const itemsSnapshot = await db
    .collection("items")
    .where("category", "==", categoryId)
    .get()

  const items = itemsSnapshot.docs

  await processItemsInChunks(
    items,
    batchSize,
    async (itemDoc) => {
      processed++
      const data = itemDoc.data()
      const updateData = generateSearchIndex(data)
      await itemDoc.ref.update(updateData)
      updated++
    },
    (itemDoc, error) => {
      console.error(`Error reindexing item ${itemDoc.id}:`, error)
      errors++
    }
  )

  return {
    operation: "by-category",
    processed,
    updated,
    errors,
    duration: 0, // Will be set by caller
  }
}

async function reindexByUser(
  db: FirebaseFirestore.Firestore, 
  userId: string,
  batchSize: number
): Promise<ReindexResult> {
  let processed = 0
  let updated = 0
  let errors = 0

  const itemsSnapshot = await db
    .collection("items")
    .where("postedBy", "==", userId)
    .get()

  const items = itemsSnapshot.docs

  await processItemsInChunks(
    items,
    batchSize,
    async (itemDoc) => {
      processed++
      const data = itemDoc.data()
      const updateData = generateSearchIndex(data)
      await itemDoc.ref.update(updateData)
      updated++
    },
    (itemDoc, error) => {
      console.error(`Error reindexing item ${itemDoc.id}:`, error)
      errors++
    }
  )

  return {
    operation: "by-user",
    processed,
    updated,
    errors,
    duration: 0, // Will be set by caller
  }
}

async function reindexMissingSearchData(
  db: FirebaseFirestore.Firestore, 
  batchSize: number
): Promise<ReindexResult> {
  let processed = 0
  let updated = 0
  let errors = 0

  // Find items without search data
  const itemsSnapshot = await db
    .collection("items")
    .where("searchKeywords", "==", null)
    .get()

  const items = itemsSnapshot.docs

  await processItemsInChunks(
    items,
    batchSize,
    async (itemDoc) => {
      processed++
      const data = itemDoc.data()
      const updateData = generateSearchIndex(data)
      await itemDoc.ref.update(updateData)
      updated++
    },
    (itemDoc, error) => {
      console.error(`Error reindexing item ${itemDoc.id}:`, error)
      errors++
    }
  )

  return {
    operation: "missing-search",
    processed,
    updated,
    errors,
    duration: 0, // Will be set by caller
  }
}

function generateSearchIndex(data: FirebaseFirestore.DocumentData) {
  const title = (data.title || "").toString().toLowerCase()
  const description = (data.description || "").toString().toLowerCase()
  const category = (data.category || "").toString().toLowerCase()
  
  // Generate search keywords
  const keywords = new Set<string>()
  
  // Add title words
  title.split(/\s+/).forEach((word: string) => {
    if (word.length > 2) keywords.add(word)
  })
  
  // Add description words
  description.split(/\s+/).forEach((word: string) => {
    if (word.length > 2) keywords.add(word)
  })
  
  // Add category
  if (category) keywords.add(category)
  
  // Add full text search field
  const fullTextSearch = `${title} ${description} ${category}`.trim()

  return {
    searchKeywords: Array.from(keywords),
    fullTextSearch,
    searchUpdatedAt: new Date(),
    // Add normalized title for exact matching
    titleNormalized: title.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    // Add category for filtering
    categoryLower: category,
  }
}
