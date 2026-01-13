/**
 * Respond to Exchange API
 * Handles Accept/Reject actions for exchanges
 * Enforces atomic state transitions and item unlocking
 */

import { NextRequest } from "next/server"
import { successResponse, ApiErrors, validateRequiredFields, parseRequestBody, getAuthToken } from "@/lib/api-response"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

interface RespondBody {
  exchangeId: string
  action: 'accept' | 'reject'
  userId: string // Owner ID
}

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

    const body = await parseRequestBody<RespondBody>(request)
    if (!body) {
      return ApiErrors.badRequest("Invalid request body")
    }

    const validation = validateRequiredFields(body, ["exchangeId", "action", "userId"])
    if (!validation.valid) {
        return ApiErrors.missingFields(validation.missing)
    }

    const { exchangeId, action, userId } = body
    
    // Check ownership (Auth Token vs Body)
    if (decodedToken.uid !== userId) {
        return ApiErrors.forbidden("User ID mismatch")
    }

    const db = getAdminDb()

    await db.runTransaction(async (transaction) => {
      // 1. Get Exchange
      const exchangeRef = db.collection("exchanges").doc(exchangeId)
      const exchangeDoc = await transaction.get(exchangeRef)

      if (!exchangeDoc.exists) {
        throw new Error("Exchange not found")
      }

      const exchangeData = exchangeDoc.data()
      
      // Ownership Check
      if (exchangeData?.ownerId !== userId) {
          throw new Error("Only the item owner can respond to this exchange")
      }

      // State Check
      if (exchangeData?.status !== 'pending') {
          throw new Error(`Cannot respond to exchange in status: ${exchangeData?.status}`)
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

  } catch (error: any) {
    console.error("[RespondExchange] Error:", error)
    return ApiErrors.internalError(error.message)
  }
}
