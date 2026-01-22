/**
 * Cancel Exchange API Route
 * Handles secure cancellation of exchanges using Admin SDK transactions
 */

import { NextRequest } from "next/server"
import { successResponse, ApiErrors, getAuthToken } from "@/lib/api-response"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { cancelExchangeSchema } from "@/lib/schemas"
import { validateTransition, isTerminalStatus } from "@/lib/exchange-state-machine"
import type { ExchangeStatus } from "@/types"

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

    // Parse and validate body with Zod
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return ApiErrors.badRequest("Invalid JSON body")
    }

    const validation = cancelExchangeSchema.safeParse(body)
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(", ")
      return ApiErrors.badRequest(`Validation failed: ${errors}`)
    }

    const { exchangeId, reason } = validation.data
    const userId = decodedToken.uid // Use token's uid, not from body

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
      
      // State machine validation
      if (isTerminalStatus(currentStatus)) {
        throw new Error(`Cannot cancel: exchange is already ${currentStatus}`)
      }
      
      const transitionError = validateTransition(currentStatus, 'cancelled')
      if (transitionError) {
        throw new Error(transitionError)
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

  } catch (error: unknown) {
    console.error("[CancelExchange] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return ApiErrors.internalError(message)
  }
}
