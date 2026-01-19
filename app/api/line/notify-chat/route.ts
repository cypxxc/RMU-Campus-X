/**
 * LINE Notify Chat API Route
 * ส่ง LINE notification เมื่อมีข้อความแชทใหม่ หรือ สถานะเปลี่ยน
 */

import { NextRequest, NextResponse } from "next/server"
import { notifyNewChatMessage, notifyExchangeStatusChange } from "@/lib/line"
import type { ExchangeStatus } from "@/types"
import { getAdminDb, verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569-wwn2.vercel.app"

interface NotifyChatBody {
  type?: 'chat' | 'status_change'
  recipientId?: string
  recipientUserId?: string // alias
  senderName?: string
  itemTitle?: string
  messagePreview?: string
  exchangeId?: string
  status?: ExchangeStatus
}

export async function POST(request: NextRequest) {
  try {
    // Verify Authentication
    const token = extractBearerToken(request.headers.get("Authorization"))
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const decoded = await verifyIdToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body: NotifyChatBody = await request.json()
    console.log("[LINE Notify Chat] Body:", body)

    const recipientId = body.recipientId || body.recipientUserId
    const notificationType = body.type || 'chat'

    if (!recipientId) {
      return NextResponse.json({ error: "Missing recipientId" }, { status: 400 })
    }

    if (!body.exchangeId) {
      return NextResponse.json({ error: "Missing exchangeId" }, { status: 400 })
    }

    const db = getAdminDb()
    const exchangeSnap = await db.collection("exchanges").doc(body.exchangeId).get()
    if (!exchangeSnap.exists) {
      return NextResponse.json({ sent: false, reason: "exchange not found" })
    }

    const exchange = exchangeSnap.data() as any
    const ownerId = exchange?.ownerId as string | undefined
    const requesterId = exchange?.requesterId as string | undefined

    if (!ownerId || !requesterId) {
      return NextResponse.json({ sent: false, reason: "invalid exchange" }, { status: 400 })
    }

    // Caller must be a participant
    if (decoded.uid !== ownerId && decoded.uid !== requesterId) {
      return NextResponse.json({ sent: false, reason: "forbidden" }, { status: 403 })
    }

    // Recipient must be the other party
    const allowedRecipient = decoded.uid === ownerId ? requesterId : ownerId
    if (recipientId !== allowedRecipient) {
      return NextResponse.json({ sent: false, reason: "forbidden" }, { status: 403 })
    }

    // Check if recipient has LINE notifications enabled
    const userSnap = await db.collection("users").doc(recipientId).get()

    if (!userSnap.exists) {
      console.log("[LINE Notify Chat] User not found")
      return NextResponse.json({ sent: false, reason: "user not found" })
    }

    const userData = userSnap.data() as any
    const lineUserId = userData?.lineUserId as string | undefined
    // Default to true if not explicitly set
    const notificationsEnabled = userData?.lineNotifications?.enabled !== false

    console.log("[LINE Notify Chat] User LINE status:", { 
      hasLineId: !!lineUserId, 
      notificationsEnabled,
      type: notificationType
    })

    if (!lineUserId) {
      console.log("[LINE Notify Chat] User has no LINE linked")
      return NextResponse.json({ sent: false, reason: "no LINE linked" })
    }
    
    if (!notificationsEnabled) {
      return NextResponse.json({ sent: false, reason: "notifications disabled" })
    }

    // Handle different notification types
    if (notificationType === 'status_change') {
      // Check statusChange notification setting
      const statusChangeEnabled =
        userData?.lineNotifications?.statusChange ??
        userData?.lineNotifications?.exchangeStatus ??
        true
      
      if (!statusChangeEnabled) {
        return NextResponse.json({ sent: false, reason: "status change notifications disabled" })
      }

      if (!body.itemTitle || !body.status || !body.exchangeId) {
        return NextResponse.json({ error: "Missing status change fields" }, { status: 400 })
      }

      await notifyExchangeStatusChange(
        lineUserId,
        body.itemTitle,
        body.status,
        body.exchangeId,
        BASE_URL
      )
    } else {
      // Default: chat message notification
      const chatNotificationsEnabled = userData?.lineNotifications?.chatMessage ?? true
      
      if (!chatNotificationsEnabled) {
        return NextResponse.json({ sent: false, reason: "chat notifications disabled" })
      }

      await notifyNewChatMessage(
        lineUserId,
        body.senderName || "ผู้ใช้",
        body.itemTitle || "การแลกเปลี่ยน",
        body.messagePreview || "",
        body.exchangeId,
        BASE_URL
      )
    }

    console.log("[LINE Notify Chat] Sent successfully!")
    return NextResponse.json({ sent: true })
  } catch (error) {
    console.error("[LINE Notify Chat] Error:", error)
    return NextResponse.json({ sent: false, error: String(error) })
  }
}
