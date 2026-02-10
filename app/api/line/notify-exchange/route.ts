/**
 * LINE Notify Exchange API Route
 * Send LINE notification when someone requests an exchange.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { notifyExchangeRequest } from "@/lib/line"
import { getAdminDb, verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569-wwn2.vercel.app"

const notifyExchangeBodySchema = z
  .object({
    exchangeId: z.string().min(1),
    ownerId: z.string().min(1).optional(),
    itemTitle: z.string().max(200).optional(),
    requesterName: z.string().max(100).optional(),
  })
  .strict()

export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get("Authorization"))
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = await verifyIdToken(token, true)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const bodyRaw = await request.json().catch(() => null)
    const parsed = notifyExchangeBodySchema.safeParse(bodyRaw)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.errors.map((issue) => ({
            field: issue.path.join(".") || "root",
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const body = parsed.data
    const exchangeId = body.exchangeId
    const db = getAdminDb()
    const exchangeSnap = await db.collection("exchanges").doc(exchangeId).get()
    if (!exchangeSnap.exists) {
      return NextResponse.json({ sent: false, reason: "exchange not found" })
    }

    const exchange = exchangeSnap.data() as
      | {
          ownerId?: string
          requesterId?: string
          requesterName?: string
          itemTitle?: string
          itemId?: string
        }
      | undefined
    const ownerId = exchange?.ownerId
    const requesterId = exchange?.requesterId

    // Only requester can trigger the "request created" notification.
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

    const owner = ownerSnap.data() as
      | {
          lineUserId?: string
          lineNotifications?: {
            enabled?: boolean
            exchangeRequest?: boolean
          }
        }
      | undefined
    const lineUserId = owner?.lineUserId
    const notificationsEnabled = owner?.lineNotifications?.enabled !== false
    const exchangeRequestEnabled = owner?.lineNotifications?.exchangeRequest !== false

    console.log("[LINE Notify Exchange] Owner LINE status:", {
      hasLineId: !!lineUserId,
      notificationsEnabled,
      exchangeRequestEnabled,
    })

    if (!lineUserId) {
      console.log("[LINE Notify Exchange] Owner has no LINE linked")
      return NextResponse.json({ sent: false, reason: "no LINE linked" })
    }

    if (!notificationsEnabled || !exchangeRequestEnabled) {
      return NextResponse.json({ sent: false, reason: "notifications disabled" })
    }

    const itemTitle = exchange?.itemTitle || body.itemTitle || "สิ่งของ"
    const requesterName =
      body.requesterName ||
      exchange?.requesterName ||
      (decoded.email ? decoded.email.split("@")[0] : "ผู้ใช้") ||
      "ผู้ใช้"

    let itemImage: string | undefined
    const itemId = exchange?.itemId
    if (itemId) {
      const itemSnap = await db.collection("items").doc(itemId).get()
      const itemData = itemSnap.data() as
        | {
            imagePublicIds?: string[]
            imageUrls?: string[]
            imageUrl?: string
          }
        | undefined
      const ref = itemData?.imagePublicIds?.[0] ?? itemData?.imageUrls?.[0] ?? itemData?.imageUrl
      if (ref) {
        const { resolveImageUrl } = await import("@/lib/cloudinary-url")
        itemImage = resolveImageUrl(ref)
      }
    }

    await notifyExchangeRequest(
      lineUserId,
      itemTitle,
      requesterName,
      exchangeId,
      BASE_URL,
      itemImage
    )

    console.log("[LINE Notify Exchange] Sent successfully!")
    return NextResponse.json({ sent: true })
  } catch (error) {
    console.error("[LINE Notify Exchange] Error:", error)
    // Notification failure should not break the main user flow.
    return NextResponse.json({ sent: false, error: String(error) })
  }
}
