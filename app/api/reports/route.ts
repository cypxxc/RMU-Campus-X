/**
 * Reports API Route
 * สร้าง Report พร้อมส่ง LINE Notification ไปยัง Admin
 */

import { NextRequest } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { notifyAdminsNewReport } from "@/lib/line"
import { successResponse, ApiErrors, validateRequiredFields, parseRequestBody, getAuthToken } from "@/lib/api-response"
import { REPORT_TYPE_LABELS } from "@/lib/constants"
import type { Report, User } from "@/types"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

interface CreateReportBody {
  reportType: Report["reportType"]
  reasonCode: string
  reason: string
  description: string
  targetId: string
  targetType?: string
  targetTitle?: string
  itemId?: string
  itemTitle?: string
  exchangeId?: string
  evidenceUrls?: string[]
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication (prevents anonymous/spoofed reports)
    const token = getAuthToken(request)
    if (!token) {
      return ApiErrors.unauthorized("Missing authentication token")
    }

    const decoded = await verifyIdToken(token, true)
    if (!decoded) {
      return ApiErrors.unauthorized("Invalid or expired session")
    }

    const body = await parseRequestBody<CreateReportBody>(request)
    if (!body) {
      return ApiErrors.badRequest("Invalid request body")
    }

    const {
      reportType,
      reasonCode,
      reason,
      description,
      targetId,
      targetType: _targetType,
      targetTitle,
      ...optionalFields
    } = body

    // Validate required fields
    const validation = validateRequiredFields(body, ["reportType", "targetId"])
    if (!validation.valid) {
      return ApiErrors.missingFields(validation.missing)
    }

    const db = getAdminDb()

    // Resolve reporter from token (prevents spoofing)
    const reporterId = decoded.uid
    const reporterEmail = decoded.email || ""

    // Resolve reported user server-side (prevents spoofing)
    let reportedUserId = ""
    let reportedUserEmail = ""

    const targetTypeMap: Record<string, string> = {
      item_report: "item",
      exchange_report: "exchange",
      chat_report: "chat",
      user_report: "user",
    }
    const resolvedTargetType = targetTypeMap[String(reportType)] || "unknown"

    let resolvedTargetTitle = targetTitle || ""

    try {
      if (reportType === "item_report") {
        const itemSnap = await db.collection("items").doc(targetId).get()
        if (itemSnap.exists) {
          const item = itemSnap.data() as any
          reportedUserId = item?.postedBy || ""
          reportedUserEmail = item?.postedByEmail || ""
          if (!resolvedTargetTitle) resolvedTargetTitle = item?.title || ""
        }
      } else if (reportType === "exchange_report" || reportType === "chat_report") {
        const exchangeSnap = await db.collection("exchanges").doc(targetId).get()
        if (exchangeSnap.exists) {
          const exchange = exchangeSnap.data() as any
          const ownerId = exchange?.ownerId
          const requesterId = exchange?.requesterId

          if (ownerId && requesterId) {
            // Report the other party
            if (reporterId === ownerId) {
              reportedUserId = requesterId
              reportedUserEmail = exchange?.requesterEmail || ""
            } else {
              reportedUserId = ownerId
              reportedUserEmail = exchange?.ownerEmail || ""
            }
          }

          if (!resolvedTargetTitle) resolvedTargetTitle = exchange?.itemTitle || ""
        }
      } else if (reportType === "user_report") {
        reportedUserId = targetId
        const userSnap = await db.collection("users").doc(targetId).get()
        if (userSnap.exists) {
          const userData = userSnap.data() as any
          reportedUserEmail = userData?.email || ""
          if (!resolvedTargetTitle) resolvedTargetTitle = reportedUserEmail
        }
      }
    } catch (e) {
      console.error("[Report API] Failed to resolve reported user:", e)
    }

    if (!reportedUserId) {
      return ApiErrors.badRequest("Unable to resolve reported user")
    }

    // Create report document
    const reportData = {
      reportType,
      reasonCode: reasonCode || "",
      reason: reason || "",
      description: description || "",
      reporterId,
      reporterEmail: reporterEmail || "",
      targetId,
      ...optionalFields,
      targetType: resolvedTargetType,
      targetTitle: resolvedTargetTitle || "",
      reportedUserId,
      reportedUserEmail: reportedUserEmail || "",
      status: "new" as const,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    const docRef = await db.collection("reports").add(reportData)
    console.log("[Report API] Created report:", docRef.id)

    // Create in-app notifications for admins
    const adminsSnapshot = await db.collection("admins").get()
    
    for (const adminDoc of adminsSnapshot.docs) {
      const adminData = adminDoc.data()
      const usersSnapshot = await db.collection("users")
        .where("email", "==", adminData.email)
        .get()

      if (!usersSnapshot.empty && usersSnapshot.docs[0]) {
        const adminUserId = usersSnapshot.docs[0].data().uid
        await db.collection("notifications").add({
          userId: adminUserId,
          title: "🚨 มีรายงานใหม่",
          message: `${REPORT_TYPE_LABELS[reportType] || reportType}: "${resolvedTargetTitle || targetId}"`,
          type: "report",
          relatedId: docRef.id,
          isRead: false,
          createdAt: FieldValue.serverTimestamp(),
        })
      }
    }

    // ============ LINE Notification to Admins ============
    const adminLineUserIds = await getAdminLineUserIds(db)
    
    if (adminLineUserIds.length > 0) {
      console.log("[Report API] Sending LINE notification to", adminLineUserIds.length, "admins")
      
      await notifyAdminsNewReport(
        adminLineUserIds,
        reportType,
        resolvedTargetTitle || targetId,
        reporterEmail,
        BASE_URL
      )
    }

    return successResponse({ reportId: docRef.id })
  } catch (error) {
    console.error("[Report API] Error:", error)
    return ApiErrors.internalError()
  }
}

// Helper function to get admin LINE User IDs
async function getAdminLineUserIds(db: FirebaseFirestore.Firestore): Promise<string[]> {
  const adminsSnapshot = await db.collection("admins").get()
  const adminEmails = adminsSnapshot.docs.map(doc => doc.data().email)

  if (adminEmails.length === 0) {
    return []
  }

  const lineUserIds: string[] = []

  for (const email of adminEmails) {
    const usersSnapshot = await db.collection("users")
      .where("email", "==", email)
      .get()

    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0]!.data() as User
      if (userData.lineUserId && userData.lineNotifications?.enabled) {
        lineUserIds.push(userData.lineUserId)
      }
    }
  }

  return lineUserIds
}

