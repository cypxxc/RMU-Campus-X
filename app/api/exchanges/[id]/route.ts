/**
 * Exchange Status API Route
 * อัปเดตสถานะ Exchange พร้อมส่ง LINE Notification
 */

import { NextRequest, NextResponse } from "next/server"
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { notifyExchangeStatusChange, notifyExchangeCompleted } from "@/lib/line"
import type { Exchange, ExchangeStatus, User } from "@/types"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

interface UpdateStatusBody {
  status: ExchangeStatus
  userId: string  // User making the change
  reason?: string // For cancellation
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: exchangeId } = await params
    const body: UpdateStatusBody = await request.json()
    const { status, userId, reason } = body

    if (!exchangeId || !status || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const db = getFirebaseDb()
    const exchangeRef = doc(db, "exchanges", exchangeId)
    const exchangeDoc = await getDoc(exchangeRef)

    if (!exchangeDoc.exists()) {
      return NextResponse.json(
        { error: "Exchange not found" },
        { status: 404 }
      )
    }

    const exchangeData = exchangeDoc.data() as Exchange
    const previousStatus = exchangeData.status

    // Build update object
    const updateData: Record<string, any> = {
      status,
      updatedAt: serverTimestamp(),
    }

    if (status === "cancelled" && reason) {
      updateData.cancelReason = reason
      updateData.cancelledBy = userId
      updateData.cancelledAt = serverTimestamp()
    }

    // Update exchange
    await updateDoc(exchangeRef, updateData)

    console.log(`[Exchange Status] ${exchangeId}: ${previousStatus} → ${status}`)

    // Determine who to notify
    const isOwner = userId === exchangeData.ownerId
    const targetUserId = isOwner ? exchangeData.requesterId : exchangeData.ownerId

    // Create in-app notification
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
      await addDoc(collection(db, "notifications"), {
        userId: targetUserId,
        title: notificationTitle,
        message: notificationMessage,
        type: "exchange",
        relatedId: exchangeId,
        isRead: false,
        createdAt: serverTimestamp(),
      })

      // For completed status, notify both parties
      if (status === "completed") {
        await addDoc(collection(db, "notifications"), {
          userId: exchangeData.ownerId,
          title: notificationTitle,
          message: notificationMessage,
          type: "exchange",
          relatedId: exchangeId,
          isRead: false,
          createdAt: serverTimestamp(),
        })
      }
    }

    // ============ LINE Notifications ============
    // Get target user's LINE settings
    const targetUserRef = doc(db, "users", targetUserId)
    const targetUserDoc = await getDoc(targetUserRef)

    if (targetUserDoc.exists()) {
      const targetUserData = targetUserDoc.data() as User

      if (
        targetUserData.lineUserId &&
        targetUserData.lineNotifications?.enabled
      ) {
        // Check specific notification type
        if (status === "completed" && targetUserData.lineNotifications.exchangeComplete) {
          // Notify target user
          await notifyExchangeCompleted(
            targetUserData.lineUserId,
            exchangeData.itemTitle
          )

          // Also notify the other party (owner) if they have LINE enabled
          if (status === "completed") {
            const ownerRef = doc(db, "users", exchangeData.ownerId)
            const ownerDoc = await getDoc(ownerRef)
            
            if (ownerDoc.exists()) {
              const ownerData = ownerDoc.data() as User
              if (
                ownerData.lineUserId &&
                ownerData.lineNotifications?.enabled &&
                ownerData.lineNotifications.exchangeComplete
              ) {
                await notifyExchangeCompleted(
                  ownerData.lineUserId,
                  exchangeData.itemTitle
                )
              }
            }
          }
        } else if (targetUserData.lineNotifications.exchangeStatus) {
          // Send status change notification
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Get exchange details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: exchangeId } = await params

    if (!exchangeId) {
      return NextResponse.json(
        { error: "Missing exchange ID" },
        { status: 400 }
      )
    }

    const db = getFirebaseDb()
    const exchangeRef = doc(db, "exchanges", exchangeId)
    const exchangeDoc = await getDoc(exchangeRef)

    if (!exchangeDoc.exists()) {
      return NextResponse.json(
        { error: "Exchange not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      exchange: {
        id: exchangeDoc.id,
        ...exchangeDoc.data(),
      },
    })
  } catch (error) {
    console.error("[Exchange Status] GET Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
