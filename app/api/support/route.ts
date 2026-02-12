/**
 * Support Tickets API Route
 * GET: List current user's support tickets (auth required)
 * POST: Create support ticket and notify admins (in-app + LINE)
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withValidation, type ValidationContext } from "@/lib/api-validation"
import { getAdminDb, verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { notifyAdminsNewSupportTicket } from "@/lib/line"
import type { User } from "@/types"
import { sanitizeText } from "@/lib/security"
import { getAuthToken } from "@/lib/api-response"
import { log } from "@/lib/logger"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

function toISO(v: unknown): string | null {
  if (!v) return null
  if (typeof (v as { toDate?: () => Date }).toDate === "function") return (v as { toDate: () => Date }).toDate().toISOString()
  if (typeof (v as { toMillis?: () => number }).toMillis === "function") return new Date((v as { toMillis: () => number }).toMillis()).toISOString()
  if (typeof v === "string") return v
  if (typeof v === "number") return new Date(v).toISOString()
  return null
}

/**
 * GET /api/support - list current user's tickets
 */
export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request) ?? extractBearerToken(request.headers.get("Authorization"))
    if (!token) return NextResponse.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, { status: 401 })
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return NextResponse.json({ error: "Invalid or expired token", code: "INVALID_TOKEN" }, { status: 401 })

    const db = getAdminDb()
    const summary = request.nextUrl.searchParams.get("summary")
    if (summary === "hasTickets") {
      const hasTicketsSnap = await db
        .collection("support_tickets")
        .where("userId", "==", decoded.uid)
        .limit(1)
        .get()
      return NextResponse.json({ success: true, data: { hasTickets: !hasTicketsSnap.empty } })
    }

    const snapshot = await db
      .collection("support_tickets")
      .where("userId", "==", decoded.uid)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get()

    const tickets = snapshot.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        subject: data.subject,
        category: data.category,
        description: data.description,
        userId: data.userId,
        userEmail: data.userEmail,
        status: data.status,
        adminReply: data.adminReply,
        messages: data.messages ?? [],
        repliedBy: data.repliedBy,
        repliedAt: data.repliedAt ? toISO(data.repliedAt) : null,
        resolvedAt: data.resolvedAt ? toISO(data.resolvedAt) : null,
        createdAt: data.createdAt ? toISO(data.createdAt) : null,
        updatedAt: data.updatedAt ? toISO(data.updatedAt) : null,
      }
    })

    return NextResponse.json({ success: true, data: { tickets } })
  } catch (error) {
    log.apiError("GET", "/api/support", error, { endpoint: "support-tickets" })
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 })
  }
}

const createTicketSchema = z.object({
  subject: z.string().min(1, "Please provide a subject").max(200, "Subject is too long").transform(sanitizeText),
  category: z.enum(["general", "technical", "account", "exchange", "report", "other"], {
    errorMap: () => ({ message: "Please select a category" }),
  }),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description is too long")
    .transform(sanitizeText),
})

type CreateTicketInput = z.infer<typeof createTicketSchema>

/**
 * POST /api/support - create support ticket
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

      const ticketData = {
        subject,
        category,
        description,
        userId: ctx.userId,
        userEmail: ctx.email || "",
        status: "new" as const,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }

      const docRef = await db.collection("support_tickets").add(ticketData)
      const adminUsers = await getAdminUsersByEmail(db)

      notifyAdminsInApp(db, adminUsers, subject, ctx.email || "", docRef.id).catch((err) => {
        log.warn("Failed to send admin in-app notification", { error: err, ticketId: docRef.id }, "SUPPORT")
      })

      sendAdminLineNotifications(adminUsers, subject, category, ctx.email || "").catch((err) => {
        log.warn("Failed to send admin LINE notification", { error: err, ticketId: docRef.id }, "SUPPORT")
      })

      return NextResponse.json({
        success: true,
        data: { ticketId: docRef.id },
      })
    } catch (error) {
      log.apiError("POST", "/api/support", error, { operation: "create-ticket" })
      return NextResponse.json(
        { error: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500 }
      )
    }
  },
  { requireAuth: true, requireTermsAccepted: true }
)

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return []
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

async function getAdminUsersByEmail(db: FirebaseFirestore.Firestore): Promise<User[]> {
  const adminsSnapshot = await db.collection("admins").get()
  const adminEmails = Array.from(
    new Set(
      adminsSnapshot.docs
        .map((doc) => doc.data().email)
        .filter((email): email is string => typeof email === "string")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  )

  if (adminEmails.length === 0) return []

  const usersByEmail = new Map<string, User>()
  for (const emailChunk of chunk(adminEmails, 10)) {
    const usersSnapshot = await db
      .collection("users")
      .where("email", "in", emailChunk)
      .get()

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data() as User
      const key = typeof userData.email === "string" ? userData.email.trim().toLowerCase() : ""
      if (key && !usersByEmail.has(key)) {
        usersByEmail.set(key, userData)
      }
    }
  }

  return adminEmails
    .map((email) => usersByEmail.get(email))
    .filter((user): user is User => Boolean(user))
}

async function notifyAdminsInApp(
  db: FirebaseFirestore.Firestore,
  adminUsers: User[],
  subject: string,
  userEmail: string,
  ticketId: string
): Promise<void> {
  const adminUserIds = Array.from(
    new Set(
      adminUsers
        .map((user) => (typeof user.uid === "string" ? user.uid.trim() : ""))
        .filter(Boolean)
    )
  )
  if (adminUserIds.length === 0) return

  const batch = db.batch()
  for (const adminUserId of adminUserIds) {
    const ref = db.collection("notifications").doc()
    batch.set(ref, {
      userId: adminUserId,
      title: "New support ticket",
      message: `"${subject}" from ${userEmail}`,
      type: "support",
      relatedId: ticketId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    })
  }
  await batch.commit()
}

async function sendAdminLineNotifications(
  adminUsers: User[],
  subject: string,
  category: string,
  userEmail: string
): Promise<void> {
  const lineUserIds = Array.from(
    new Set(
      adminUsers
        .filter((user) => user.lineNotifications?.enabled !== false)
        .map((user) => (typeof user.lineUserId === "string" ? user.lineUserId.trim() : ""))
        .filter(Boolean)
    )
  )

  if (lineUserIds.length > 0) {
    await notifyAdminsNewSupportTicket(lineUserIds, subject, category, userEmail, BASE_URL)
  }
}
