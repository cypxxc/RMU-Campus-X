/**
 * PATCH: แก้ไขข้อความ | DELETE: ลบข้อความ
 * ใช้ Admin SDK เพื่อไม่ติด Firestore rules
 */

import { NextRequest } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { ApiErrors, getAuthToken, successResponse } from "@/lib/api-response"
import { isAdmin } from "@/lib/admin-auth"
import { sanitizeText } from "@/lib/security"

function isParticipant(ownerId: string, requesterId: string, userId: string): boolean {
  return ownerId === userId || requesterId === userId
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ exchangeId: string; messageId: string }> }
) {
  try {
    const token = getAuthToken(_request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const { exchangeId, messageId } = await params
    if (!exchangeId || !messageId) return ApiErrors.badRequest("Missing exchangeId or messageId")

    const db = getAdminDb()
    const exchangeSnap = await db.collection("exchanges").doc(exchangeId).get()
    if (!exchangeSnap.exists) return ApiErrors.notFound("Exchange not found")

    const exchangeData = exchangeSnap.data()
    const ownerId = exchangeData && typeof exchangeData.ownerId === "string" ? exchangeData.ownerId : ""
    const requesterId = exchangeData && typeof exchangeData.requesterId === "string" ? exchangeData.requesterId : ""
    if (!ownerId || !requesterId) return ApiErrors.badRequest("Exchange data is invalid")

    const isParticipantUser = isParticipant(ownerId, requesterId, decoded.uid)
    const admin = decoded.email ? await isAdmin(decoded.email) : false
    if (!isParticipantUser && !admin) return ApiErrors.forbidden("เฉพาะผู้เกี่ยวข้องหรือแอดมินเท่านั้น")

    const msgRef = db.collection("chatMessages").doc(messageId)
    const msgSnap = await msgRef.get()
    if (!msgSnap.exists) return ApiErrors.notFound("ไม่พบข้อความ")

    const msgData = msgSnap.data()
    const msgExchangeId = msgData?.exchangeId
    const senderId = msgData?.senderId
    if (msgExchangeId !== exchangeId) return ApiErrors.badRequest("ข้อความไม่ตรงกับห้องแชท")

    // ลบได้เฉพาะผู้ส่งหรือแอดมิน
    if (senderId !== decoded.uid && !admin) return ApiErrors.forbidden("ลบได้เฉพาะข้อความของตัวเอง")

    await msgRef.delete()
    return successResponse({ deleted: true })
  } catch (e) {
    console.error("[Chat Messages API] DELETE Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}

/** PATCH /api/chat/[exchangeId]/messages/[messageId] — แก้ไขข้อความ (เฉพาะผู้ส่ง) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ exchangeId: string; messageId: string }> }
) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const { exchangeId, messageId } = await params
    if (!exchangeId || !messageId) return ApiErrors.badRequest("Missing exchangeId or messageId")

    let body: { message?: string }
    try {
      body = await request.json()
    } catch {
      return ApiErrors.badRequest("Invalid JSON body")
    }
    const message = typeof body.message === "string" ? sanitizeText(body.message.trim()) : ""
    if (!message) return ApiErrors.badRequest("กรุณาระบุข้อความ")

    const db = getAdminDb()
    const exchangeSnap = await db.collection("exchanges").doc(exchangeId).get()
    if (!exchangeSnap.exists) return ApiErrors.notFound("Exchange not found")

    const exchangeData = exchangeSnap.data()
    const ownerId = exchangeData && typeof exchangeData.ownerId === "string" ? exchangeData.ownerId : ""
    const requesterId = exchangeData && typeof exchangeData.requesterId === "string" ? exchangeData.requesterId : ""
    if (!ownerId || !requesterId) return ApiErrors.badRequest("Exchange data is invalid")

    const isParticipantUser = isParticipant(ownerId, requesterId, decoded.uid)
    const admin = decoded.email ? await isAdmin(decoded.email) : false
    if (!isParticipantUser && !admin) return ApiErrors.forbidden("เฉพาะผู้เกี่ยวข้องหรือแอดมินเท่านั้น")

    const msgRef = db.collection("chatMessages").doc(messageId)
    const msgSnap = await msgRef.get()
    if (!msgSnap.exists) return ApiErrors.notFound("ไม่พบข้อความ")

    const msgData = msgSnap.data()
    const msgExchangeId = msgData?.exchangeId
    const senderId = msgData?.senderId
    if (msgExchangeId !== exchangeId) return ApiErrors.badRequest("ข้อความไม่ตรงกับห้องแชท")

    if (senderId !== decoded.uid && !admin) return ApiErrors.forbidden("แก้ไขได้เฉพาะข้อความของตัวเอง")

    await msgRef.update({
      message,
      updatedAt: FieldValue.serverTimestamp(),
    })
    return successResponse({ updated: true })
  } catch (e) {
    console.error("[Chat Messages API] PATCH Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}
