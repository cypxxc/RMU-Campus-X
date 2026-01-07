/**
 * API Route: Notify Admins via LINE
 * ส่ง LINE notification ให้ Admin ทุกคน
 */

import { NextRequest, NextResponse } from "next/server"
import { notifyAdminsNewReport, notifyAdminsNewSupportTicket, sendPushMessage } from "@/lib/line"

const FIREBASE_PROJECT = "resource-4e4fc"
const FIREBASE_API_KEY = "AIzaSyAhtR1jX2lycnS2xYLhiAtMAjn5dLOYAZM"

// Get all admin LINE user IDs from Firestore
// ดึง Admin จาก admins collection แล้วไปหา lineUserId จาก users collection
async function getAdminLineUserIds(): Promise<string[]> {
  try {
    // Step 1: Get all admins from admins collection
    const adminsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/admins?key=${FIREBASE_API_KEY}`
    
    const adminsResponse = await fetch(adminsUrl)
    const adminsData = await adminsResponse.json()
    
    if (!adminsResponse.ok || !adminsData.documents) {
      console.log("[Admin Notify] No admins found or error:", adminsData)
      return []
    }

    // Extract admin emails from admins collection
    const adminEmails: string[] = []
    for (const doc of adminsData.documents) {
      if (doc.fields?.email?.stringValue) {
        adminEmails.push(doc.fields.email.stringValue)
      }
    }

    if (adminEmails.length === 0) {
      console.log("[Admin Notify] No admin emails found")
      return []
    }

    console.log(`[Admin Notify] Found ${adminEmails.length} admin(s):`, adminEmails)

    // Step 2: For each admin email, find the user and get their lineUserId
    const lineUserIds: string[] = []
    
    for (const email of adminEmails) {
      const usersUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`
      
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "email" },
              op: "EQUAL",
              value: { stringValue: email }
            }
          },
          limit: 1
        }
      }

      const userResponse = await fetch(usersUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryBody)
      })

      const userData = await userResponse.json()
      
      if (userResponse.ok && userData[0]?.document?.fields) {
        const fields = userData[0].document.fields
        const lineUserId = fields.lineUserId?.stringValue
        
        // Admin ได้รับแจ้งเตือนเสมอ ไม่ต้องตรวจสอบ lineNotifications.enabled
        if (lineUserId) {
          lineUserIds.push(lineUserId)
          console.log(`[Admin Notify] Admin ${email} has LINE linked: ${lineUserId}`)
        } else {
          console.log(`[Admin Notify] Admin ${email} has no LINE linked`)
        }
      }
    }

    console.log(`[Admin Notify] Total ${lineUserIds.length} admin(s) with LINE linked`)
    return lineUserIds
  } catch (error) {
    console.error("[Admin Notify] Error querying admins:", error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    console.log(`[Admin Notify] Received notification request - Type: ${type}`, data)

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569.vercel.app"
    
    // Get all admin LINE user IDs
    const adminLineIds = await getAdminLineUserIds()
    
    if (adminLineIds.length === 0) {
      console.log("[Admin Notify] No admins with LINE linked, skipping notification")
      return NextResponse.json({ success: true, message: "No admins to notify" })
    }

    console.log(`[Admin Notify] Will notify ${adminLineIds.length} admin(s) for ${type}`)

    switch (type) {
      case "new_report":
        await notifyAdminsNewReport(
          adminLineIds,
          data.reportType,
          data.targetTitle,
          data.reporterEmail,
          baseUrl
        )
        console.log("[Admin Notify] Report notification sent")
        break

      case "new_support_ticket":
        await notifyAdminsNewSupportTicket(
          adminLineIds,
          data.subject,
          data.category,
          data.userEmail,
          baseUrl
        )
        console.log("[Admin Notify] Support ticket notification sent")
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
        console.log("[Admin Notify] Custom notification sent")
        break

      default:
        console.log(`[Admin Notify] Unknown notification type: ${type}`)
        return NextResponse.json({ success: false, error: "Unknown notification type" }, { status: 400 })
    }

    return NextResponse.json({ success: true, notifiedCount: adminLineIds.length })
  } catch (error) {
    console.error("[Admin Notify] Error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
