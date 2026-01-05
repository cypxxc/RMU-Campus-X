/**
 * LINE Notify Item API Route
 * ส่ง LINE notification เมื่อโพสต์/แก้ไข/ลบสิ่งของ
 */

import { NextRequest, NextResponse } from "next/server"
import { notifyItemPosted, notifyItemUpdated, notifyItemDeleted } from "@/lib/line"

const FIREBASE_PROJECT = "resource-4e4fc"
const FIREBASE_API_KEY = "AIzaSyAhtR1jX2lycnS2xYLhiAtMAjn5dLOYAZM"
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569-wwn2.vercel.app"

interface NotifyItemBody {
  userId: string
  itemTitle: string
  itemId?: string
  action: "posted" | "updated" | "deleted"
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
    const body: NotifyItemBody = await request.json()
    console.log("[LINE Notify Item] Body:", body)

    const { userId, itemTitle, itemId, action } = body

    if (!userId || !itemTitle || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user has LINE notifications enabled
    const userDoc = await firestoreGet(`users/${userId}`)
    
    if (!userDoc?.fields) {
      console.log("[LINE Notify Item] User not found")
      return NextResponse.json({ sent: false, reason: "user not found" })
    }

    const lineUserId = userDoc.fields.lineUserId?.stringValue
    const notificationsEnabled = userDoc.fields.lineNotifications?.mapValue?.fields?.enabled?.booleanValue
    const itemNotificationsEnabled = userDoc.fields.lineNotifications?.mapValue?.fields?.itemPosted?.booleanValue ?? true // default to true

    console.log("[LINE Notify Item] User LINE status:", { 
      hasLineId: !!lineUserId, 
      notificationsEnabled, 
      itemNotificationsEnabled 
    })

    if (!lineUserId || !notificationsEnabled) {
      return NextResponse.json({ sent: false, reason: "notifications disabled" })
    }

    // Send LINE notification based on action
    switch (action) {
      case "posted":
        if (itemId) {
          await notifyItemPosted(lineUserId, itemTitle, itemId, BASE_URL)
        }
        break
      case "updated":
        if (itemId) {
          await notifyItemUpdated(lineUserId, itemTitle, itemId, BASE_URL)
        }
        break
      case "deleted":
        await notifyItemDeleted(lineUserId, itemTitle)
        break
    }

    console.log("[LINE Notify Item] Sent successfully!")
    return NextResponse.json({ sent: true })
  } catch (error) {
    console.error("[LINE Notify Item] Error:", error)
    return NextResponse.json({ sent: false, error: String(error) })
  }
}
