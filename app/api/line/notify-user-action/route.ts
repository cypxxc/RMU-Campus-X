/**
 * LINE Notify User Action API Route
 * ส่ง LINE notification เมื่อผู้ใช้ถูกรายงาน/ได้รับคำเตือน/ถูกระงับบัญชี
 */

import { NextRequest, NextResponse } from "next/server"
import { 
  notifyUserReported, 
  notifyUserWarning, 
  notifyAccountStatusChange 
} from "@/lib/line"

const FIREBASE_PROJECT = "resource-4e4fc"
const FIREBASE_API_KEY = "AIzaSyAhtR1jX2lycnS2xYLhiAtMAjn5dLOYAZM"

interface NotifyUserActionBody {
  userId: string
  action: "reported" | "warning" | "status_change"
  // For reported
  reportType?: string
  targetTitle?: string
  // For warning
  reason?: string
  warningCount?: number
  // For status change
  status?: "ACTIVE" | "SUSPENDED" | "BANNED"
  suspendedUntil?: string // ISO date string
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
    const body: NotifyUserActionBody = await request.json()
    console.log("[LINE Notify User Action] Body:", body)

    const { userId, action } = body

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user has LINE notifications enabled
    const userDoc = await firestoreGet(`users/${userId}`)
    
    if (!userDoc?.fields) {
      console.log("[LINE Notify User Action] User not found")
      return NextResponse.json({ sent: false, reason: "user not found" })
    }

    const lineUserId = userDoc.fields.lineUserId?.stringValue
    const notificationsEnabled = userDoc.fields.lineNotifications?.mapValue?.fields?.enabled?.booleanValue
    const accountStatusEnabled = userDoc.fields.lineNotifications?.mapValue?.fields?.accountStatus?.booleanValue ?? true // default to true

    console.log("[LINE Notify User Action] User LINE status:", { 
      hasLineId: !!lineUserId, 
      notificationsEnabled,
      accountStatusEnabled,
      action 
    })

    if (!lineUserId || !notificationsEnabled) {
      return NextResponse.json({ sent: false, reason: "notifications disabled" })
    }

    // Send LINE notification based on action
    switch (action) {
      case "reported":
        if (body.reportType && body.targetTitle) {
          await notifyUserReported(lineUserId, body.reportType, body.targetTitle)
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
    }

    console.log("[LINE Notify User Action] Sent successfully!")
    return NextResponse.json({ sent: true })
  } catch (error) {
    console.error("[LINE Notify User Action] Error:", error)
    return NextResponse.json({ sent: false, error: String(error) })
  }
}
