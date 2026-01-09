/**
 * Reports API Route
 * สร้าง Report พร้อมส่ง LINE Notification ไปยัง Admin
 */

import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { notifyAdminsNewReport } from "@/lib/line"
import { successResponse, ApiErrors, validateRequiredFields, parseRequestBody } from "@/lib/api-response"
import { REPORT_TYPE_LABELS } from "@/lib/constants"
import type { Report, User } from "@/types"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

interface CreateReportBody {
  reportType: Report["reportType"]
  reasonCode: string
  reason: string
  description: string
  reporterId: string
  reporterEmail: string
  targetId: string
  targetType?: string
  targetTitle?: string
  reportedUserId: string
  reportedUserEmail: string
  itemId?: string
  itemTitle?: string
  exchangeId?: string
  evidenceUrls?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody<CreateReportBody>(request)
    if (!body) {
      return ApiErrors.badRequest("Invalid request body")
    }

    const {
      reportType,
      reasonCode,
      reason,
      description,
      reporterId,
      reporterEmail,
      targetId,
      targetTitle,
      reportedUserId,
      reportedUserEmail,
      ...optionalFields
    } = body

    // Validate required fields
    const validation = validateRequiredFields(body, ["reportType", "reporterId", "targetId", "reportedUserId"])
    if (!validation.valid) {
      return ApiErrors.missingFields(validation.missing)
    }

    const db = getAdminDb()

    // Create report document
    const reportData = {
      reportType,
      reasonCode: reasonCode || "",
      reason: reason || "",
      description: description || "",
      reporterId,
      reporterEmail: reporterEmail || "",
      targetId,
      targetTitle: targetTitle || "",
      reportedUserId,
      reportedUserEmail: reportedUserEmail || "",
      ...optionalFields,
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
          message: `${REPORT_TYPE_LABELS[reportType] || reportType}: "${targetTitle || targetId}"`,
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
        targetTitle || targetId,
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

