/**
 * LINE Notify Chat API Route
 * Send LINE notifications for chat messages and exchange status changes.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { notifyNewChatMessage, notifyExchangeStatusChange } from "@/lib/line"
import { getAdminDb, verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569-wwn2.vercel.app"

const exchangeStatusSchema = z.enum([
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
  "rejected",
])

const notifyChatBodySchema = z
  .object({
    type: z.enum(["chat", "status_change"]).optional(),
    recipientId: z.string().min(1).optional(),
    recipientUserId: z.string().min(1).optional(),
    senderName: z.string().max(100).optional(),
    itemTitle: z.string().max(200).optional(),
    messagePreview: z.string().max(500).optional(),
    exchangeId: z.string().min(1),
    status: exchangeStatusSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.recipientId && !value.recipientUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recipientId"],
        message: "recipientId or recipientUserId is required",
      })
    }

    const notificationType = value.type ?? "chat"
    if (notificationType === "status_change") {
      if (!value.status) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["status"],
          message: "status is required when type is status_change",
        })
      }
      if (!value.itemTitle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["itemTitle"],
          message: "itemTitle is required when type is status_change",
        })
      }
    }
  })

export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get("Authorization"))
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = await verifyIdToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const bodyRaw = await request.json().catch(() => null)
    const parsed = notifyChatBodySchema.safeParse(bodyRaw)
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
    const recipientId = body.recipientId || body.recipientUserId
    const notificationType = body.type || "chat"
    console.log("[LINE Notify Chat] Body:", body)

    const db = getAdminDb()
    const exchangeSnap = await db.collection("exchanges").doc(body.exchangeId).get()
    if (!exchangeSnap.exists) {
      return NextResponse.json({ sent: false, reason: "exchange not found" })
    }

    const exchange = exchangeSnap.data() as
      | {
          ownerId?: string
          requesterId?: string
        }
      | undefined
    const ownerId = exchange?.ownerId
    const requesterId = exchange?.requesterId

    if (!ownerId || !requesterId) {
      return NextResponse.json({ sent: false, reason: "invalid exchange" }, { status: 400 })
    }

    // Caller must be a participant.
    if (decoded.uid !== ownerId && decoded.uid !== requesterId) {
      return NextResponse.json({ sent: false, reason: "forbidden" }, { status: 403 })
    }

    // Recipient must be the other party.
    const allowedRecipient = decoded.uid === ownerId ? requesterId : ownerId
    if (recipientId !== allowedRecipient) {
      return NextResponse.json({ sent: false, reason: "forbidden" }, { status: 403 })
    }

    const userSnap = await db.collection("users").doc(recipientId).get()
    if (!userSnap.exists) {
      console.log("[LINE Notify Chat] User not found")
      return NextResponse.json({ sent: false, reason: "user not found" })
    }

    const userData = userSnap.data() as
      | {
          lineUserId?: string
          lineNotifications?: {
            enabled?: boolean
            statusChange?: boolean
            exchangeStatus?: boolean
            chatMessage?: boolean
          }
        }
      | undefined
    const lineUserId = userData?.lineUserId
    const notificationsEnabled = userData?.lineNotifications?.enabled !== false

    console.log("[LINE Notify Chat] User LINE status:", {
      hasLineId: !!lineUserId,
      notificationsEnabled,
      type: notificationType,
    })

    if (!lineUserId) {
      console.log("[LINE Notify Chat] User has no LINE linked")
      return NextResponse.json({ sent: false, reason: "no LINE linked" })
    }

    if (!notificationsEnabled) {
      return NextResponse.json({ sent: false, reason: "notifications disabled" })
    }

    if (notificationType === "status_change") {
      const statusChangeEnabled =
        userData?.lineNotifications?.statusChange ??
        userData?.lineNotifications?.exchangeStatus ??
        true

      if (!statusChangeEnabled) {
        return NextResponse.json({ sent: false, reason: "status change notifications disabled" })
      }

      await notifyExchangeStatusChange(
        lineUserId,
        body.itemTitle!,
        body.status!,
        body.exchangeId,
        BASE_URL
      )
    } else {
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
