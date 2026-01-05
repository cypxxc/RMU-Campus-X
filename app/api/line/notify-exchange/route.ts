/**
 * LINE Notify Exchange API Route
 * ส่ง LINE notification เมื่อมีคนขอแลกเปลี่ยนสิ่งของ
 * ใช้ Firebase REST API (ไม่ต้อง auth token)
 */

import { NextRequest, NextResponse } from "next/server"
import { sendPushMessage } from "@/lib/line"

const FIREBASE_PROJECT = "resource-4e4fc"
const FIREBASE_API_KEY = "AIzaSyAhtR1jX2lycnS2xYLhiAtMAjn5dLOYAZM"
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569-wwn2.vercel.app"

interface NotifyExchangeBody {
  ownerId: string
  itemTitle: string
  requesterName: string
  exchangeId: string
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
    const body: NotifyExchangeBody = await request.json()
    console.log("[LINE Notify Exchange] Body:", body)

    const { ownerId, itemTitle, requesterName, exchangeId } = body

    if (!ownerId || !exchangeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if owner has LINE notifications enabled
    const ownerDoc = await firestoreGet(`users/${ownerId}`)
    
    if (!ownerDoc?.fields) {
      console.log("[LINE Notify Exchange] Owner not found")
      return NextResponse.json({ sent: false, reason: "owner not found" })
    }

    const lineUserId = ownerDoc.fields.lineUserId?.stringValue
    const notificationsEnabled = ownerDoc.fields.lineNotifications?.mapValue?.fields?.enabled?.booleanValue
    const exchangeRequestEnabled = ownerDoc.fields.lineNotifications?.mapValue?.fields?.exchangeRequest?.booleanValue

    console.log("[LINE Notify Exchange] Owner LINE status:", { 
      hasLineId: !!lineUserId, 
      notificationsEnabled, 
      exchangeRequestEnabled 
    })

    if (!lineUserId || !notificationsEnabled || !exchangeRequestEnabled) {
      return NextResponse.json({ sent: false, reason: "notifications disabled" })
    }

    // Send LINE notification
    await sendPushMessage(lineUserId, [
      {
        type: "text",
        text: `📦 มีคนขอรับสิ่งของของคุณ!

🏷️ ${itemTitle}
👤 จาก: ${requesterName}

🔗 ดูรายละเอียด:
${BASE_URL}/chat/${exchangeId}`,
      },
    ])

    console.log("[LINE Notify Exchange] Sent successfully!")
    return NextResponse.json({ sent: true })
  } catch (error) {
    console.error("[LINE Notify Exchange] Error:", error)
    // Don't return 500 - LINE notification failure shouldn't break the flow
    return NextResponse.json({ sent: false, error: String(error) })
  }
}
