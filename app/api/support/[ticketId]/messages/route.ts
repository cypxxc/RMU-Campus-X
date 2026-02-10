import { NextRequest } from "next/server"
import { z } from "zod"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { ApiErrors, getAuthToken, successResponse } from "@/lib/api-response"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { sanitizeText } from "@/lib/security"

const bodySchema = z.object({
  message: z
    .string()
    .min(1, "กรุณาระบุข้อความ")
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
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")

    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return ApiErrors.badRequest("Invalid JSON body")
    }

    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validationError(parsed.error.errors[0]?.message || "ข้อมูลไม่ถูกต้อง")
    }

    const { ticketId } = await params
    if (!ticketId) return ApiErrors.badRequest("Missing ticketId")

    const db = getAdminDb()
    const ticketRef = db.collection("support_tickets").doc(ticketId)
    const ticketSnap = await ticketRef.get()

    if (!ticketSnap.exists) return ApiErrors.notFound("Ticket not found")

    const ticket = ticketSnap.data() as { userId?: string; status?: string } | undefined
    if (!ticket || ticket.userId !== decoded.uid) {
      return ApiErrors.forbidden("คุณไม่มีสิทธิ์ตอบกลับคำร้องนี้")
    }

    if (ticket.status !== "new" && ticket.status !== "in_progress") {
      return ApiErrors.badRequest("คำร้องนี้ปิดแล้ว ไม่สามารถส่งข้อความเพิ่มได้")
    }

    await ticketRef.update({
      messages: FieldValue.arrayUnion({
        id: createMessageId(),
        sender: "user",
        senderEmail: decoded.email || "",
        content: parsed.data.message,
        createdAt: Timestamp.now(),
      }),
      status: "new",
      updatedAt: FieldValue.serverTimestamp(),
    })

    return successResponse({ success: true })
  } catch (error) {
    console.error("[Support Message API] POST Error:", error)
    return ApiErrors.internalError("Internal server error")
  }
}
