/**
 * POST /api/admin/cleanup
 * Database cleanup operations for maintenance
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"

interface CleanupRequest {
  operation: "orphaned-files" | "expired-sessions" | "old-notifications" | "temp-data"
}

interface CleanupResult {
  operation: string
  deletedCount: number
  duration: number
  details?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now()
    const body: CleanupRequest = await request.json()
    const db = getAdminDb()

    if (!body.operation) {
      return NextResponse.json(
        { success: false, error: "Operation is required" },
        { status: 400 }
      )
    }

    let result: CleanupResult

    switch (body.operation) {
      case "orphaned-files":
        result = await cleanupOrphanedFiles(db)
        break
      case "expired-sessions":
        result = await cleanupExpiredSessions(db)
        break
      case "old-notifications":
        result = await cleanupOldNotifications(db)
        break
      case "temp-data":
        result = await cleanupTempData(db)
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
    console.error("[Admin Cleanup API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Cleanup operation failed",
      },
      { status: 500 }
    )
  }
}

async function cleanupOrphanedFiles(db: FirebaseFirestore.Firestore): Promise<CleanupResult> {
  // Find items that reference non-existent users
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

  // Delete orphaned items
  for (const itemId of orphanedItems) {
    await db.collection("items").doc(itemId).delete()
  }

  return {
    operation: "orphaned-files",
    deletedCount: orphanedItems.length,
    duration: 0, // Will be set by caller
    details: { orphanedItems: orphanedItems.length },
  }
}

async function cleanupExpiredSessions(db: FirebaseFirestore.Firestore): Promise<CleanupResult> {
  // Clean up sessions older than 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  const sessionsSnapshot = await db
    .collection("sessions")
    .where("createdAt", "<", thirtyDaysAgo)
    .get()

  let deletedCount = 0
  for (const sessionDoc of sessionsSnapshot.docs) {
    await sessionDoc.ref.delete()
    deletedCount++
  }

  return {
    operation: "expired-sessions",
    deletedCount,
    duration: 0, // Will be set by caller
    details: { cutoffDate: thirtyDaysAgo.toISOString() },
  }
}

async function cleanupOldNotifications(db: FirebaseFirestore.Firestore): Promise<CleanupResult> {
  // Clean up notifications older than 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  
  const notificationsSnapshot = await db
    .collection("notifications")
    .where("createdAt", "<", ninetyDaysAgo)
    .get()

  let deletedCount = 0
  for (const notifDoc of notificationsSnapshot.docs) {
    await notifDoc.ref.delete()
    deletedCount++
  }

  return {
    operation: "old-notifications",
    deletedCount,
    duration: 0, // Will be set by caller
    details: { cutoffDate: ninetyDaysAgo.toISOString() },
  }
}

async function cleanupTempData(db: FirebaseFirestore.Firestore): Promise<CleanupResult> {
  // Clean up temporary data older than 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  // Clean up temp uploads
  const tempUploadsSnapshot = await db
    .collection("tempUploads")
    .where("createdAt", "<", twentyFourHoursAgo)
    .get()

  let deletedCount = 0
  for (const tempDoc of tempUploadsSnapshot.docs) {
    await tempDoc.ref.delete()
    deletedCount++
  }

  return {
    operation: "temp-data",
    deletedCount,
    duration: 0, // Will be set by caller
    details: { cutoffDate: twentyFourHoursAgo.toISOString() },
  }
}
