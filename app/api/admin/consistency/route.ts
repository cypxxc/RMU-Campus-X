/**
 * POST /api/admin/consistency
 * Database consistency checks and repairs
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

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

export async function POST(request: NextRequest) {
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
  for (const itemId of orphanedItems) {
    await db.collection("items").doc(itemId).delete()
    totalFixed++
  }
  
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
  for (const exchangeId of orphanedExchanges) {
    await db.collection("exchanges").doc(exchangeId).delete()
    totalFixed++
  }

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

  // Fix exchanges with invalid item references
  const exchangesSnapshot = await db.collection("exchanges").get()
  for (const exchangeDoc of exchangesSnapshot.docs) {
    const data = exchangeDoc.data()
    const itemId = data.itemId
    
    if (itemId) {
      const itemDoc = await db.collection("items").doc(itemId).get()
      if (!itemDoc.exists) {
        // Update exchange to remove invalid item reference
        await exchangeDoc.ref.update({
          itemId: null,
          itemTitle: "Item deleted",
        })
        totalFixed++
      }
    }
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

  for (const itemDoc of itemsSnapshot.docs) {
    const postedBy = itemDoc.data().postedBy
    if (postedBy) {
      const userDoc = await db.collection("users").doc(postedBy).get()
      if (!userDoc.exists) {
        orphanedItems.push(itemDoc.id)
      }
    }
  }

  return orphanedItems
}

async function findOrphanedExchanges(db: FirebaseFirestore.Firestore): Promise<string[]> {
  const exchangesSnapshot = await db.collection("exchanges").get()
  const orphanedExchanges: string[] = []

  for (const exchangeDoc of exchangesSnapshot.docs) {
    const data = exchangeDoc.data()
    const hasIssues = 
      (data.ownerId && !(await db.collection("users").doc(data.ownerId).get()).exists) ||
      (data.requesterId && !(await db.collection("users").doc(data.requesterId).get()).exists) ||
      (data.itemId && !(await db.collection("items").doc(data.itemId).get()).exists)

    if (hasIssues) {
      orphanedExchanges.push(exchangeDoc.id)
    }
  }

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
