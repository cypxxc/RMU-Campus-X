import { NextRequest } from "next/server"
import { z } from "zod"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { sanitizeText } from "@/lib/security"
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from "@/lib/admin-api"
import { getAdminDb } from "@/lib/firebase-admin"

const bodySchema = z.object({
  reply: z
    .string()
    .min(1, "กรุณาระบุข้อความตอบกลับ")
    .max(2000, "ข้อความยาวเกินไป")
    .transform(sanitizeText),
})

function createMessageId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { authorized, user, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(
        AdminErrorCode.VALIDATION_ERROR,
        parsed.error.errors[0]?.message || "Invalid request body",
        400
      )
    }

    const { ticketId } = await params
    if (!ticketId) {
      return errorResponse(AdminErrorCode.VALIDATION_ERROR, "Missing ticketId", 400)
    }

    const db = getAdminDb()
    const ticketRef = db.collection("support_tickets").doc(ticketId)
    const ticketSnap = await ticketRef.get()
    if (!ticketSnap.exists) {
      return errorResponse(AdminErrorCode.NOT_FOUND, "Ticket not found", 404)
    }

    const ticketData = ticketSnap.data() as {
      userId?: string
      subject?: string
      category?: string
      status?: string
    } | undefined
    if (!ticketData) {
      return errorResponse(AdminErrorCode.INTERNAL_ERROR, "Failed to load ticket", 500)
    }
    if (ticketData.status === "closed") {
      return errorResponse(AdminErrorCode.CONFLICT, "Ticket is already closed", 409)
    }

    const adminUid = typeof user?.uid === "string" ? user.uid : ""
    const adminEmail = typeof user?.email === "string" ? user.email : ""
    const replyText = parsed.data.reply

    await ticketRef.update({
      adminReply: replyText, // legacy field for backward compatibility
      messages: FieldValue.arrayUnion({
        id: createMessageId(),
        sender: "admin",
        senderEmail: adminEmail,
        content: replyText,
        createdAt: Timestamp.now(),
      }),
      repliedBy: adminUid,
      repliedByEmail: adminEmail,
      repliedAt: FieldValue.serverTimestamp(),
      status: "in_progress",
      updatedAt: FieldValue.serverTimestamp(),
    })

    const replyPreview =
      replyText.length > 300 ? `${replyText.slice(0, 300).trim()}...` : replyText

    if (ticketData.userId) {
      await db.collection("notifications").add({
        userId: ticketData.userId,
        title: "ได้รับการตอบกลับจาก Support",
        message: `[${ticketData.subject || "คำร้อง"}]\n\n${replyPreview}`,
        type: "support",
        relatedId: ticketId,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      })
    }

    await db.collection("adminLogs").add({
      actionType: "ticket_reply",
      adminId: adminUid,
      adminEmail,
      targetType: "ticket",
      targetId: ticketId,
      targetInfo: ticketData.subject || "",
      description: `ตอบกลับคำร้อง: ${replyText.slice(0, 100)}${replyText.length > 100 ? "..." : ""}`,
      status: "success",
      metadata: { category: ticketData.category || null },
      createdAt: FieldValue.serverTimestamp(),
    })

    return successResponse({ success: true })
  } catch (err) {
    console.error("[Admin API] Support reply error:", err)
    return errorResponse(AdminErrorCode.INTERNAL_ERROR, "Failed to reply support ticket", 500)
  }
}
