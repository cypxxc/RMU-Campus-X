/**
 * Cancel Exchange API Route
 * Handles secure cancellation of exchanges using Admin SDK transactions
 */

import { NextRequest } from "next/server"
import { successResponse, ApiErrors, validateRequiredFields, parseRequestBody, getAuthToken } from "@/lib/api-response"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
// import { sendPushMessage } from "@/lib/line" // Unused in this file currently

interface CancelExchangeBody {
  exchangeId: string
  reason?: string
  userId: string // Who is cancelling
}

export async function POST(request: NextRequest) {
  try {
    // 0. Verify Authentication
    const token = getAuthToken(request)
    if (!token) {
      return ApiErrors.unauthorized("Missing authentication token")
    }
    
    const decodedToken = await verifyIdToken(token, true) // Force Firestore Status Check
    if (!decodedToken) {
      return ApiErrors.unauthorized("Invalid authentication token")
    }

    const body = await parseRequestBody<CancelExchangeBody>(request)
    if (!body) {
      return ApiErrors.badRequest("Invalid request body")
    }

    const { exchangeId, reason, userId } = body

    const validation = validateRequiredFields(body, ["exchangeId", "userId"])
    if (!validation.valid) {
      return ApiErrors.missingFields(validation.missing)
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
      if (exchangeData?.status === "cancelled") {
        throw new Error("Exchange is already cancelled")
      }
      
      const itemId = exchangeData?.itemId
      // (itemTitle unused here)

      // 2. Query OTHER active exchanges for this item
      // In Admin SDK we can query inside transaction
      const activeExchangesQuery = db.collection("exchanges")
        .where("itemId", "==", itemId)
        .where("status", "in", ["pending", "accepted", "in_progress"])
      
      const activeSnapshot = await transaction.get(activeExchangesQuery)
      
      // Filter out CURRENT exchange from the count
      const activeDocs = activeSnapshot.docs.filter(d => d.id !== exchangeId)
      const otherActiveCount = activeDocs.length

      // 3. Update Exchange Status
      transaction.update(exchangeRef, {
        status: "cancelled",
        cancelReason: reason || "Not specified",
        cancelledBy: userId,
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })

      // 4. Update Item ONLY if no other active exchanges
      if (otherActiveCount === 0) {
        const itemRef = db.collection("items").doc(itemId)
        transaction.update(itemRef, {
          status: "available",
          updatedAt: FieldValue.serverTimestamp()
        })
      }

      // 5. Prepare Notification (deferred)
      // Use Side-Effect or just run it after (transaction doesn't return much)
    })
    
    // Notifications (Best effort, after transaction)
    // We need to fetch exchange data again or use what we had (but we need the 'other' party)
    // For simplicity, we can fetch it again or assume success.
    
    // We'll skip complex notification logic here for brevity unless critical, 
    // but we SHOULD notify the other party.
    
    // Fetch exchange to get IDs
    const docSnap = await db.collection("exchanges").doc(exchangeId).get()
    const data = docSnap.data()
    
    if (data) {
        const targetUserId = data.requesterId === userId ? data.ownerId : data.requesterId
        await db.collection("notifications").add({
            userId: targetUserId,
            title: "รายการถูกยกเลิก",
            message: `การแลกเปลี่ยน "${data.itemTitle || 'สิ่งของ'}" ถูกยกเลิก`,
            type: "exchange",
            relatedId: exchangeId,
            createdAt: FieldValue.serverTimestamp(),
            isRead: false
        })
    }

    return successResponse({ success: true })

  } catch (error: any) {
    console.error("[CancelExchange] Error:", error)
    return ApiErrors.internalError(error.message)
  }
}
