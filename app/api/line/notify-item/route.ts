/**
 * LINE Notify Item API Route
 * Send LINE notifications when item is posted/updated/deleted.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { notifyItemPosted, notifyItemUpdated, notifyItemDeleted } from "@/lib/line"
import { getAdminDb, verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"
import { isAdmin } from "@/lib/admin-auth"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569-wwn2.vercel.app"

const notifyItemBodySchema = z
  .object({
    userId: z.string().min(1),
    itemTitle: z.string().min(1).max(200),
    itemId: z.string().min(1).optional(),
    action: z.enum(["posted", "updated", "deleted"]),
  })
  .superRefine((value, ctx) => {
    if ((value.action === "posted" || value.action === "updated") && !value.itemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["itemId"],
        message: "itemId is required when action is posted or updated",
      })
    }
  })

export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get("Authorization"))
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await verifyIdToken(token, true)
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const bodyRaw = await request.json().catch(() => null)
    const parsed = notifyItemBodySchema.safeParse(bodyRaw)
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

    const { userId, itemTitle, itemId, action } = parsed.data
    console.log("[LINE Notify Item] Body:", parsed.data)

    // Only allow self notification, unless admin.
    if (decoded.uid !== userId) {
      if (!decoded.email) {
        return NextResponse.json({ sent: false, reason: "forbidden" }, { status: 403 })
      }
      const allowed = await isAdmin(decoded.email)
      if (!allowed) {
        return NextResponse.json({ sent: false, reason: "forbidden" }, { status: 403 })
      }
    }

    const db = getAdminDb()
    const userSnap = await db.collection("users").doc(userId).get()

    if (!userSnap.exists) {
      console.log("[LINE Notify Item] User not found")
      return NextResponse.json({ sent: false, reason: "user not found" })
    }

    const userData = userSnap.data() as
      | {
          lineUserId?: string
          lineNotifications?: {
            enabled?: boolean
            itemPosted?: boolean
          }
        }
      | undefined
    const lineUserId = userData?.lineUserId
    const notificationsEnabled = userData?.lineNotifications?.enabled !== false
    const itemNotificationsEnabled = userData?.lineNotifications?.itemPosted !== false

    console.log("[LINE Notify Item] User LINE status:", {
      hasLineId: !!lineUserId,
      notificationsEnabled,
      itemNotificationsEnabled,
    })

    if (!lineUserId) {
      console.log("[LINE Notify Item] User has no LINE linked")
      return NextResponse.json({ sent: false, reason: "no LINE linked" })
    }

    if (!notificationsEnabled) {
      return NextResponse.json({ sent: false, reason: "notifications disabled" })
    }
    if (!itemNotificationsEnabled) {
      return NextResponse.json({ sent: false, reason: "item notifications disabled" })
    }

    switch (action) {
      case "posted":
        await notifyItemPosted(lineUserId, itemTitle, itemId!, BASE_URL)
        break
      case "updated":
        await notifyItemUpdated(lineUserId, itemTitle, itemId!, BASE_URL)
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
