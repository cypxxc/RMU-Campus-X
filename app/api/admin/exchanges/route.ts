/**
 * Admin API – รายการการแลกเปลี่ยน
 * GET /api/admin/exchanges?status=completed&limit=50&lastId=xxx
 * ต้องเป็น admin เท่านั้น
 */

import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from "@/lib/admin-api"

const VALID_STATUSES = ["pending", "accepted", "in_progress", "completed", "cancelled", "rejected"]

export async function GET(request: NextRequest) {
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const db = getAdminDb()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)))
    const lastId = searchParams.get("lastId") ?? null

    const coll = db.collection("exchanges")
    let q =
      status && VALID_STATUSES.includes(status)
        ? coll.where("status", "==", status).orderBy("createdAt", "desc").limit(limit + 1)
        : coll.orderBy("createdAt", "desc").limit(limit + 1)
    if (lastId) {
      const cursorSnap = await db.collection("exchanges").doc(lastId).get()
      if (cursorSnap.exists) {
        q = status && VALID_STATUSES.includes(status)
          ? coll.where("status", "==", status).orderBy("createdAt", "desc").startAfter(cursorSnap).limit(limit + 1)
          : coll.orderBy("createdAt", "desc").startAfter(cursorSnap).limit(limit + 1)
      }
    }
    const snapshot = await q.get()
    const docs = snapshot.docs
    const hasMore = docs.length > limit
    const list = (hasMore ? docs.slice(0, limit) : docs).map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() ?? null,
      updatedAt: d.data().updatedAt?.toDate?.()?.toISOString?.() ?? null,
    }))
    const nextLastId = hasMore && list.length ? list[list.length - 1]?.id : null

    return successResponse({
      exchanges: list,
      hasMore,
      lastId: nextLastId ?? undefined,
    })
  } catch (err) {
    console.error("[Admin] GET exchanges error:", err)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      err instanceof Error ? err.message : "โหลดรายการไม่สำเร็จ",
      500
    )
  }
}
