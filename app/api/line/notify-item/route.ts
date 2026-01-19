/**
 * LINE Notify Item API Route
 * ส่ง LINE notification เมื่อโพสต์/แก้ไข/ลบสิ่งของ
 */

import { NextRequest, NextResponse } from "next/server"
import { notifyItemPosted, notifyItemUpdated, notifyItemDeleted } from "@/lib/line"
import { getAdminDb, verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"
import { isAdmin } from "@/lib/admin-auth"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569-wwn2.vercel.app"

interface NotifyItemBody {
  userId: string
  itemTitle: string
  itemId?: string
  action: "posted" | "updated" | "deleted"
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const token = extractBearerToken(request.headers.get("Authorization"))
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const body: NotifyItemBody = await request.json()
    console.log("[LINE Notify Item] Body:", body)

    const { userId, itemTitle, itemId, action } = body

    if (!userId || !itemTitle || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Only allow self notification, unless admin
    if (decoded.uid !== userId) {
      if (!decoded.email) {
        return NextResponse.json({ sent: false, reason: "forbidden" }, { status: 403 })
      }
      const allowed = await isAdmin(decoded.email)
      if (!allowed) {
        return NextResponse.json({ sent: false, reason: "forbidden" }, { status: 403 })
      }
    }

    // Check if user has LINE notifications enabled
    const db = getAdminDb()
    const userSnap = await db.collection("users").doc(userId).get()

    if (!userSnap.exists) {
      console.log("[LINE Notify Item] User not found")
      return NextResponse.json({ sent: false, reason: "user not found" })
    }

    const userData = userSnap.data() as any
    const lineUserId = userData?.lineUserId as string | undefined
    // Default to true if not explicitly set
    const notificationsEnabled = userData?.lineNotifications?.enabled !== false
    const itemNotificationsEnabled = userData?.lineNotifications?.itemPosted !== false

    console.log("[LINE Notify Item] User LINE status:", { 
      hasLineId: !!lineUserId, 
      notificationsEnabled, 
      itemNotificationsEnabled 
    })

    if (!lineUserId) {
      console.log("[LINE Notify Item] User has no LINE linked")
      return NextResponse.json({ sent: false, reason: "no LINE linked" })
    }
    
    if (!notificationsEnabled) {
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
