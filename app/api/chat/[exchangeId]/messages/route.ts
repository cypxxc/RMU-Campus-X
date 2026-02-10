/**
 * Chat Messages API
 * GET: รายการข้อความ (รองรับ pagination)
 * POST: ส่งข้อความใหม่
 *
 * หมายเหตุ: GET ต้องมี composite index บน chatMessages (exchangeId + createdAt)
 * รัน firebase deploy --only firestore:indexes ถ้าได้ error เกี่ยวกับ index
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore"
import { ApiErrors, getAuthToken, successResponse } from "@/lib/api-response"

const PAGE_SIZE = 50

function isParticipant(ownerId: string, requesterId: string, userId: string): boolean {
  return ownerId === userId || requesterId === userId
}

function serializeMessage(doc: DocumentSnapshot): Record<string, unknown> {
  const d = doc.data()
  if (!d) return { id: doc.id }
  const out: Record<string, unknown> = { id: doc.id, ...d }
  const ts = (x: unknown) =>
    x && typeof (x as { toDate?: () => Date }).toDate === "function"
      ? (x as { toDate: () => Date }).toDate().toISOString()
      : x
  if (d.createdAt) out.createdAt = ts(d.createdAt)
  if (d.updatedAt) out.updatedAt = ts(d.updatedAt)
  if (d.readAt) out.readAt = ts(d.readAt)
  return out
}

function isIndexError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /index|FAILED_PRECONDITION|9\s+FAILED/.test(msg)
}

/** GET /api/chat/[exchangeId]/messages?limit=50&beforeId=xxx */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exchangeId: string }> }
) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const { exchangeId } = await params
    if (!exchangeId) return ApiErrors.badRequest("Missing exchangeId")

    const db = getAdminDb()
    const exchangeSnap = await db.collection("exchanges").doc(exchangeId).get()
    if (!exchangeSnap.exists) return ApiErrors.notFound("Exchange not found")

    const exchangeData = exchangeSnap.data()
    const ownerId = exchangeData && typeof exchangeData.ownerId === "string" ? exchangeData.ownerId : ""
    const requesterId = exchangeData && typeof exchangeData.requesterId === "string" ? exchangeData.requesterId : ""
    if (!ownerId || !requesterId) {
      return ApiErrors.badRequest("Exchange data is invalid (missing ownerId or requesterId)")
    }
    if (!isParticipant(ownerId, requesterId, decoded.uid)) {
      return ApiErrors.forbidden("เฉพาะผู้เกี่ยวข้องกับการแลกเปลี่ยนเท่านั้น")
    }

    const { searchParams } = new URL(request.url)
    const limitParam = Math.min(Number(searchParams.get("limit")) || PAGE_SIZE, 100)
    const beforeId = searchParams.get("beforeId") ?? undefined

    const col = db.collection("chatMessages")

    if (beforeId) {
      const beforeRef = db.collection("chatMessages").doc(beforeId)
      const beforeSnap = await beforeRef.get()
      if (!beforeSnap.exists) return ApiErrors.badRequest("Invalid beforeId")
      const beforeData = beforeSnap.data() as { exchangeId?: string } | undefined
      if (beforeData?.exchangeId !== exchangeId) {
        return ApiErrors.badRequest("beforeId does not belong to this exchange")
      }
      const q = col
        .where("exchangeId", "==", exchangeId)
        .orderBy("createdAt", "asc")
        .endBefore(beforeSnap)
        .limit(limitParam)
      const snapshot = await q.get()
      const messages = snapshot.docs.map(serializeMessage)
      return successResponse({ messages })
    }

    const query = col
      .where("exchangeId", "==", exchangeId)
      .orderBy("createdAt", "desc")
      .limit(limitParam)
    const snapshot = await query.get()
    const messages = snapshot.docs.map(serializeMessage)
    return successResponse({ messages: [...messages].reverse() })
  } catch (e) {
    console.error("[Chat Messages API] GET Error:", e)
    if (isIndexError(e)) {
      return NextResponse.json(
        {
          success: false,
          error: "ต้องสร้าง Firestore index สำหรับ chatMessages (exchangeId + createdAt). รัน: firebase deploy --only firestore:indexes",
          code: "INDEX_REQUIRED",
        },
        { status: 503 }
      )
    }
    return ApiErrors.internalError("Internal server error")
  }
}

/** POST /api/chat/[exchangeId]/messages */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ exchangeId: string }> }
) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const { exchangeId } = await params
    if (!exchangeId) return ApiErrors.badRequest("Missing exchangeId")

    const db = getAdminDb()
    const exchangeSnap = await db.collection("exchanges").doc(exchangeId).get()
    if (!exchangeSnap.exists) return ApiErrors.notFound("Exchange not found")

    const exchangeData = exchangeSnap.data()
    const ownerId = exchangeData && typeof exchangeData.ownerId === "string" ? exchangeData.ownerId : ""
    const requesterId = exchangeData && typeof exchangeData.requesterId === "string" ? exchangeData.requesterId : ""
    if (!ownerId || !requesterId) {
      return ApiErrors.badRequest("Exchange data is invalid (missing ownerId or requesterId)")
    }
    if (!isParticipant(ownerId, requesterId, decoded.uid)) {
      return ApiErrors.forbidden("เฉพาะผู้เกี่ยวข้องกับการแลกเปลี่ยนเท่านั้น")
    }

    const status = (exchangeData?.status as string) ?? ""
    const CHATABLE_STATUSES = ["pending", "accepted", "in_progress"]
    if (!CHATABLE_STATUSES.includes(status)) {
      return ApiErrors.badRequest(
        "ห้องแชทปิดแล้ว — การแลกเปลี่ยนเสร็จสิ้น/ยกเลิก/ปฏิเสธแล้ว ไม่สามารถส่งข้อความได้"
      )
    }

    let body: { message?: string }
    try {
      body = await request.json()
    } catch {
      return ApiErrors.badRequest("Invalid JSON body")
    }

    const messageText = typeof body.message === "string" ? body.message.trim() : ""
    if (!messageText) return ApiErrors.badRequest("กรุณาระบุข้อความ")

    const ref = await db.collection("chatMessages").add({
      exchangeId,
      senderId: decoded.uid,
      senderEmail: decoded.email ?? "",
      message: messageText,
      createdAt: FieldValue.serverTimestamp(),
    })

    const doc = await ref.get()
    const created = doc.data()
    const createdAt =
      created?.createdAt && typeof (created.createdAt as { toDate?: () => Date }).toDate === "function"
        ? (created.createdAt as { toDate: () => Date }).toDate().toISOString()
        : new Date().toISOString()

    return successResponse({ messageId: ref.id, createdAt })
  } catch (e) {
    console.error("[Chat Messages API] POST Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}
