/**
 * Admin LINE Bot Test API
 * ส่งข้อความทดสอบแจ้งเตือน LINE ไปที่บัญชี LINE ของแอดมินที่ล็อกอินเท่านั้น
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { ApiErrors, getAuthToken, parseRequestBody, successResponse } from "@/lib/api-response"
import {
  notifyExchangeRequest,
  notifyExchangeStatusChange,
  notifyExchangeCompleted,
  notifyAdminsNewReport,
  notifyAdminsNewSupportTicket,
  notifyItemPosted,
  notifyItemUpdated,
  notifyItemDeleted,
  notifyNewChatMessage,
  notifyUserReported,
  notifyUserWarning,
  notifyAccountStatusChange,
  notifyItemEditedByAdmin,
  sendLinkSuccessMessage,
} from "@/lib/line"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ""

export type LineTestType =
  | "exchange_request"
  | "exchange_status"
  | "exchange_completed"
  | "admin_report"
  | "admin_support_ticket"
  | "item_posted"
  | "item_updated"
  | "item_deleted"
  | "chat_message"
  | "user_reported"
  | "user_warning"
  | "account_status"
  | "item_edited_by_admin"
  | "link_success"

/** POST /api/admin/line-test – ส่งข้อความทดสอบไปที่ LINE ของแอดมินที่ล็อกอิน */
export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")

    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const db = getAdminDb()

    // ต้องเป็นแอดมิน
    const adminSnap = await db.collection("admins").doc(decoded.uid).get()
    if (!adminSnap.exists) return ApiErrors.forbidden("Admin only")

    // ดึง lineUserId ของแอดมินที่ล็อกอิน
    const userSnap = await db.collection("users").doc(decoded.uid).get()
    const userData = userSnap.exists ? (userSnap.data() as { lineUserId?: string; displayName?: string }) : null
    const lineUserId = userData?.lineUserId

    if (!lineUserId) {
      return ApiErrors.badRequest(
        "บัญชีแอดมินยังไม่ได้เชื่อม LINE กรุณาเชื่อมบัญชี LINE ในหน้าโปรไฟล์ก่อน"
      )
    }

    const body = await parseRequestBody<{ type: LineTestType }>(request)
    if (!body?.type) return ApiErrors.missingFields(["type"])

    const displayName = userData?.displayName || decoded.email?.split("@")[0] || "แอดมิน"

    switch (body.type) {
      case "exchange_request":
        await notifyExchangeRequest(
          lineUserId,
          "[ทดสอบ] หนังสือมือสอง",
          "ผู้ใช้ทดสอบ",
          "test-ex-id",
          BASE_URL
        )
        break
      case "exchange_status":
        await notifyExchangeStatusChange(
          lineUserId,
          "[ทดสอบ] หนังสือมือสอง",
          "accepted",
          "test-ex-id",
          BASE_URL
        )
        break
      case "exchange_completed":
        await notifyExchangeCompleted(lineUserId, "[ทดสอบ] หนังสือมือสอง")
        break
      case "admin_report":
        await notifyAdminsNewReport(
          [lineUserId],
          "item",
          "[ทดสอบ] รายการทดสอบ",
          "tester@example.com",
          BASE_URL
        )
        break
      case "admin_support_ticket":
        await notifyAdminsNewSupportTicket(
          [lineUserId],
          "[ทดสอบ] หัวข้อคำร้อง",
          "general",
          "tester@example.com",
          BASE_URL
        )
        break
      case "item_posted":
        await notifyItemPosted(lineUserId, "[ทดสอบ] โพสต์ทดสอบ", "test-item-id", BASE_URL)
        break
      case "item_updated":
        await notifyItemUpdated(lineUserId, "[ทดสอบ] โพสต์ทดสอบ", "test-item-id", BASE_URL)
        break
      case "item_deleted":
        await notifyItemDeleted(lineUserId, "[ทดสอบ] โพสต์ที่ถูกลบ")
        break
      case "chat_message":
        await notifyNewChatMessage(
          lineUserId,
          "ผู้ใช้ทดสอบ",
          "[ทดสอบ] รายการ",
          "สวัสดีครับ นี่คือข้อความทดสอบ",
          "test-ex-id",
          BASE_URL
        )
        break
      case "user_reported":
        await notifyUserReported(lineUserId, "item", "[ทดสอบ] เป้าหมายรายงาน")
        break
      case "user_warning":
        await notifyUserWarning(lineUserId, "ทดสอบการแจ้งเตือนคำเตือน", 1)
        break
      case "account_status":
        await notifyAccountStatusChange(lineUserId, "ACTIVE", "ทดสอบปลดระงับ")
        break
      case "item_edited_by_admin":
        await notifyItemEditedByAdmin(lineUserId, "[ทดสอบ] โพสต์ที่แอดมินแก้ไข")
        break
      case "link_success":
        await sendLinkSuccessMessage(lineUserId, displayName)
        break
      default:
        return ApiErrors.badRequest("Unknown test type: " + (body as { type?: string }).type)
    }

    return successResponse({ ok: true, message: "ส่งข้อความทดสอบไปที่ LINE ของคุณแล้ว" })
  } catch (error) {
    console.error("[Admin LINE Test] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
