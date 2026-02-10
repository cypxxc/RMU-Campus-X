/**
 * Respond to Exchange API
 * Owner accepts/rejects a pending exchange.
 * Phase flow: pending -> in_progress -> completed
 */

import { NextResponse } from "next/server"
import { withValidation, type ValidationContext } from "@/lib/api-validation"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { respondExchangeSchema } from "@/lib/schemas"
import { validateTransition } from "@/lib/exchange-state-machine"
import type { ExchangeStatus } from "@/types"

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
        const exchangeRef = db.collection("exchanges").doc(exchangeId)
        const exchangeDoc = await transaction.get(exchangeRef)

        if (!exchangeDoc.exists) {
          throw new Error("ไม่พบการแลกเปลี่ยนที่ต้องการ")
        }

        const exchangeData = exchangeDoc.data()
        const currentStatus = exchangeData?.status as ExchangeStatus

        if (exchangeData?.ownerId !== userId) {
          throw new Error("เฉพาะเจ้าของสิ่งของเท่านั้นที่สามารถตอบรับ/ปฏิเสธได้")
        }

        const newStatus: ExchangeStatus = action === "accept" ? "in_progress" : "rejected"
        const transitionError = validateTransition(currentStatus, newStatus)
        if (transitionError) {
          throw new Error(transitionError)
        }

        const itemId = exchangeData?.itemId

        if (action === "accept") {
          transaction.update(exchangeRef, {
            status: "in_progress",
            ownerConfirmed: false,
            requesterConfirmed: false,
            updatedAt: FieldValue.serverTimestamp(),
          })
          return
        }

        transaction.update(exchangeRef, {
          status: "rejected",
          updatedAt: FieldValue.serverTimestamp(),
        })

        const itemRef = db.collection("items").doc(itemId)
        transaction.update(itemRef, {
          status: "available",
          updatedAt: FieldValue.serverTimestamp(),
        })
      })

      notifyRequester(exchangeId, action).catch((err) => {
        console.error("[RespondExchange] Notification error:", err)
      })

      return NextResponse.json({
        success: true,
        data: { action },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"

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
  { requireAuth: true, requireTermsAccepted: true }
)

async function notifyRequester(exchangeId: string, action: "accept" | "reject"): Promise<void> {
  const db = getAdminDb()
  const exchangeSnap = await db.collection("exchanges").doc(exchangeId).get()
  const data = exchangeSnap.data()

  if (!data) return

  const title = action === "accept" ? "เริ่มดำเนินการแล้ว" : "คำขอถูกปฏิเสธ"
  const message =
    action === "accept"
      ? `เจ้าของสิ่งของ "${data.itemTitle}" ได้เริ่มดำเนินการแล้ว`
      : `เจ้าของสิ่งของ "${data.itemTitle}" ได้ปฏิเสธคำขอของคุณ`

  await db.collection("notifications").add({
    userId: data.requesterId,
    title,
    message,
    type: "exchange",
    relatedId: exchangeId,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  })
}
