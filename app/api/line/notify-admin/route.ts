/**
 * API Route: Notify Admins via LINE
 * ส่ง LINE notification ให้ Admin ทุกคน
 */

import { NextRequest, NextResponse } from "next/server"
import { notifyAdminsNewReport, notifyAdminsNewSupportTicket, sendPushMessage } from "@/lib/line"

const FIREBASE_PROJECT = "resource-4e4fc"
const FIREBASE_API_KEY = "AIzaSyAhtR1jX2lycnS2xYLhiAtMAjn5dLOYAZM"

// Get all admin LINE user IDs from Firestore
async function getAdminLineUserIds(): Promise<string[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`
  
  const body = {
    structuredQuery: {
      from: [{ collectionId: "users" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "role" },
                op: "EQUAL",
                value: { stringValue: "admin" }
              }
            }
          ]
        }
      },
      limit: 50
    }
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error("[Admin Notify] Failed to query admins:", data)
      return []
    }

    const adminLineIds: string[] = []
    
    for (const result of data) {
      if (result.document?.fields?.lineUserId?.stringValue) {
        adminLineIds.push(result.document.fields.lineUserId.stringValue)
      }
    }

    console.log(`[Admin Notify] Found ${adminLineIds.length} admin(s) with LINE linked`)
    return adminLineIds
  } catch (error) {
    console.error("[Admin Notify] Error querying admins:", error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569.vercel.app"
    
    // Get all admin LINE user IDs
    const adminLineIds = await getAdminLineUserIds()
    
    if (adminLineIds.length === 0) {
      console.log("[Admin Notify] No admins with LINE linked, skipping notification")
      return NextResponse.json({ success: true, message: "No admins to notify" })
    }

    switch (type) {
      case "new_report":
        await notifyAdminsNewReport(
          adminLineIds,
          data.reportType,
          data.targetTitle,
          data.reporterEmail,
          baseUrl
        )
        break

      case "new_support_ticket":
        await notifyAdminsNewSupportTicket(
          adminLineIds,
          data.subject,
          data.category,
          data.userEmail,
          baseUrl
        )
        break

      case "custom":
        // Send custom message to all admins
        const message = {
          type: "text" as const,
          text: data.message
        }
        await Promise.allSettled(
          adminLineIds.map((adminId) => sendPushMessage(adminId, [message]))
        )
        break

      default:
        return NextResponse.json({ success: false, error: "Unknown notification type" }, { status: 400 })
    }

    return NextResponse.json({ success: true, notifiedCount: adminLineIds.length })
  } catch (error) {
    console.error("[Admin Notify] Error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
