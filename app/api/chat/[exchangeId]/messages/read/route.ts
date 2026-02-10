/**
 * Mark chat messages as read
 * POST body: { messageIds: string[] }
 */

import { NextRequest } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { ApiErrors, getAuthToken, successResponse } from "@/lib/api-response"

const MAX_MARK_READ_IDS = 200

function isParticipant(ownerId: string, requesterId: string, userId: string): boolean {
  return ownerId === userId || requesterId === userId
}

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

    const exchange = exchangeSnap.data() as { ownerId: string; requesterId: string }
    if (!isParticipant(exchange.ownerId, exchange.requesterId, decoded.uid)) {
      return ApiErrors.forbidden("เฉพาะผู้เกี่ยวข้องกับการแลกเปลี่ยนเท่านั้น")
    }

    let body: { messageIds?: string[] }
    try {
      body = await request.json()
    } catch {
      return ApiErrors.badRequest("Invalid JSON body")
    }
    const messageIds = Array.isArray(body?.messageIds)
      ? [...new Set(body.messageIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0))].slice(0, MAX_MARK_READ_IDS)
      : []
    if (messageIds.length === 0) return successResponse({ updated: 0 })

    const refs = messageIds.map((id) => db.collection("chatMessages").doc(id))
    const snapshots = await db.getAll(...refs)

    const now = FieldValue.serverTimestamp()
    const batch = db.batch()
    let updated = 0

    for (const snap of snapshots) {
      if (!snap.exists) continue
      const data = snap.data() as { exchangeId?: string; readAt?: unknown }
      if (data.exchangeId !== exchangeId) continue
      if (data.readAt) continue
      batch.update(snap.ref, { readAt: now })
      updated += 1
    }

    if (updated > 0) {
      await batch.commit()
    }

    return successResponse({ updated, requested: messageIds.length })
  } catch (e) {
    console.error("[Chat Messages Read API] POST Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}
