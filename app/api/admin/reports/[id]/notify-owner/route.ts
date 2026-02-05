/**
 * Admin Report Notify Owner API
 * POST /api/admin/reports/[id]/notify-owner
 * แจ้งเตือนเจ้าของโพส/ผู้ถูกรายงาน (in-app + LINE)
 */

import { NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess, successResponse, errorResponse, AdminErrorCode } from "@/lib/admin-api"
import { notifyUserReported } from "@/lib/line"
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const { id: reportId } = await params
    const db = getAdminDb()

    const reportSnap = await db.collection("reports").doc(reportId).get()
    if (!reportSnap.exists) {
      return errorResponse(AdminErrorCode.NOT_FOUND, "ไม่พบรายงาน", 404)
    }

    const report = reportSnap.data() as {
      reportedUserId?: string
      reportedUserEmail?: string
      reportType?: string
      targetTitle?: string
      reason?: string
      targetId?: string
    }

    const reportedUserId = report.reportedUserId
    if (!reportedUserId) {
      return errorResponse(
        AdminErrorCode.VALIDATION_ERROR,
        "ไม่พบข้อมูลเจ้าของโพส/ผู้ถูกรายงาน",
        400
      )
    }

    const targetTitle = report.targetTitle || report.targetId || "รายการของคุณ"

    // 1. สร้าง in-app notification
    const notificationMessage = "ระบบตรวจพบการใช้งานที่ไม่เหมาะสมและอาจกระทบต่อผู้อื่น กรุณาปรับปรุงการใช้งานให้เป็นไปตามกติกาของแพลตฟอร์ม หากมีการกระทำซ้ำ ระบบอาจระงับการใช้งานชั่วคราวหรือถาวร"
    await db.collection("notifications").add({
      userId: reportedUserId,
      title: "พฤติกรรมไม่เหมาะสม",
      message: notificationMessage,
      type: "warning",
      relatedId: reportId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    })

    // 2. ส่ง LINE ถ้ามี LINE linked
    try {
      const userSnap = await db.collection("users").doc(reportedUserId).get()
      if (userSnap.exists) {
        const userData = userSnap.data() as { lineUserId?: string; lineNotifications?: { enabled?: boolean } }
        const lineUserId = userData?.lineUserId
        const lineEnabled = userData?.lineNotifications?.enabled !== false
        if (lineUserId && lineEnabled) {
          await notifyUserReported(
            lineUserId,
            report.reportType || "item_report",
            targetTitle
          )
        }
      }
    } catch (lineErr) {
      console.warn("[Admin Report Notify Owner] LINE send failed:", lineErr)
      // In-app notification succeeded, LINE is optional
    }

    return successResponse({ success: true, message: "แจ้งเตือนเจ้าของโพสแล้ว" })
  } catch (err) {
    console.error("[Admin Report Notify Owner] Error:", err)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      "ไม่สามารถแจ้งเตือนได้",
      500
    )
  }
}
