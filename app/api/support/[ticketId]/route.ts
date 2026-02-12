import { NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { ApiErrors, getAuthToken, successResponse } from "@/lib/api-response"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")

    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const { ticketId } = await params
    if (!ticketId) return ApiErrors.badRequest("Missing ticketId")

    const db = getAdminDb()
    const ticketRef = db.collection("support_tickets").doc(ticketId)
    const ticketSnap = await ticketRef.get()

    if (!ticketSnap.exists) return ApiErrors.notFound("Ticket not found")

    const ticket = ticketSnap.data() as { userId?: string } | undefined
    if (!ticket || ticket.userId !== decoded.uid) {
      return ApiErrors.forbidden("คุณไม่มีสิทธิ์ลบคำร้องนี้")
    }

    await ticketRef.update({
      deletedByUser: true,
      status: "closed",
      updatedAt: FieldValue.serverTimestamp(),
    })

    return successResponse({ success: true })
  } catch (error) {
    console.error("[Support Ticket API] DELETE Error:", error)
    return ApiErrors.internalError("Internal server error")
  }
}

