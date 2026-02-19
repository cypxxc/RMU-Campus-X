/**
 * POST /api/admin/cleanup
 * Database cleanup operations for maintenance
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { enforceAdminMutationRateLimit, verifyAdminAccess } from "@/lib/admin-api"

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

const FIRESTORE_BATCH_LIMIT = 400

async function deleteRefsInBatches(
  db: FirebaseFirestore.Firestore,
  refs: FirebaseFirestore.DocumentReference[]
) {
  for (let i = 0; i < refs.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = refs.slice(i, i + FIRESTORE_BATCH_LIMIT)
    const batch = db.batch()
    chunk.forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
}

export async function POST(request: NextRequest) {
  const { authorized, user, error } = await verifyAdminAccess(request)
  if (!authorized) return error!
  if (!user?.uid) {
    return NextResponse.json({ success: false, error: "Admin identity missing" }, { status: 403 })
  }

  const rateLimited = await enforceAdminMutationRateLimit(request, user.uid, "cleanup", 10, 60_000)
  if (rateLimited) return rateLimited

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
  const orphanedItemRefs: FirebaseFirestore.DocumentReference[] = []
  const userExistsCache = new Map<string, Promise<boolean>>()

  const userExists = (userId: string) => {
    if (!userExistsCache.has(userId)) {
      userExistsCache.set(
        userId,
        db
          .collection("users")
          .doc(userId)
          .get()
          .then((doc) => doc.exists)
      )
    }
    return userExistsCache.get(userId)!
  }

  await Promise.all(
    itemsSnapshot.docs.map(async (itemDoc) => {
      const postedBy = itemDoc.data().postedBy
      if (!postedBy || typeof postedBy !== "string") return
      const exists = await userExists(postedBy)
      if (!exists) orphanedItemRefs.push(itemDoc.ref)
    })
  )

  await deleteRefsInBatches(db, orphanedItemRefs)

  return {
    operation: "orphaned-files",
    deletedCount: orphanedItemRefs.length,
    duration: 0, // Will be set by caller
    details: { orphanedItems: orphanedItemRefs.length },
  }
}

async function cleanupExpiredSessions(db: FirebaseFirestore.Firestore): Promise<CleanupResult> {
  // Clean up sessions older than 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  const sessionsSnapshot = await db
    .collection("sessions")
    .where("createdAt", "<", thirtyDaysAgo)
    .get()

  const refs = sessionsSnapshot.docs.map((doc) => doc.ref)
  await deleteRefsInBatches(db, refs)

  return {
    operation: "expired-sessions",
    deletedCount: refs.length,
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

  const refs = notificationsSnapshot.docs.map((doc) => doc.ref)
  await deleteRefsInBatches(db, refs)

  return {
    operation: "old-notifications",
    deletedCount: refs.length,
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

  const refs = tempUploadsSnapshot.docs.map((doc) => doc.ref)
  await deleteRefsInBatches(db, refs)

  return {
    operation: "temp-data",
    deletedCount: refs.length,
    duration: 0, // Will be set by caller
    details: { cutoffDate: twentyFourHoursAgo.toISOString() },
  }
}
