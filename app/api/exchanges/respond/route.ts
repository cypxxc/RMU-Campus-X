/**
 * Respond to Exchange API
 * Handles Accept/Reject actions for exchanges
 * Enforces atomic state transitions and item unlocking
 */

import { NextRequest } from "next/server"
import { successResponse, ApiErrors, getAuthToken } from "@/lib/api-response"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { respondExchangeSchema } from "@/lib/schemas"
import { validateTransition } from "@/lib/exchange-state-machine"
import type { ExchangeStatus } from "@/types"

export async function POST(request: NextRequest) {
  try {
    // 0. Verify Authentication
    const token = getAuthToken(request)
    if (!token) {
      return ApiErrors.unauthorized("Missing authentication token")
    }
    
    // Strict Status Check
    const decodedToken = await verifyIdToken(token, true)
    if (!decodedToken) {
      return ApiErrors.unauthorized("Invalid or expired session")
    }

    // Parse and validate body with Zod
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return ApiErrors.badRequest("Invalid JSON body")
    }

    const validation = respondExchangeSchema.safeParse(body)
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(", ")
      return ApiErrors.badRequest(`Validation failed: ${errors}`)
    }

    const { exchangeId, action } = validation.data
    const userId = decodedToken.uid // Use token's uid for security

    const db = getAdminDb()

    await db.runTransaction(async (transaction) => {
      // 1. Get Exchange
      const exchangeRef = db.collection("exchanges").doc(exchangeId)
      const exchangeDoc = await transaction.get(exchangeRef)

      if (!exchangeDoc.exists) {
        throw new Error("Exchange not found")
      }

      const exchangeData = exchangeDoc.data()
      const currentStatus = exchangeData?.status as ExchangeStatus
      
      // Ownership Check
      if (exchangeData?.ownerId !== userId) {
          throw new Error("Only the item owner can respond to this exchange")
      }

      // State machine validation
      const newStatus: ExchangeStatus = action === 'accept' ? 'accepted' : 'rejected'
      const transitionError = validateTransition(currentStatus, newStatus)
      if (transitionError) {
        throw new Error(transitionError)
      }

      const itemId = exchangeData?.itemId

      // 2. Perform Action
      if (action === 'accept') {
          // Accept Logic
          // Exchange -> accepted, Item -> pending (remains pending, but logic is explicit)
          transaction.update(exchangeRef, {
              status: 'accepted',
              updatedAt: FieldValue.serverTimestamp()
          })
          
          // No item update needed as it remains locked (pending) until confirmation
      } else if (action === 'reject') {
          // Reject Logic
          // Exchange -> rejected, Item -> available (Unlock!)
          transaction.update(exchangeRef, {
              status: 'rejected',
              updatedAt: FieldValue.serverTimestamp()
          })

          const itemRef = db.collection("items").doc(itemId)
          transaction.update(itemRef, {
              status: 'available',
              updatedAt: FieldValue.serverTimestamp()
          })
      }
    })

    // Notify Requester (Best effort)
    try {
        const exchangeSnap = await db.collection("exchanges").doc(exchangeId).get()
        const data = exchangeSnap.data()
        if (data) {
            const title = action === 'accept' ? 'คำขอได้รับการตอบรับ' : 'คำขอถูกปฏิเสธ'
            const message = action === 'accept' 
                ? `เจ้าของสิ่งของ "${data.itemTitle}" ได้ตอบรับคำขอของคุณแล้ว`
                : `เจ้าของสิ่งของ "${data.itemTitle}" ได้ปฏิเสธคำขอของคุณ`
            
            await db.collection("notifications").add({
                userId: data.requesterId,
                title,
                message,
                type: 'exchange',
                relatedId: exchangeId,
                isRead: false,
                createdAt: FieldValue.serverTimestamp()
            })
        }
    } catch (e) {
        console.error("Notification failed", e)
    }

    return successResponse({ success: true, action })

  } catch (error: unknown) {
    console.error("[RespondExchange] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return ApiErrors.internalError(message)
  }
}
