/**
 * Consistency Check API
 * Scans for logical inconsistencies in the database
 */

import { NextRequest } from "next/server"
import { successResponse, errorResponse, AdminErrorCode } from "@/lib/admin-api" // Using admin-api utils
import { verifyAdminAccess } from "@/lib/admin-api"
import { getAdminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  // 1. Verify Admin
  const auth = await verifyAdminAccess(request)
  if (!auth.authorized) {
    return auth.error!
  }

  try {
    const db = getAdminDb()
    const problems: any[] = []

    // CHECK 1: Items Stuck in 'pending' with no Active Exchange
    // Logic: If status is 'pending', there SHOULD be an exchange in [pending, accepted, in_progress]
    // linking to this itemId.

    const pendingItemsSnap = await db.collection("items").where("status", "==", "pending").get()
    const pendingItemIds = pendingItemsSnap.docs.map(d => d.id)

    if (pendingItemIds.length > 0) {
      // Chunking if too many (simple implementation for now)
      for (const itemId of pendingItemIds) {
        const exchangesSnap = await db.collection("exchanges")
          .where("itemId", "==", itemId)
          .where("status", "in", ["pending", "accepted", "in_progress"])
          .limit(1)
          .get()

        if (exchangesSnap.empty) {
          problems.push({
            type: "ORPHAN_LOCKED_ITEM",
            severity: "HIGH",
            details: `Item ${itemId} is pending but has no active exchange`,
            actionNeeded: "Reset item status to available",
            targetId: itemId,
            targetCollection: "items"
          })
        }
      }
    }

    // CHECK 2: Items 'available' but have Active Exchange
    // Logic: If there is an active exchange, item status MUST NOT be 'available'
    const activeExchangesSnap = await db.collection("exchanges")
      .where("status", "in", ["pending", "accepted", "in_progress"])
      .get()

    for (const exDoc of activeExchangesSnap.docs) {
      const data = exDoc.data()
      if (!data.itemId) continue

      const itemDoc = await db.collection("items").doc(data.itemId).get()
      if (itemDoc.exists && itemDoc.data()?.status === "available") { // Should be pending or similar
         problems.push({
            type: "INVALID_ITEM_STATE",
            severity: "MEDIUM",
            details: `Exchange ${exDoc.id} is active but item ${data.itemId} is available`,
            actionNeeded: "Set item status to pending",
            targetId: data.itemId,
            targetCollection: "items"
          })
      }
    }

    return successResponse({
      checkedAt: new Date().toISOString(),
      problemsFound: problems.length,
      problems
    })

  } catch (error: any) {
    console.error("[Consistency Check] Failed:", error)
    return errorResponse(AdminErrorCode.INTERNAL_ERROR, error.message, 500)
  }
}
