/**
 * API Route: Notify Admins via LINE
 * ส่ง LINE notification ให้ Admin ทุกคน
 */

import { NextRequest, NextResponse } from "next/server"
import { notifyAdminsNewReport, notifyAdminsNewSupportTicket, sendPushMessage } from "@/lib/line"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { ApiErrors, getAuthToken, parseRequestBody, successResponse } from "@/lib/api-response"
import { isAdmin } from "@/lib/admin-auth"

type NotifyType = "new_report" | "new_support_ticket" | "custom"

type NotifyBody =
  | {
      type: "new_report"
      reportType: string
      targetTitle: string
      reporterEmail: string
    }
  | {
      type: "new_support_ticket"
      subject: string
      category: string
      userEmail: string
    }
  | {
      type: "custom"
      message: string
    }

type AdminUserDoc = {
  lineUserId?: string
  lineNotifications?: {
    enabled?: boolean
  }
  email?: string
}

/**
 * Get all admin LINE User IDs using Admin SDK (no public REST API, no API keys).
 *
 * Strategy:
 * - Read `admins` collection
 * - Prefer mapping adminDoc.id -> users/{id}
 * - Fallback to users lookup by email if needed
 */
async function getAdminLineUserIds(): Promise<string[]> {
  const db = getAdminDb()

  const adminsSnapshot = await db.collection("admins").get()
  if (adminsSnapshot.empty) return []

  const lineUserIds = new Set<string>()

  for (const adminDoc of adminsSnapshot.docs) {
    const adminData = adminDoc.data() as { email?: string }
    const adminId = adminDoc.id

    // 1) Prefer direct lookup by id
    const userDocById = await db.collection("users").doc(adminId).get()
    if (userDocById.exists) {
      const user = userDocById.data() as AdminUserDoc
      if (user.lineUserId && user.lineNotifications?.enabled) {
        lineUserIds.add(user.lineUserId)
        continue
      }
    }

    // 2) Fallback by email
    if (adminData.email) {
      const userSnap = await db
        .collection("users")
        .where("email", "==", adminData.email)
        .limit(1)
        .get()

      if (!userSnap.empty) {
        const user = userSnap.docs[0]!.data() as AdminUserDoc
        if (user.lineUserId && user.lineNotifications?.enabled) {
          lineUserIds.add(user.lineUserId)
        }
      }
    }
  }

  return Array.from(lineUserIds)
}

export async function POST(request: NextRequest) {
  try {
    // 1) Require authentication (prevents anonymous spam)
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")

    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    // 2) Parse and validate body
    const body = await parseRequestBody<NotifyBody>(request)
    if (!body) return ApiErrors.badRequest("Invalid request body")

    const type = body.type as NotifyType

    console.log(`[Admin Notify] Received notification request - Type: ${type}`)

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569.vercel.app"
    
    // Get all admin LINE user IDs
    const adminLineIds = await getAdminLineUserIds()
    
    if (adminLineIds.length === 0) {
      console.log("[Admin Notify] No admins with LINE linked, skipping notification")
      return successResponse({ success: true, message: "No admins to notify" })
    }

    console.log(`[Admin Notify] Will notify ${adminLineIds.length} admin(s) for ${type}`)

    switch (type) {
      case "new_report":
        if (!("reportType" in body) || !("targetTitle" in body) || !("reporterEmail" in body)) {
          return ApiErrors.missingFields(["reportType", "targetTitle", "reporterEmail"])
        }
        await notifyAdminsNewReport(
          adminLineIds,
          body.reportType,
          body.targetTitle,
          body.reporterEmail,
          baseUrl
        )
        console.log("[Admin Notify] Report notification sent")
        break

      case "new_support_ticket":
        if (!("subject" in body) || !("category" in body) || !("userEmail" in body)) {
          return ApiErrors.missingFields(["subject", "category", "userEmail"])
        }
        await notifyAdminsNewSupportTicket(
          adminLineIds,
          body.subject,
          body.category,
          body.userEmail,
          baseUrl
        )
        console.log("[Admin Notify] Support ticket notification sent")
        break

      case "custom":
        // Custom broadcasts should be admin-only
        if (!decoded.email) return ApiErrors.forbidden("Missing email in token")
        const allowed = await isAdmin(decoded.email)
        if (!allowed) return ApiErrors.forbidden("Admin permission required")
        if (!("message" in body) || !body.message?.trim()) {
          return ApiErrors.missingFields(["message"])
        }
        // Send custom message to all admins
        const message = {
          type: "text" as const,
          text: body.message
        }
        await Promise.allSettled(
          adminLineIds.map((adminId) => sendPushMessage(adminId, [message]))
        )
        console.log("[Admin Notify] Custom notification sent")
        break

      default:
        console.log(`[Admin Notify] Unknown notification type: ${type}`)
        return ApiErrors.badRequest("Unknown notification type")
    }

    return successResponse({ success: true, notifiedCount: adminLineIds.length })
  } catch (error) {
    console.error("[Admin Notify] Error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
