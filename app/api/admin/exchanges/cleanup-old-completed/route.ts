/**
 * Admin API – ลบการแลกเปลี่ยนที่สำเร็จแล้ว (ข้อมูลเก่าค้าง)
 * POST /api/admin/exchanges/cleanup-old-completed
 * Query: olderThanDays=365 (default) = ลบเฉพาะที่เก่ากว่า 1 ปี | olderThanDays=0 = ลบทั้งหมดที่ status completed
 * ต้องเป็น admin เท่านั้น
 */

import { NextRequest } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from "@/lib/admin-api"

const BATCH_LIMIT = 500

export async function POST(request: NextRequest) {
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const db = getAdminDb()
    const { searchParams } = new URL(request.url)
    const olderThanDays = Math.max(0, parseInt(searchParams.get("olderThanDays") ?? "365", 10))

    let snapshot
    if (olderThanDays === 0) {
      snapshot = await db.collection("exchanges").where("status", "==", "completed").get()
    } else {
      const cutoff = Timestamp.fromDate(new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000))
      snapshot = await db
        .collection("exchanges")
        .where("status", "==", "completed")
        .where("updatedAt", "<", cutoff)
        .get()
    }

    if (snapshot.empty) {
      return successResponse({ deleted: 0, message: "ไม่มีรายการเก่าที่ต้องลบ" })
    }

    const exchangeIds = snapshot.docs.map((d) => d.id)
    let opsInBatch = 0
    let batch = db.batch()
    const BATCH_LIMIT = 500

    for (const exchangeId of exchangeIds) {
      const messagesSnap = await db
        .collection("chatMessages")
        .where("exchangeId", "==", exchangeId)
        .get()
      for (const d of messagesSnap.docs) {
        batch.delete(d.ref)
        opsInBatch += 1
        if (opsInBatch >= BATCH_LIMIT) {
          await batch.commit()
          batch = db.batch()
          opsInBatch = 0
        }
      }
      batch.delete(db.collection("exchanges").doc(exchangeId))
      opsInBatch += 1
      if (opsInBatch >= BATCH_LIMIT) {
        await batch.commit()
        batch = db.batch()
        opsInBatch = 0
      }
    }

    if (opsInBatch > 0) {
      await batch.commit()
    }

    return successResponse({
      deleted: exchangeIds.length,
      details: `${exchangeIds.length} รายการการแลกเปลี่ยน (และแชทที่เกี่ยวข้อง) ถูกลบแล้ว`,
    })
  } catch (err) {
    console.error("[Admin] cleanup-old-completed error:", err)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      err instanceof Error ? err.message : "ลบข้อมูลไม่สำเร็จ",
      500
    )
  }
}
