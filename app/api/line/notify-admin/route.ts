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
    console.log("[Admin Notify] Starting admin lookup...")
    
    // Step 1: Get all admins from admins collection
    const adminsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/admins?key=${FIREBASE_API_KEY}`
    
    console.log("[Admin Notify] Fetching admins collection...")
    const adminsResponse = await fetch(adminsUrl)
    const adminsData = await adminsResponse.json()
    
    console.log("[Admin Notify] Admins response status:", adminsResponse.status)
    console.log("[Admin Notify] Admins data:", JSON.stringify(adminsData, null, 2))
    
    if (!adminsResponse.ok || !adminsData.documents) {
      console.log("[Admin Notify] No admins found or error - response:", adminsData)
      return []
    }

    // Extract admin emails from admins collection
    // Try multiple possible field names for email
    const adminEmails: string[] = []
    for (const doc of adminsData.documents) {
      console.log("[Admin Notify] Processing admin doc:", doc.name)
      console.log("[Admin Notify] Admin doc fields:", JSON.stringify(doc.fields, null, 2))
      
      // Try different possible email field names
      const email = doc.fields?.email?.stringValue || 
                   doc.fields?.userEmail?.stringValue ||
                   doc.fields?.adminEmail?.stringValue
      
      if (email) {
        adminEmails.push(email)
        console.log(`[Admin Notify] Found admin email: ${email}`)
      } else {
        // Check if the document ID itself is the user ID
        const docId = doc.name.split('/').pop()
        console.log(`[Admin Notify] No email field found, doc ID: ${docId}`)
        
        // Try to get user directly by document ID
        const userUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/users/${docId}?key=${FIREBASE_API_KEY}`
        const userDirectResponse = await fetch(userUrl)
        
        if (userDirectResponse.ok) {
          const userData = await userDirectResponse.json()
          const lineUserId = userData.fields?.lineUserId?.stringValue
          if (lineUserId) {
            console.log(`[Admin Notify] Found LINE ID directly from user doc: ${lineUserId}`)
            return [lineUserId] // Return immediately if we find it this way
          }
        }
      }
    }

    if (adminEmails.length === 0) {
      console.log("[Admin Notify] No admin emails found in any format")
      return []
    }

    console.log(`[Admin Notify] Found ${adminEmails.length} admin email(s):`, adminEmails)

    // Step 2: For each admin email, find the user and get their lineUserId
    const lineUserIds: string[] = []
    
    for (const email of adminEmails) {
      console.log(`[Admin Notify] Looking up user for email: ${email}`)
      
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
      console.log(`[Admin Notify] User query result for ${email}:`, JSON.stringify(userData, null, 2))
      
      if (userResponse.ok && userData[0]?.document?.fields) {
        const fields = userData[0].document.fields
        const lineUserId = fields.lineUserId?.stringValue
        
        console.log(`[Admin Notify] Admin ${email} - lineUserId: ${lineUserId || 'NOT FOUND'}`)
        
        // Admin ได้รับแจ้งเตือนเสมอ ไม่ต้องตรวจสอบ lineNotifications.enabled
        if (lineUserId) {
          lineUserIds.push(lineUserId)
          console.log(`[Admin Notify] Admin ${email} has LINE linked: ${lineUserId}`)
        } else {
          console.log(`[Admin Notify] Admin ${email} has no LINE linked`)
        }
      } else {
        console.log(`[Admin Notify] Could not find user for email: ${email}`)
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
