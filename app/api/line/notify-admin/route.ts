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
// Note: admin document ID = user ID
async function getAdminLineUserIds(): Promise<string[]> {
  try {
    console.log("[Admin Notify] Starting admin lookup...")
    
    // Step 1: Get all admins from admins collection
    const adminsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/admins?key=${FIREBASE_API_KEY}`
    
    console.log("[Admin Notify] Fetching admins collection...")
    const adminsResponse = await fetch(adminsUrl)
    const adminsData = await adminsResponse.json()
    
    console.log("[Admin Notify] Admins response status:", adminsResponse.status)
    
    if (!adminsResponse.ok || !adminsData.documents) {
      console.log("[Admin Notify] No admins found or error - response:", JSON.stringify(adminsData))
      return []
    }

    console.log(`[Admin Notify] Found ${adminsData.documents.length} admin document(s)`)
    
    const lineUserIds: string[] = []
    
    // Step 2: For each admin doc, document ID = user ID
    for (const doc of adminsData.documents) {
      // Extract user ID from document path: projects/.../documents/admins/{userId}
      const docPath = doc.name
      const userId = docPath.split('/').pop()
      const email = doc.fields?.email?.stringValue || 'unknown'
      
      console.log(`[Admin Notify] Processing admin: ${email} (userId: ${userId})`)
      
      if (!userId) {
        console.log("[Admin Notify] Could not extract user ID from document path")
        continue
      }
      
      // Get user document directly by ID
      const userUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/users/${userId}?key=${FIREBASE_API_KEY}`
      
      console.log(`[Admin Notify] Fetching user document: users/${userId}`)
      const userResponse = await fetch(userUrl)
      
      if (!userResponse.ok) {
        console.log(`[Admin Notify] User document not found for ${userId}`)
        continue
      }
      
      const userData = await userResponse.json()
      const lineUserId = userData.fields?.lineUserId?.stringValue
      
      console.log(`[Admin Notify] Admin ${email} - lineUserId: ${lineUserId || 'NOT FOUND'}`)
      
      if (lineUserId) {
        lineUserIds.push(lineUserId)
        console.log(`[Admin Notify] ✅ Added LINE ID for admin ${email}`)
      } else {
        console.log(`[Admin Notify] ❌ Admin ${email} has no LINE linked`)
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
