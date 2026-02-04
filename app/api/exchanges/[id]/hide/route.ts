/**
 * POST /api/exchanges/[id]/hide
 * ซ่อนแชทจากรายการของฉัน (อีกฝ่ายยังเห็นได้)
 */

import { NextRequest } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { ApiErrors, getAuthToken } from "@/lib/api-response"
import type { Exchange } from "@/types"

function isParticipant(exchange: Exchange, userId: string): boolean {
  return exchange.ownerId === userId || exchange.requesterId === userId
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")
    const userId = decoded.uid

    const { id: exchangeId } = await params
    if (!exchangeId) {
      return ApiErrors.badRequest("Missing exchange ID")
    }

    const db = getAdminDb()
    const exchangeRef = db.collection("exchanges").doc(exchangeId)
    const exchangeDoc = await exchangeRef.get()

    if (!exchangeDoc.exists) return ApiErrors.notFound("Exchange not found")

    const exchangeData = exchangeDoc.data() as Exchange
    if (!isParticipant(exchangeData, userId)) {
      return ApiErrors.forbidden("เฉพาะผู้เกี่ยวข้องกับการแลกเปลี่ยนเท่านั้นที่สามารถซ่อนได้")
    }

    const hideDocId = `${exchangeId}_${userId}`
    await db.collection("exchangeHides").doc(hideDocId).set(
      {
        exchangeId,
        userId,
        hiddenAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    return Response.json({ success: true, message: "ซ่อนจากรายการแล้ว" })
  } catch (e) {
    console.error("[Exchange Hide] Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}
