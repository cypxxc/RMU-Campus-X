/**
 * Exchange Status API Route
 * อัปเดตสถานะ Exchange พร้อมส่ง LINE Notification
 * ✅ Auth required, userId from token only, participant check, state machine
 */

import { NextRequest, NextResponse } from "next/server"

/** ปิด cache เพื่อให้หน้าแชทได้สถานะล่าสุดหลังเจ้าของกดตอบรับ */
export const dynamic = "force-dynamic"
import { getAdminDb, verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { notifyExchangeStatusChange, notifyExchangeCompleted } from "@/lib/line"
import { ApiErrors, getAuthToken } from "@/lib/api-response"
import { validateTransition } from "@/lib/exchange-state-machine"
import type { Exchange, ExchangeStatus, User } from "@/types"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

interface UpdateStatusBody {
  status: ExchangeStatus
  reason?: string // For cancellation
}

function isParticipant(exchange: Exchange, userId: string): boolean {
  return exchange.ownerId === userId || exchange.requesterId === userId
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getAuthToken(request) ?? extractBearerToken(request.headers.get("Authorization"))
    if (!token) {
      return ApiErrors.unauthorized("Authentication required")
    }
    const decoded = await verifyIdToken(token, true)
    if (!decoded) {
      return ApiErrors.invalidToken("Invalid or expired token")
    }
    const userId = decoded.uid

    const { id: exchangeId } = await params
    let body: UpdateStatusBody
    try {
      body = await request.json()
    } catch {
      return ApiErrors.badRequest("Invalid JSON body")
    }
    const { status, reason } = body

    if (!exchangeId || !status) {
      return NextResponse.json(
        { success: false, error: "Missing required fields", code: "MISSING_FIELDS" },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const exchangeRef = db.collection("exchanges").doc(exchangeId)
    const exchangeDoc = await exchangeRef.get()

    if (!exchangeDoc.exists) {
      return ApiErrors.notFound("Exchange not found")
    }

    const exchangeData = exchangeDoc.data() as Exchange
    const previousStatus = exchangeData.status

    if (!isParticipant(exchangeData, userId)) {
      return ApiErrors.forbidden("เฉพาะผู้เกี่ยวข้องกับการแลกเปลี่ยนเท่านั้นที่สามารถอัปเดตสถานะได้")
    }

    const transitionError = validateTransition(previousStatus, status)
    if (transitionError) {
      return NextResponse.json(
        { success: false, error: transitionError, code: "INVALID_TRANSITION" },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (status === "cancelled" && reason) {
      updateData.cancelReason = reason
      updateData.cancelledBy = userId
      updateData.cancelledAt = FieldValue.serverTimestamp()
    }

    await exchangeRef.update(updateData)

    console.log(`[Exchange Status] ${exchangeId}: ${previousStatus} → ${status}`)

    const isOwner = userId === exchangeData.ownerId
    const targetUserId = isOwner ? exchangeData.requesterId : exchangeData.ownerId

    let notificationTitle = ""
    let notificationMessage = ""
    switch (status) {
      case "accepted":
        notificationTitle = "รับคำขอแล้ว"
        notificationMessage = `เจ้าของสิ่งของ "ตกลง" แลกเปลี่ยน "${exchangeData.itemTitle}" กับคุณแล้ว`
        break
      case "rejected":
        notificationTitle = "คำขอถูกปฏิเสธ"
        notificationMessage = `เสียใจด้วย เจ้าของสิ่งของ "ปฏิเสธ" คำขอแลกเปลี่ยน "${exchangeData.itemTitle}"`
        break
      case "completed":
        notificationTitle = "การแลกเปลี่ยนเสร็จสิ้น"
        notificationMessage = `การแลกเปลี่ยน "${exchangeData.itemTitle}" สำเร็จเรียบร้อยแล้ว!`
        break
      case "cancelled":
        notificationTitle = "รายการถูกยกเลิก"
        notificationMessage = `การแลกเปลี่ยน "${exchangeData.itemTitle}" ถูกยกเลิกโดยอีกฝ่าย`
        break
      case "in_progress":
        notificationTitle = "กำลังดำเนินการ"
        notificationMessage = `การแลกเปลี่ยน "${exchangeData.itemTitle}" กำลังดำเนินการ`
        break
    }

    if (notificationTitle) {
      await db.collection("notifications").add({
        userId: targetUserId,
        title: notificationTitle,
        message: notificationMessage,
        type: "exchange",
        relatedId: exchangeId,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      })
      if (status === "completed") {
        await db.collection("notifications").add({
          userId: exchangeData.ownerId,
          title: notificationTitle,
          message: notificationMessage,
          type: "exchange",
          relatedId: exchangeId,
          isRead: false,
          createdAt: FieldValue.serverTimestamp(),
        })
      }
    }

    const targetUserDoc = await db.collection("users").doc(targetUserId).get()
    if (targetUserDoc.exists) {
      const targetUserData = targetUserDoc.data() as User
      if (targetUserData.lineUserId && targetUserData.lineNotifications?.enabled) {
        if (status === "completed" && targetUserData.lineNotifications.exchangeComplete) {
          await notifyExchangeCompleted(
            targetUserData.lineUserId,
            exchangeData.itemTitle
          )
          const ownerDoc = await db.collection("users").doc(exchangeData.ownerId).get()
          if (ownerDoc.exists) {
            const ownerData = ownerDoc.data() as User
            if (
              ownerData?.lineUserId &&
              ownerData?.lineNotifications?.enabled &&
              ownerData?.lineNotifications?.exchangeComplete
            ) {
              await notifyExchangeCompleted(ownerData.lineUserId, exchangeData.itemTitle)
            }
          }
        } else if (targetUserData.lineNotifications?.exchangeStatus) {
          await notifyExchangeStatusChange(
            targetUserData.lineUserId,
            exchangeData.itemTitle,
            status,
            exchangeId,
            BASE_URL
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Status updated successfully",
    })
  } catch (error) {
    console.error("[Exchange Status] Error:", error)
    return ApiErrors.internalError("Internal server error")
  }
}

const DELETABLE_STATUSES: ExchangeStatus[] = ["cancelled", "completed", "rejected"]

/** DELETE exchange และข้อความแชท – เฉพาะผู้เกี่ยวข้อง เมื่อสถานะยกเลิก/เสร็จ/ปฏิเสธ */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getAuthToken(request) ?? extractBearerToken(request.headers.get("Authorization"))
    if (!token) return ApiErrors.unauthorized("Authentication required")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.invalidToken("Invalid or expired token")
    const userId = decoded.uid

    const { id: exchangeId } = await params
    if (!exchangeId) {
      return NextResponse.json(
        { success: false, error: "Missing exchange ID", code: "MISSING_FIELDS" },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const exchangeRef = db.collection("exchanges").doc(exchangeId)
    const exchangeDoc = await exchangeRef.get()

    if (!exchangeDoc.exists) return ApiErrors.notFound("Exchange not found")

    const exchangeData = exchangeDoc.data() as Exchange
    if (!isParticipant(exchangeData, userId)) {
      return ApiErrors.forbidden("เฉพาะผู้เกี่ยวข้องกับการแลกเปลี่ยนเท่านั้นที่สามารถลบได้")
    }
    if (!DELETABLE_STATUSES.includes(exchangeData.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "ลบได้เฉพาะรายการที่ยกเลิก / เสร็จสิ้น / ปฏิเสธแล้ว",
          code: "INVALID_STATUS",
        },
        { status: 400 }
      )
    }

    const messagesSnap = await db
      .collection("chatMessages")
      .where("exchangeId", "==", exchangeId)
      .get()

    const batch = db.batch()
    messagesSnap.docs.forEach((d) => batch.delete(d.ref))
    batch.delete(exchangeRef)
    await batch.commit()

    return NextResponse.json({ success: true, message: "ลบเรียบร้อยแล้ว" })
  } catch (error) {
    console.error("[Exchange DELETE] Error:", error)
    return ApiErrors.internalError("Internal server error")
  }
}

/** GET exchange details – ต้องล็อกอินและเป็น owner หรือ requester เท่านั้น */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getAuthToken(request) ?? extractBearerToken(request.headers.get("Authorization"))
    if (!token) {
      return ApiErrors.unauthorized("Authentication required")
    }
    const decoded = await verifyIdToken(token, true)
    if (!decoded) {
      return ApiErrors.invalidToken("Invalid or expired token")
    }
    const userId = decoded.uid

    const { id: exchangeId } = await params
    if (!exchangeId) {
      return NextResponse.json(
        { success: false, error: "Missing exchange ID", code: "MISSING_FIELDS" },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const exchangeDoc = await db.collection("exchanges").doc(exchangeId).get()

    if (!exchangeDoc.exists) {
      return ApiErrors.notFound("Exchange not found")
    }

    const exchangeData = exchangeDoc.data() as Exchange
    if (!isParticipant(exchangeData, userId)) {
      return ApiErrors.forbidden("เฉพาะผู้เกี่ยวข้องกับการแลกเปลี่ยนเท่านั้นที่สามารถดูรายละเอียดได้")
    }

    const ts = (x: unknown) =>
      x && typeof (x as { toDate?: () => Date }).toDate === "function"
        ? (x as { toDate: () => Date }).toDate().toISOString()
        : x
    const out: Record<string, unknown> = { ...exchangeData, id: exchangeDoc.id }
    if (exchangeData.createdAt) out.createdAt = ts(exchangeData.createdAt)
    if (exchangeData.updatedAt) out.updatedAt = ts(exchangeData.updatedAt)
    if (exchangeData.cancelledAt) out.cancelledAt = ts((exchangeData as { cancelledAt?: unknown }).cancelledAt)

    return NextResponse.json({
      success: true,
      data: { exchange: out },
    })
  } catch (error) {
    console.error("[Exchange Status] GET Error:", error)
    return ApiErrors.internalError("Internal server error")
  }
}
