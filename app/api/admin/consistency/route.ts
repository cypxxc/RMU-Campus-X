/**
 * POST /api/admin/consistency
 * Database consistency checks and repairs
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { enforceAdminMutationRateLimit, verifyAdminAccess } from "@/lib/admin-api"

export const dynamic = "force-dynamic"

interface ConsistencyRequest {
  operation: "check-all" | "fix-orphaned" | "check-duplicates" | "fix-references"
}

interface ConsistencyResult {
  operation: string
  issues: Array<{
    type: string
    count: number
    description: string
    fixed?: number
  }>
  duration: number
  summary: {
    totalIssues: number
    totalFixed: number
  }
}

const FIRESTORE_BATCH_LIMIT = 400
const CHECK_CONCURRENCY = 100

async function processInChunks<T>(
  items: T[],
  chunkSize: number,
  task: (item: T) => Promise<void>
) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    await Promise.all(chunk.map((item) => task(item)))
  }
}

function createExistenceChecker(
  db: FirebaseFirestore.Firestore,
  collectionName: string
) {
  const cache = new Map<string, Promise<boolean>>()

  return (id: string) => {
    if (!cache.has(id)) {
      cache.set(
        id,
        db
          .collection(collectionName)
          .doc(id)
          .get()
          .then((doc) => doc.exists)
      )
    }
    return cache.get(id)!
  }
}

async function deleteDocsByIdInBatches(
  db: FirebaseFirestore.Firestore,
  collectionName: string,
  ids: string[]
) {
  for (let i = 0; i < ids.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = ids.slice(i, i + FIRESTORE_BATCH_LIMIT)
    const batch = db.batch()
    chunk.forEach((id) => batch.delete(db.collection(collectionName).doc(id)))
    await batch.commit()
  }
}

async function updateDocsInBatches(
  db: FirebaseFirestore.Firestore,
  updates: Array<{ ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }>
) {
  for (let i = 0; i < updates.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = updates.slice(i, i + FIRESTORE_BATCH_LIMIT)
    const batch = db.batch()
    chunk.forEach(({ ref, data }) => batch.update(ref, data))
    await batch.commit()
  }
}

export async function POST(request: NextRequest) {
  const { authorized, user, error } = await verifyAdminAccess(request)
  if (!authorized) return error!
  if (!user?.uid) {
    return NextResponse.json({ success: false, error: "Admin identity missing" }, { status: 403 })
  }

  const rateLimited = await enforceAdminMutationRateLimit(request, user.uid, "consistency", 8, 60_000)
  if (rateLimited) return rateLimited

  try {
    const startTime = Date.now()
    const body: ConsistencyRequest = await request.json()
    const db = getAdminDb()

    if (!body.operation) {
      return NextResponse.json(
        { success: false, error: "Operation is required" },
        { status: 400 }
      )
    }

    let result: ConsistencyResult

    switch (body.operation) {
      case "check-all":
        result = await checkAllConsistency(db)
        break
      case "fix-orphaned":
        result = await fixOrphanedRecords(db)
        break
      case "check-duplicates":
        result = await checkDuplicates(db)
        break
      case "fix-references":
        result = await fixBrokenReferences(db)
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
    console.error("[Admin Consistency API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Consistency check failed",
      },
      { status: 500 }
    )
  }
}

async function checkAllConsistency(db: FirebaseFirestore.Firestore): Promise<ConsistencyResult> {
  const issues = []

  // Check for orphaned items
  const orphanedItems = await findOrphanedItems(db)
  if (orphanedItems.length > 0) {
    issues.push({
      type: "orphaned-items",
      count: orphanedItems.length,
      description: "Items without valid user references",
    })
  }

  // Check for orphaned exchanges
  const orphanedExchanges = await findOrphanedExchanges(db)
  if (orphanedExchanges.length > 0) {
    issues.push({
      type: "orphaned-exchanges",
      count: orphanedExchanges.length,
      description: "Exchanges with invalid item or user references",
    })
  }

  // Check for duplicate items
  const duplicateItems = await findDuplicateItems(db)
  if (duplicateItems.length > 0) {
    issues.push({
      type: "duplicate-items",
      count: duplicateItems.length,
      description: "Items with duplicate titles from same user",
    })
  }

  // Check for invalid statuses
  const invalidStatuses = await findInvalidStatuses(db)
  if (invalidStatuses.length > 0) {
    issues.push({
      type: "invalid-statuses",
      count: invalidStatuses.length,
      description: "Records with invalid status values",
    })
  }

  return {
    operation: "check-all",
    issues,
    duration: 0, // Will be set by caller
    summary: {
      totalIssues: issues.reduce((sum, issue) => sum + issue.count, 0),
      totalFixed: 0,
    },
  }
}

async function fixOrphanedRecords(db: FirebaseFirestore.Firestore): Promise<ConsistencyResult> {
  const issues = []
  let totalFixed = 0

  // Fix orphaned items
  const orphanedItems = await findOrphanedItems(db)
  await deleteDocsByIdInBatches(db, "items", orphanedItems)
  totalFixed += orphanedItems.length
  
  if (orphanedItems.length > 0) {
    issues.push({
      type: "orphaned-items",
      count: orphanedItems.length,
      description: "Deleted orphaned items",
      fixed: orphanedItems.length,
    })
  }

  // Fix orphaned exchanges
  const orphanedExchanges = await findOrphanedExchanges(db)
  await deleteDocsByIdInBatches(db, "exchanges", orphanedExchanges)
  totalFixed += orphanedExchanges.length

  if (orphanedExchanges.length > 0) {
    issues.push({
      type: "orphaned-exchanges",
      count: orphanedExchanges.length,
      description: "Deleted orphaned exchanges",
      fixed: orphanedExchanges.length,
    })
  }

  return {
    operation: "fix-orphaned",
    issues,
    duration: 0, // Will be set by caller
    summary: {
      totalIssues: issues.reduce((sum, issue) => sum + issue.count, 0),
      totalFixed,
    },
  }
}

async function checkDuplicates(db: FirebaseFirestore.Firestore): Promise<ConsistencyResult> {
  const issues = []
  
  const duplicateItems = await findDuplicateItems(db)
  if (duplicateItems.length > 0) {
    issues.push({
      type: "duplicate-items",
      count: duplicateItems.length,
      description: "Found potential duplicate items",
    })
  }

  return {
    operation: "check-duplicates",
    issues,
    duration: 0, // Will be set by caller
    summary: {
      totalIssues: issues.reduce((sum, issue) => sum + issue.count, 0),
      totalFixed: 0,
    },
  }
}

async function fixBrokenReferences(db: FirebaseFirestore.Firestore): Promise<ConsistencyResult> {
  const issues = []
  let totalFixed = 0
  const updates: Array<{ ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }> = []
  const itemExists = createExistenceChecker(db, "items")

  // Fix exchanges with invalid item references
  const exchangesSnapshot = await db.collection("exchanges").get()
  await processInChunks(exchangesSnapshot.docs, CHECK_CONCURRENCY, async (exchangeDoc) => {
    const data = exchangeDoc.data()
    const itemId = data.itemId
    if (!itemId || typeof itemId !== "string") return

    const exists = await itemExists(itemId)
    if (!exists) {
      updates.push({
        ref: exchangeDoc.ref,
        data: {
          itemId: null,
          itemTitle: "Item deleted",
        },
      })
    }
  })

  if (updates.length > 0) {
    await updateDocsInBatches(db, updates)
    totalFixed = updates.length
  }

  if (totalFixed > 0) {
    issues.push({
      type: "broken-references",
      count: totalFixed,
      description: "Fixed broken item references in exchanges",
      fixed: totalFixed,
    })
  }

  return {
    operation: "fix-references",
    issues,
    duration: 0, // Will be set by caller
    summary: {
      totalIssues: issues.reduce((sum, issue) => sum + issue.count, 0),
      totalFixed,
    },
  }
}

// Helper functions
async function findOrphanedItems(db: FirebaseFirestore.Firestore): Promise<string[]> {
  const itemsSnapshot = await db.collection("items").get()
  const orphanedItems: string[] = []
  const userExists = createExistenceChecker(db, "users")

  await processInChunks(itemsSnapshot.docs, CHECK_CONCURRENCY, async (itemDoc) => {
    const postedBy = itemDoc.data().postedBy
    if (!postedBy || typeof postedBy !== "string") return

    const exists = await userExists(postedBy)
    if (!exists) orphanedItems.push(itemDoc.id)
  })

  return orphanedItems
}

async function findOrphanedExchanges(db: FirebaseFirestore.Firestore): Promise<string[]> {
  const exchangesSnapshot = await db.collection("exchanges").get()
  const orphanedExchanges: string[] = []
  const userExists = createExistenceChecker(db, "users")
  const itemExists = createExistenceChecker(db, "items")

  await processInChunks(exchangesSnapshot.docs, CHECK_CONCURRENCY, async (exchangeDoc) => {
    const data = exchangeDoc.data()
    const ownerId = typeof data.ownerId === "string" ? data.ownerId : null
    const requesterId = typeof data.requesterId === "string" ? data.requesterId : null
    const itemId = typeof data.itemId === "string" ? data.itemId : null

    const ownerExists = ownerId ? await userExists(ownerId) : true
    const requesterExists = requesterId ? await userExists(requesterId) : true
    const itemDocExists = itemId ? await itemExists(itemId) : true

    if (!ownerExists || !requesterExists || !itemDocExists) {
      orphanedExchanges.push(exchangeDoc.id)
    }
  })

  return orphanedExchanges
}

async function findDuplicateItems(db: FirebaseFirestore.Firestore): Promise<string[]> {
  const itemsSnapshot = await db.collection("items").get()
  const titleMap = new Map<string, string[]>()
  const duplicates: string[] = []

  // Group items by title and user
  for (const itemDoc of itemsSnapshot.docs) {
    const data = itemDoc.data()
    const key = `${data.postedBy}:${data.title?.toLowerCase()}`
    
    if (!titleMap.has(key)) {
      titleMap.set(key, [])
    }
    titleMap.get(key)!.push(itemDoc.id)
  }

  // Find duplicates
  for (const [, itemIds] of titleMap) {
    if (itemIds.length > 1) {
      duplicates.push(...itemIds.slice(1)) // Keep first, mark rest as duplicates
    }
  }

  return duplicates
}

async function findInvalidStatuses(db: FirebaseFirestore.Firestore): Promise<string[]> {
  const validStatuses = ["available", "exchanged", "deleted", "pending", "in_progress", "completed", "cancelled", "rejected"]
  const invalidRecords: string[] = []

  // Check items
  const itemsSnapshot = await db.collection("items").get()
  for (const itemDoc of itemsSnapshot.docs) {
    const status = itemDoc.data().status
    if (status && !validStatuses.includes(status)) {
      invalidRecords.push(`items/${itemDoc.id}`)
    }
  }

  // Check exchanges
  const exchangesSnapshot = await db.collection("exchanges").get()
  for (const exchangeDoc of exchangesSnapshot.docs) {
    const status = exchangeDoc.data().status
    if (status && !validStatuses.includes(status)) {
      invalidRecords.push(`exchanges/${exchangeDoc.id}`)
    }
  }

  return invalidRecords
}
