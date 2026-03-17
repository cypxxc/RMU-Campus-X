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

class CancelExchangeController {
  async post(request: NextRequest) {
    try {
      const token = getAuthToken(request)
      if (!token) {
        return ApiErrors.unauthorized("Missing authentication token")
      }

      const decodedToken = await verifyIdToken(token, true)
      if (!decodedToken) {
        return ApiErrors.unauthorized("Invalid authentication token")
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return ApiErrors.badRequest("Invalid JSON body")
      }

      const validation = cancelExchangeSchema.safeParse(body)
      if (!validation.success) {
        const errors = validation.error.errors.map((e) => e.message).join(", ")
        return ApiErrors.badRequest(`Validation failed: ${errors}`)
      }

      const { exchangeId, reason } = validation.data
      const userId = decodedToken.uid

      const db = getAdminDb()

      await db.runTransaction(async (transaction) => {
        const exchangeRef = db.collection("exchanges").doc(exchangeId)
        const exchangeDoc = await transaction.get(exchangeRef)

        if (!exchangeDoc.exists) {
          throw new Error("Exchange not found")
        }

        const exchangeData = exchangeDoc.data()
        const currentStatus = exchangeData?.status as ExchangeStatus

        if (isTerminalStatus(currentStatus)) {
          throw new Error(`Cannot cancel: exchange is already ${currentStatus}`)
        }

        const transitionError = validateTransition(currentStatus, "cancelled")
        if (transitionError) {
          throw new Error(transitionError)
        }

        const itemId = exchangeData?.itemId

        const activeExchangesQuery = db
          .collection("exchanges")
          .where("itemId", "==", itemId)
          .where("status", "in", ["pending", "accepted", "in_progress"])

        const activeSnapshot = await transaction.get(activeExchangesQuery)
        const activeDocs = activeSnapshot.docs.filter((d) => d.id !== exchangeId)
        const otherActiveCount = activeDocs.length

        transaction.update(exchangeRef, {
          status: "cancelled",
          cancelReason: reason || "Not specified",
          cancelledBy: userId,
          cancelledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })

        if (otherActiveCount === 0) {
          const itemRef = db.collection("items").doc(itemId)
          transaction.update(itemRef, {
            status: "available",
            updatedAt: FieldValue.serverTimestamp(),
          })
        }
      })

      const docSnap = await db.collection("exchanges").doc(exchangeId).get()
      const data = docSnap.data()

      if (data) {
        const targetUserId = data.requesterId === userId ? data.ownerId : data.requesterId
        const cancelReason = (data.cancelReason as string) || ""
        const message = cancelReason
          ? `การแลกเปลี่ยน "${data.itemTitle || "สิ่งของ"}" ถูกยกเลิก. เหตุผล: ${cancelReason}`
          : `การแลกเปลี่ยน "${data.itemTitle || "สิ่งของ"}" ถูกยกเลิก`
        await db.collection("notifications").add({
          userId: targetUserId,
          title: "รายการถูกยกเลิก",
          message,
          type: "exchange",
          relatedId: exchangeId,
          createdAt: FieldValue.serverTimestamp(),
          isRead: false,
        })
      }

      return successResponse({ success: true })
    } catch (error: unknown) {
      console.error("[CancelExchange] Error:", error)
      const message = error instanceof Error ? error.message : "Unknown error"
      return ApiErrors.internalError(message)
    }
  }
}

const controller = new CancelExchangeController()

export async function POST(request: NextRequest) {
  return controller.post(request)
}
