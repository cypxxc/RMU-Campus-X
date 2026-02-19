/**
 * LINE Notify User Action API Route
 * ส่ง LINE notification เมื่อผู้ใช้ถูกรายงาน/ได้รับคำเตือน/ถูกระงับบัญชี
 */

import { NextRequest, NextResponse } from "next/server"
import { 
  notifyUserReported, 
  notifyUserWarning, 
  notifyAccountStatusChange,
  notifyItemEditedByAdmin,
} from "@/lib/line"
import { enforceAdminMutationRateLimit, verifyAdminAccess } from "@/lib/admin-api"
import { getAdminDb } from "@/lib/firebase-admin"

interface NotifyUserActionBody {
  userId: string
  action: "reported" | "warning" | "status_change" | "item_edited_by_admin"
  // For reported
  reportType?: string
  targetTitle?: string
  reportReason?: string
  // For warning
  reason?: string
  warningCount?: number
  // For status change
  status?: "ACTIVE" | "SUSPENDED" | "BANNED"
  suspendedUntil?: string // ISO date string
  // For item_edited_by_admin
  itemTitle?: string
}

const IS_DEV = process.env.NODE_ENV === "development"

function debugLog(message: string, context?: unknown) {
  if (!IS_DEV) return
  if (context === undefined) {
    console.log(message)
    return
  }
  console.log(message, context)
}

function errorLog(message: string, error?: unknown) {
  if (IS_DEV && error !== undefined) {
    console.error(message, error)
    return
  }
  console.error(message)
}

export async function POST(request: NextRequest) {
  try {
    // Verify Admin Access
    const { authorized, user, error } = await verifyAdminAccess(request)
    if (!authorized) return error!
    if (!user?.uid) {
      return NextResponse.json({ error: "Admin identity missing" }, { status: 403 })
    }
    const rateLimited = await enforceAdminMutationRateLimit(request, user.uid, "notify-user-action", 30, 60_000)
    if (rateLimited) return rateLimited

    const body: NotifyUserActionBody = await request.json()
    debugLog("[LINE Notify User Action] Request accepted", {
      action: body.action,
      userId: body.userId,
    })

    const { userId, action } = body

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user has LINE notifications enabled
    const db = getAdminDb()
    const userSnap = await db.collection("users").doc(userId).get()

    if (!userSnap.exists) {
      debugLog("[LINE Notify User Action] User not found")
      return NextResponse.json({ sent: false, reason: "user not found" })
    }

    const userData = userSnap.data() as any
    const lineUserId = userData?.lineUserId as string | undefined
    // Default to true if not explicitly set
    const notificationsEnabled = userData?.lineNotifications?.enabled ?? true
    const accountStatusEnabled = userData?.lineNotifications?.accountStatus ?? true

    debugLog("[LINE Notify User Action] User LINE status:", {
      hasLineId: !!lineUserId,
      notificationsEnabled,
      accountStatusEnabled,
      action,
    })

    if (!lineUserId) {
      debugLog("[LINE Notify User Action] User has no LINE linked")
      return NextResponse.json({ sent: false, reason: "no LINE linked" })
    }
    
    if (!notificationsEnabled) {
      return NextResponse.json({ sent: false, reason: "notifications disabled" })
    }

    // Send LINE notification based on action
    switch (action) {
      case "reported":
        if (body.reportType && body.targetTitle) {
          await notifyUserReported(
            lineUserId,
            body.reportType,
            body.targetTitle,
            body.reportReason
          )
        }
        break

      case "warning":
        if (body.reason && body.warningCount) {
          await notifyUserWarning(lineUserId, body.reason, body.warningCount)
        }
        break

      case "status_change":
        if (body.status && accountStatusEnabled) {
          const suspendedUntil = body.suspendedUntil 
            ? new Date(body.suspendedUntil) 
            : undefined
          await notifyAccountStatusChange(
            lineUserId, 
            body.status, 
            body.reason,
            suspendedUntil
          )
        }
        break

      case "item_edited_by_admin":
        if (body.itemTitle) {
          await notifyItemEditedByAdmin(lineUserId, body.itemTitle)
        }
        break
    }

    debugLog("[LINE Notify User Action] Sent successfully!")
    return NextResponse.json({ sent: true })
  } catch (error) {
    errorLog("[LINE Notify User Action] Error:", error)
    return NextResponse.json({ sent: false, error: "Internal Server Error" }, { status: 500 })
  }
}
