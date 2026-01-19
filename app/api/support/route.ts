/**
 * Support Tickets API Route
 * สร้าง Support Ticket พร้อมส่ง LINE Notification ไปยัง Admin
 */

import { NextRequest } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { notifyAdminsNewSupportTicket } from "@/lib/line"
import { successResponse, ApiErrors, validateRequiredFields, parseRequestBody, getAuthToken } from "@/lib/api-response"
import type { SupportTicket, User } from "@/types"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

interface CreateTicketBody {
  subject: string
  category: SupportTicket["category"]
  description: string
  userId: string
  userEmail: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and prevent spoofed userId/userEmail
    const token = getAuthToken(request)
    if (!token) {
      return ApiErrors.unauthorized("Missing authentication token")
    }

    const decoded = await verifyIdToken(token, true)
    if (!decoded) {
      return ApiErrors.unauthorized("Invalid or expired session")
    }

    const body = await parseRequestBody<CreateTicketBody>(request)
    if (!body) {
      return ApiErrors.badRequest("Invalid request body")
    }

    const { subject, category, description } = body
    const userId = decoded.uid
    const userEmail = decoded.email || body.userEmail || ""

    // Validate required fields
    const validation = validateRequiredFields(body, ["subject", "category"])
    if (!validation.valid) {
      return ApiErrors.missingFields(validation.missing)
    }

    const db = getAdminDb()

    // Create ticket document
    const ticketData = {
      subject,
      category,
      description: description || "",
      userId,
      userEmail: userEmail || "",
      status: "new" as const,
      priority: 2, // Default medium priority
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    const docRef = await db.collection("support_tickets").add(ticketData)
    console.log("[Support API] Created ticket:", docRef.id)

    // Create in-app notifications for admins
    const adminsSnapshot = await db.collection("admins").get()
    
    for (const adminDoc of adminsSnapshot.docs) {
      const adminData = adminDoc.data()
      const usersSnapshot = await db.collection("users")
        .where("email", "==", adminData.email)
        .get()

      if (!usersSnapshot.empty && usersSnapshot.docs[0]) {
        const adminUserId = usersSnapshot.docs[0].data().uid
        await db.collection("notifications").add({
          userId: adminUserId,
          title: "📩 Support Ticket ใหม่",
          message: `"${subject}" จาก ${userEmail}`,
          type: "support",
          relatedId: docRef.id,
          isRead: false,
          createdAt: FieldValue.serverTimestamp(),
        })
      }
    }

    // ============ LINE Notification to Admins ============
    const adminLineUserIds = await getAdminLineUserIds(db)
    
    if (adminLineUserIds.length > 0) {
      console.log("[Support API] Sending LINE notification to", adminLineUserIds.length, "admins")
      
      await notifyAdminsNewSupportTicket(
        adminLineUserIds,
        subject,
        category,
        userEmail,
        BASE_URL
      )
    }

    return successResponse({ ticketId: docRef.id })
  } catch (error) {
    console.error("[Support API] Error:", error)
    return ApiErrors.internalError()
  }
}

// Helper function to get admin LINE User IDs
async function getAdminLineUserIds(db: FirebaseFirestore.Firestore): Promise<string[]> {
  const adminsSnapshot = await db.collection("admins").get()
  const adminEmails = adminsSnapshot.docs.map(doc => doc.data().email)

  if (adminEmails.length === 0) {
    return []
  }

  const lineUserIds: string[] = []

  for (const email of adminEmails) {
    const usersSnapshot = await db.collection("users")
      .where("email", "==", email)
      .get()

    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0]!.data() as User
      if (userData.lineUserId && userData.lineNotifications?.enabled) {
        lineUserIds.push(userData.lineUserId)
      }
    }
  }

  return lineUserIds
}

