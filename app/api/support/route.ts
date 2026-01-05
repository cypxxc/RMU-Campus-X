/**
 * Support Tickets API Route
 * สร้าง Support Ticket พร้อมส่ง LINE Notification ไปยัง Admin
 */

import { NextRequest, NextResponse } from "next/server"
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { notifyAdminsNewSupportTicket } from "@/lib/line"
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
    const body: CreateTicketBody = await request.json()

    const { subject, category, description, userId, userEmail } = body

    // Validate required fields
    if (!subject || !category || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const db = getFirebaseDb()

    // Create ticket document
    const ticketData = {
      subject,
      category,
      description: description || "",
      userId,
      userEmail: userEmail || "",
      status: "new" as const,
      priority: 2, // Default medium priority
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, "support_tickets"), ticketData)
    console.log("[Support API] Created ticket:", docRef.id)

    // Create in-app notifications for admins
    const adminsSnapshot = await getDocs(collection(db, "admins"))
    
    for (const adminDoc of adminsSnapshot.docs) {
      const adminData = adminDoc.data()
      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", adminData.email)
      )
      const usersSnapshot = await getDocs(usersQuery)

      if (!usersSnapshot.empty && usersSnapshot.docs[0]) {
        const adminUserId = usersSnapshot.docs[0].data().uid
        await addDoc(collection(db, "notifications"), {
          userId: adminUserId,
          title: "📩 Support Ticket ใหม่",
          message: `"${subject}" จาก ${userEmail}`,
          type: "support",
          relatedId: docRef.id,
          isRead: false,
          createdAt: serverTimestamp(),
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

    return NextResponse.json({
      success: true,
      ticketId: docRef.id,
    })
  } catch (error) {
    console.error("[Support API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper function to get admin LINE User IDs
async function getAdminLineUserIds(db: any): Promise<string[]> {
  const adminsSnapshot = await getDocs(collection(db, "admins"))
  const adminEmails = adminsSnapshot.docs.map(doc => doc.data().email)

  if (adminEmails.length === 0) {
    return []
  }

  const lineUserIds: string[] = []

  for (const email of adminEmails) {
    const usersQuery = query(
      collection(db, "users"),
      where("email", "==", email)
    )
    const usersSnapshot = await getDocs(usersQuery)

    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0]!.data() as User
      if (userData.lineUserId && userData.lineNotifications?.enabled) {
        lineUserIds.push(userData.lineUserId)
      }
    }
  }

  return lineUserIds
}
