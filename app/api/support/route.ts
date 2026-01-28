/**
 * Support Tickets API Route
 * สร้าง Support Ticket พร้อมส่ง LINE Notification ไปยัง Admin
 * 
 * ✅ Uses withValidation wrapper for consistent validation and auth
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { withValidation, type ValidationContext } from "@/lib/api-validation"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { notifyAdminsNewSupportTicket } from "@/lib/line"
import type { User } from "@/types"
import { sanitizeText } from "@/lib/security"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

/**
 * Zod schema for support ticket creation
 */
const createTicketSchema = z.object({
  subject: z.string().min(1, "กรุณาระบุหัวข้อ").max(200, "หัวข้อยาวเกินไป").transform(sanitizeText),
  category: z.enum(["general", "technical", "account", "exchange", "report", "other"], {
    errorMap: () => ({ message: "กรุณาเลือกหมวดหมู่" })
  }),
  description: z.string().min(10, "คำอธิบายต้องมีอย่างน้อย 10 ตัวอักษร").max(2000, "คำอธิบายยาวเกินไป").transform(sanitizeText),
})

type CreateTicketInput = z.infer<typeof createTicketSchema>

/**
 * POST /api/support
 * Create a new support ticket
 */
export const POST = withValidation(
  createTicketSchema,
  async (_request, data: CreateTicketInput, ctx: ValidationContext | null) => {
    if (!ctx) {
      return NextResponse.json(
        { error: "Authentication context missing", code: "AUTH_ERROR" },
        { status: 401 }
      )
    }

    try {
      const db = getAdminDb()
      const { subject, category, description } = data

      // Create ticket document
      const ticketData = {
        subject,
        category,
        description,
        userId: ctx.userId,
        userEmail: ctx.email || "",
        status: "new" as const,
        priority: 2,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }

      const docRef = await db.collection("support_tickets").add(ticketData)

      // Create in-app notifications for admins (fire and forget)
      notifyAdminsInApp(db, subject, ctx.email || "", docRef.id).catch(err => {
        console.error("[Support API] Admin notification error:", err)
      })

      // LINE Notification to Admins (fire and forget)
      sendAdminLineNotifications(db, subject, category, ctx.email || "").catch(err => {
        console.error("[Support API] LINE notification error:", err)
      })

      return NextResponse.json({
        success: true,
        data: { ticketId: docRef.id }
      })
    } catch (error) {
      console.error("[Support API] Error:", error)
      return NextResponse.json(
        { error: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500 }
      )
    }
  },
  { requireAuth: true }
)

// Helper: Notify admins in-app
async function notifyAdminsInApp(
  db: FirebaseFirestore.Firestore, 
  subject: string, 
  userEmail: string,
  ticketId: string
): Promise<void> {
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
        relatedId: ticketId,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      })
    }
  }
}

// Helper: Send LINE notifications to admins
async function sendAdminLineNotifications(
  db: FirebaseFirestore.Firestore,
  subject: string,
  category: string,
  userEmail: string
): Promise<void> {
  const adminsSnapshot = await db.collection("admins").get()
  const adminEmails = adminsSnapshot.docs.map(doc => doc.data().email)

  if (adminEmails.length === 0) return

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

  if (lineUserIds.length > 0) {
    await notifyAdminsNewSupportTicket(lineUserIds, subject, category, userEmail, BASE_URL)
  }
}
