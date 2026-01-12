/**
 * LINE Notify Chat API Route
 * ส่ง LINE notification เมื่อมีข้อความแชทใหม่ หรือ สถานะเปลี่ยน
 */

import { NextRequest, NextResponse } from "next/server"
import { notifyNewChatMessage, notifyExchangeStatusChange } from "@/lib/line"
import type { ExchangeStatus } from "@/types"
import { verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"

const FIREBASE_PROJECT = "resource-4e4fc"
const FIREBASE_API_KEY = "AIzaSyAhtR1jX2lycnS2xYLhiAtMAjn5dLOYAZM"
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

async function firestoreGet(documentPath: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${documentPath}?key=${FIREBASE_API_KEY}`
  
  const response = await fetch(url)
  if (!response.ok) {
    return null
  }
  
  return response.json()
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

    // Check if recipient has LINE notifications enabled
    const userDoc = await firestoreGet(`users/${recipientId}`)
    
    if (!userDoc?.fields) {
      console.log("[LINE Notify Chat] User not found")
      return NextResponse.json({ sent: false, reason: "user not found" })
    }

    const lineUserId = userDoc.fields.lineUserId?.stringValue
    // Default to true if not explicitly set
    const notificationsEnabled = userDoc.fields.lineNotifications?.mapValue?.fields?.enabled?.booleanValue ?? true

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
      const statusChangeEnabled = userDoc.fields.lineNotifications?.mapValue?.fields?.statusChange?.booleanValue ?? true
      
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
      const chatNotificationsEnabled = userDoc.fields.lineNotifications?.mapValue?.fields?.chatMessage?.booleanValue ?? true
      
      if (!chatNotificationsEnabled) {
        return NextResponse.json({ sent: false, reason: "chat notifications disabled" })
      }

      if (!body.exchangeId) {
        return NextResponse.json({ error: "Missing exchangeId" }, { status: 400 })
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
