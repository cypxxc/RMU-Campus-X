/**
 * Respond to Exchange API
 * Handles Accept/Reject actions for exchanges
 * Enforces atomic state transitions and item unlocking
 * 
 * ✅ Uses withValidation wrapper + Exchange State Machine
 */

import { NextResponse } from "next/server"
import { withValidation, type ValidationContext } from "@/lib/api-validation"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { respondExchangeSchema } from "@/lib/schemas"
import { validateTransition } from "@/lib/exchange-state-machine"
import type { ExchangeStatus } from "@/types"

/**
 * POST /api/exchanges/respond
 * Accept or reject an exchange request
 */
export const POST = withValidation(
  respondExchangeSchema,
  async (_request, data, ctx: ValidationContext | null) => {
    if (!ctx) {
      return NextResponse.json(
        { error: "Authentication context missing", code: "AUTH_ERROR" },
        { status: 401 }
      )
    }

    const { exchangeId, action } = data
    const userId = ctx.userId

    try {
      const db = getAdminDb()

      await db.runTransaction(async (transaction) => {
        // 1. Get Exchange
        const exchangeRef = db.collection("exchanges").doc(exchangeId)
        const exchangeDoc = await transaction.get(exchangeRef)

        if (!exchangeDoc.exists) {
          throw new Error("ไม่พบการแลกเปลี่ยนที่ต้องการ")
        }

        const exchangeData = exchangeDoc.data()
        const currentStatus = exchangeData?.status as ExchangeStatus
        
        // Ownership Check
        if (exchangeData?.ownerId !== userId) {
          throw new Error("เฉพาะเจ้าของสิ่งของเท่านั้นที่สามารถตอบรับ/ปฏิเสธได้")
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
          transaction.update(exchangeRef, {
            status: 'accepted',
            updatedAt: FieldValue.serverTimestamp()
          })
        } else if (action === 'reject') {
          transaction.update(exchangeRef, {
            status: 'rejected',
            updatedAt: FieldValue.serverTimestamp()
          })

          // Unlock item
          const itemRef = db.collection("items").doc(itemId)
          transaction.update(itemRef, {
            status: 'available',
            updatedAt: FieldValue.serverTimestamp()
          })
        }
      })

      // Notify Requester (fire and forget)
      notifyRequester(exchangeId, action).catch(err => {
        console.error("[RespondExchange] Notification error:", err)
      })

      return NextResponse.json({
        success: true,
        data: { action }
      })

    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      
      // Check for specific errors
      if (message.includes("ไม่พบ") || message.includes("not found")) {
        return NextResponse.json(
          { error: message, code: "NOT_FOUND" },
          { status: 404 }
        )
      }
      if (message.includes("เฉพาะเจ้าของ") || message.includes("owner")) {
        return NextResponse.json(
          { error: message, code: "FORBIDDEN" },
          { status: 403 }
        )
      }
      if (message.includes("Invalid status") || message.includes("Cannot change")) {
        return NextResponse.json(
          { error: message, code: "INVALID_TRANSITION" },
          { status: 400 }
        )
      }

      console.error("[RespondExchange] Error:", error)
      return NextResponse.json(
        { error: message, code: "INTERNAL_ERROR" },
        { status: 500 }
      )
    }
  },
  { requireAuth: true }
)

// Helper: Notify requester about the response
async function notifyRequester(exchangeId: string, action: "accept" | "reject"): Promise<void> {
  const db = getAdminDb()
  const exchangeSnap = await db.collection("exchanges").doc(exchangeId).get()
  const data = exchangeSnap.data()
  
  if (!data) return

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
