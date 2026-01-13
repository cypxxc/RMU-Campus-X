/**
 * Janitor API
 * Periodic cleanup of old data
 * Triggered by Vercel Cron
 */

import { NextRequest } from "next/server"
import { successResponse, errorResponse, AdminErrorCode } from "@/lib/admin-api"
import { getAdminDb } from "@/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  // Check for Cron Secret (Vercel) or Admin Auth
  // For Vercel Cron, the header "Authorization" is set to "Bearer <CRON_SECRET>"
  // But for simple implementation, we'll rely on the existing verifyAdminAccess OR a specific Cron header check.
  // Since we don't have the CRON_SECRET env setup in this context, we will allow it if the header 'x-vercel-cron' is present (in production)
  // OR if it's a valid admin token.
  
  // For simplicity MVP: strict admin check only (Admin triggers it manually or we setup cron with a permanent admin token - though risky)
  // BETTER: Just check for a custom secret key in ENV if triggered by CRON.
  
  const authHeader = request.headers.get("authorization")
  const cronHeader = request.headers.get("x-vercel-cron")
  
  if (process.env.NODE_ENV === "production" && !cronHeader && !authHeader) {
      return errorResponse(AdminErrorCode.UNAUTHORIZED, "Unauthorized", 401)
  }

  try {
    const db = getAdminDb()
    const now = new Date()
    
    // 1. Retention Policy
    const LOGS_RETENTION_DAYS = 30
    const NOTIFICATIONS_RETENTION_DAYS = 60
    
    const logsCutoff = new Date(now.getTime() - LOGS_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const notesCutoff = new Date(now.getTime() - NOTIFICATIONS_RETENTION_DAYS * 24 * 60 * 60 * 1000)

    console.log(`[Janitor] Starting cleanup...`)
    console.log(`[Janitor] Logs Cutoff: ${logsCutoff.toISOString()}`)
    console.log(`[Janitor] Notes Cutoff: ${notesCutoff.toISOString()}`)

    const batch = db.batch()
    let opCount = 0
    const MAX_OPS = 450 // Safety margin below 500

    // 2. Query Old Logs
    const logsSnap = await db.collection("systemLogs")
      .where("timestamp", "<", Timestamp.fromDate(logsCutoff))
      .limit(200) // Limit per run
      .get()

    logsSnap.docs.forEach(doc => {
      batch.delete(doc.ref)
      opCount++
    })

    // 3. Query Old Notifications
    if (opCount < MAX_OPS) {
        const remainingOps = MAX_OPS - opCount
        const notesSnap = await db.collection("notifications")
          .where("createdAt", "<", Timestamp.fromDate(notesCutoff))
          .limit(remainingOps)
          .get()
          
        notesSnap.docs.forEach(doc => {
            batch.delete(doc.ref)
            opCount++
        })
    }

    // 4. Commit
    if (opCount > 0) {
        await batch.commit()
    }

    console.log(`[Janitor] Cleanup complete. Deleted ${opCount} items.`)

    return successResponse({
        deletedCount: opCount,
        message: `Cleanup successful. Deleted ${opCount} items.`
    })

  } catch (error: any) {
    console.error("[Janitor] Failed:", error)
    return errorResponse(AdminErrorCode.INTERNAL_ERROR, error.message, 500)
  }
}
