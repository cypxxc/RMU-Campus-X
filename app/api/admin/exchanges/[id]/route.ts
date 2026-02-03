/**
 * Admin API – ลบการแลกเปลี่ยนหนึ่งรายการ (และแชทที่เกี่ยวข้อง)
 * DELETE /api/admin/exchanges/[id]
 * ต้องเป็น admin เท่านั้น
 */

import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from "@/lib/admin-api"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  const { id: exchangeId } = await params
  if (!exchangeId) {
    return errorResponse(AdminErrorCode.VALIDATION_ERROR, "ไม่มีรหัสการแลกเปลี่ยน", 400)
  }

  try {
    const db = getAdminDb()
    const exchangeRef = db.collection("exchanges").doc(exchangeId)
    const exchangeSnap = await exchangeRef.get()
    if (!exchangeSnap.exists) {
      return errorResponse(AdminErrorCode.NOT_FOUND, "ไม่พบการแลกเปลี่ยนนี้", 404)
    }

    const messagesSnap = await db
      .collection("chatMessages")
      .where("exchangeId", "==", exchangeId)
      .get()

    const batch = db.batch()
    messagesSnap.docs.forEach((d) => batch.delete(d.ref))
    batch.delete(exchangeRef)

    await batch.commit()
    return successResponse({ deleted: true, message: "ลบการแลกเปลี่ยนและแชทที่เกี่ยวข้องแล้ว" })
  } catch (err) {
    console.error("[Admin] DELETE exchange error:", err)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      err instanceof Error ? err.message : "ลบไม่สำเร็จ",
      500
    )
  }
}
