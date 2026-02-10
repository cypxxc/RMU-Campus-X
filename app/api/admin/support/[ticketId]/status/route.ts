import { NextRequest } from "next/server"
import { z } from "zod"
import { FieldValue } from "firebase-admin/firestore"
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from "@/lib/admin-api"
import { getAdminDb } from "@/lib/firebase-admin"
import type { SupportTicketStatus } from "@/types"

const statusSchema = z.object({
  status: z.enum(["new", "in_progress", "resolved", "closed"]),
})

const statusLabels: Record<SupportTicketStatus, string> = {
  new: "ใหม่",
  in_progress: "กำลังดำเนินการ",
  resolved: "ดำเนินการแล้ว",
  closed: "ปิด",
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { authorized, user, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = statusSchema.safeParse(body)
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
    } | undefined
    if (!ticketData) {
      return errorResponse(AdminErrorCode.INTERNAL_ERROR, "Failed to load ticket", 500)
    }

    const nextStatus = parsed.data.status
    const updates: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (nextStatus === "resolved" || nextStatus === "closed") {
      updates.resolvedAt = FieldValue.serverTimestamp()
    }
    await ticketRef.update(updates)

    if (ticketData.userId) {
      await db.collection("notifications").add({
        userId: ticketData.userId,
        title: "อัปเดตสถานะคำร้อง",
        message: `คำร้อง "${ticketData.subject || "ไม่ระบุหัวข้อ"}" ถูกเปลี่ยนเป็น: ${statusLabels[nextStatus]}`,
        type: "support",
        relatedId: ticketId,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      })
    }

    await db.collection("adminLogs").add({
      actionType: "ticket_status_change",
      adminId: typeof user?.uid === "string" ? user.uid : "",
      adminEmail: typeof user?.email === "string" ? user.email : "",
      targetType: "ticket",
      targetId: ticketId,
      targetInfo: ticketData.subject || "",
      description: `เปลี่ยนสถานะคำร้องเป็น: ${statusLabels[nextStatus]}`,
      status: "success",
      metadata: { status: nextStatus, category: ticketData.category || null },
      createdAt: FieldValue.serverTimestamp(),
    })

    return successResponse({ success: true })
  } catch (err) {
    console.error("[Admin API] Support status update error:", err)
    return errorResponse(AdminErrorCode.INTERNAL_ERROR, "Failed to update support ticket status", 500)
  }
}
