/**
 * LINE Notify Exchange API Route
 * ส่ง LINE notification เมื่อมีคนขอแลกเปลี่ยนสิ่งของ
 * ใช้ Firebase REST API (ไม่ต้อง auth token)
 */

import { NextRequest, NextResponse } from "next/server"
import { notifyExchangeRequest } from "@/lib/line"
import { getAdminDb, verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569-wwn2.vercel.app"

interface NotifyExchangeBody {
  ownerId: string
  itemTitle: string
  requesterName: string
  exchangeId: string
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication (prevents anonymous spam)
    const token = extractBearerToken(request.headers.get("Authorization"))
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = await verifyIdToken(token, true)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = (await request.json()) as Partial<NotifyExchangeBody>
    const exchangeId = body.exchangeId

    if (!exchangeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = getAdminDb()
    const exchangeSnap = await db.collection("exchanges").doc(exchangeId).get()
    if (!exchangeSnap.exists) {
      return NextResponse.json({ sent: false, reason: "exchange not found" })
    }

    const exchange = exchangeSnap.data() as any
    const ownerId = exchange?.ownerId as string | undefined
    const requesterId = exchange?.requesterId as string | undefined

    // Only requester can trigger the "request created" notification
    if (!requesterId || decoded.uid !== requesterId) {
      return NextResponse.json({ sent: false, reason: "forbidden" }, { status: 403 })
    }

    if (!ownerId) {
      return NextResponse.json({ sent: false, reason: "owner missing" })
    }

    const ownerSnap = await db.collection("users").doc(ownerId).get()
    if (!ownerSnap.exists) {
      console.log("[LINE Notify Exchange] Owner not found")
      return NextResponse.json({ sent: false, reason: "owner not found" })
    }

    const owner = ownerSnap.data() as any
    const lineUserId = owner?.lineUserId as string | undefined
    // Default to true if not explicitly set
    const notificationsEnabled = owner?.lineNotifications?.enabled !== false
    const exchangeRequestEnabled = owner?.lineNotifications?.exchangeRequest !== false

    console.log("[LINE Notify Exchange] Owner LINE status:", { 
      hasLineId: !!lineUserId, 
      notificationsEnabled, 
      exchangeRequestEnabled 
    })

    if (!lineUserId) {
      console.log("[LINE Notify Exchange] Owner has no LINE linked")
      return NextResponse.json({ sent: false, reason: "no LINE linked" })
    }
    const ownerLineUserId: string = lineUserId

    if (!notificationsEnabled || !exchangeRequestEnabled) {
      return NextResponse.json({ sent: false, reason: "notifications disabled" })
    }

    const itemTitle = (exchange?.itemTitle as string | undefined) || body.itemTitle || "สิ่งของ"
    const requesterName =
      body.requesterName ||
      (exchange?.requesterName as string | undefined) ||
      (decoded.email ? decoded.email.split("@")[0] : "ผู้ใช้")

    let itemImage: string | undefined
    const itemId = exchange?.itemId as string | undefined
    if (itemId) {
      const itemSnap = await db.collection("items").doc(itemId).get()
      const itemData = itemSnap.data() as { imageUrls?: string[]; imageUrl?: string } | undefined
      itemImage = itemData?.imageUrls?.[0] ?? itemData?.imageUrl
    }

    await notifyExchangeRequest(
      ownerLineUserId,
      itemTitle ?? "",
      requesterName ?? "",
      exchangeId,
      BASE_URL,
      itemImage ?? undefined
    )

    console.log("[LINE Notify Exchange] Sent successfully!")
    return NextResponse.json({ sent: true })
  } catch (error) {
    console.error("[LINE Notify Exchange] Error:", error)
    // Don't return 500 - LINE notification failure shouldn't break the flow
    return NextResponse.json({ sent: false, error: String(error) })
  }
}
