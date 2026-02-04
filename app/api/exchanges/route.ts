/**
 * Exchange API Route
 * สร้างและจัดการ Exchange พร้อมส่ง LINE Notification
 * ใช้ Firebase Admin SDK for robust server-side operations
 *
 * GET /api/exchanges — ดึงรายการแลกเปลี่ยนของ user (ใช้ Admin SDK ไม่ติด Firestore rules)
 * POST /api/exchanges — สร้าง exchange ใหม่
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withValidation, type ValidationContext } from "@/lib/api-validation"
import { sendPushMessage } from "@/lib/line"
import { getAdminDb, canUserExchange, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { sanitizeText } from "@/lib/security"
import { ApiErrors, getAuthToken } from "@/lib/api-response"

function serializeExchange(doc: { id: string; data: () => Record<string, unknown> | undefined }): Record<string, unknown> {
  const data = doc.data()
  if (!data) return { id: doc.id }
  const out: Record<string, unknown> = { id: doc.id, ...data }
  const ts = (x: unknown) => x && typeof (x as { toDate?: () => Date }).toDate === "function" ? (x as { toDate: () => Date }).toDate().toISOString() : x
  if (data.createdAt) out.createdAt = ts(data.createdAt)
  if (data.updatedAt) out.updatedAt = ts(data.updatedAt)
  if (data.cancelledAt) out.cancelledAt = ts(data.cancelledAt)
  return out
}

/**
 * GET /api/exchanges
 * ดึงรายการแลกเปลี่ยนของ user (requester หรือ owner) — ใช้ Admin SDK ไม่ติด Firestore rules
 */
export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const uid = decoded.uid
    const db = getAdminDb()

    const [requesterSnap, ownerSnap] = await Promise.all([
      db.collection("exchanges").where("requesterId", "==", uid).orderBy("createdAt", "desc").get(),
      db.collection("exchanges").where("ownerId", "==", uid).orderBy("createdAt", "desc").get(),
    ])

    const byId = new Map<string, Record<string, unknown>>()
    requesterSnap.docs.forEach((d) => byId.set(d.id, serializeExchange(d)))
    ownerSnap.docs.forEach((d) => byId.set(d.id, serializeExchange(d)))

    const list = Array.from(byId.values()).sort((a, b) => {
      const ta = typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() : 0
      const tb = typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })

    return NextResponse.json({ success: true, data: { exchanges: list } })
  } catch (e) {
    console.error("[Exchanges API] GET Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}

/**
 * Zod schema for exchange creation request
 * - Validates required fields with Thai error messages
 * - Ensures ownerId !== requesterId
 */
const createExchangeSchema = z.object({
  itemId: z.string().min(1, "กรุณาระบุ Item ID"),
  itemTitle: z.string().optional().transform(val => val ? sanitizeText(val) : val),
  ownerId: z.string().min(1, "กรุณาระบุเจ้าของ"),
  ownerEmail: z.string().optional(),
  requesterId: z.string().min(1, "กรุณาระบุผู้ขอ"),
  requesterEmail: z.string().optional(),
  requesterName: z.string().optional().transform(val => val ? sanitizeText(val) : val),
}).refine(data => data.ownerId !== data.requesterId, {
  message: "ไม่สามารถขอสิ่งของของตัวเองได้",
  path: ["requesterId"],
})

type CreateExchangeInput = z.infer<typeof createExchangeSchema>

/**
 * POST /api/exchanges
 * Create a new exchange request
 */
export const POST = withValidation(
  createExchangeSchema,
  async (_request, data: CreateExchangeInput, ctx: ValidationContext | null) => {
    // ctx is guaranteed to be non-null because requireAuth: true
    if (!ctx) {
      return NextResponse.json(
        { error: "Authentication context missing", code: "AUTH_ERROR" },
        { status: 401 }
      )
    }

    const {
      itemId,
      itemTitle,
      ownerId,
      ownerEmail,
      requesterId,
      requesterEmail,
      requesterName,
    } = data

    if (requesterId !== ctx.userId) {
      return NextResponse.json(
        { error: "requesterId must match authenticated user", code: "FORBIDDEN" },
        { status: 403 }
      )
    }

    const allowed = await canUserExchange(ctx.userId)
    if (!allowed) {
      return NextResponse.json(
        { error: "บัญชีของคุณถูกจำกัดสิทธิ์การแลกเปลี่ยน กรุณาติดต่อผู้ดูแลระบบ", code: "RESTRICTED" },
        { status: 403 }
      )
    }

    try {
      const db = getAdminDb()
      
      // Transaction: Check Availability + Create Exchange + Update Item
      const exchangeId = await db.runTransaction(async (transaction) => {
        // a. Check Item Availability
        const itemRef = db.collection("items").doc(itemId)
        const itemDoc = await transaction.get(itemRef)
        
        if (!itemDoc.exists) {
          throw new Error("ไม่พบสิ่งของที่ต้องการ")
        }
        
        const itemData = itemDoc.data()
        if (itemData?.status !== "available") {
          throw new Error(`สิ่งของนี้ไม่พร้อมให้แลกเปลี่ยนแล้ว (สถานะ: ${itemData?.status})`)
        }

        // b. Create Exchange Doc
        const exchangeRef = db.collection("exchanges").doc()
        transaction.set(exchangeRef, {
          itemId,
          itemTitle: itemTitle || itemData.title || "",
          ownerId,
          ownerEmail: ownerEmail || "",
          requesterId,
          requesterEmail: requesterEmail || "",
          status: "pending",
          ownerConfirmed: false,
          requesterConfirmed: false,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })

        // c. Update Item Status
        transaction.update(itemRef, {
          status: "pending",
          updatedAt: FieldValue.serverTimestamp()
        })
        
        return exchangeRef.id
      })

      // Create In-App Notification (async, non-blocking for response)
      await db.collection("notifications").add({
        userId: ownerId,
        title: "มีคำขอใหม่",
        message: `มีผู้ขอแลกเปลี่ยน "${itemTitle}" ของคุณ`,
        type: "exchange",
        relatedId: exchangeId,
        isRead: false,
        createdAt: FieldValue.serverTimestamp()
      })

      // LINE Notification (fire and forget, don't block response)
      sendLineNotification(ownerId, itemTitle || "", requesterName, requesterEmail || "", exchangeId).catch(err => {
        console.error("[Exchange API] LINE notification error:", err)
      })

      return NextResponse.json({
        success: true,
        data: { exchangeId }
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Internal server error"
      
      // Check for specific error types
      if (errorMessage.includes("ไม่พร้อมให้แลกเปลี่ยน") || errorMessage.includes("no longer available")) {
        return NextResponse.json(
          { error: errorMessage, code: "CONFLICT" },
          { status: 409 }
        )
      }
      
      if (errorMessage.includes("ไม่พบ") || errorMessage.includes("not found")) {
        return NextResponse.json(
          { error: errorMessage, code: "NOT_FOUND" },
          { status: 404 }
        )
      }

      console.error("[Exchange API] Error:", error)
      return NextResponse.json(
        { error: errorMessage, code: "INTERNAL_ERROR" },
        { status: 500 }
      )
    }
  },
  { requireAuth: true, requireTermsAccepted: true }
)

/**
 * Send LINE Push notification to item owner
 */
async function sendLineNotification(
  ownerId: string,
  itemTitle: string,
  requesterName: string | undefined,
  requesterEmail: string,
  _exchangeId: string
): Promise<void> {
  const db = getAdminDb()
  const ownerDoc = await db.collection("users").doc(ownerId).get()
  
  if (!ownerDoc.exists) return

  const userData = ownerDoc.data()
  const lineUserId = userData?.lineUserId
  const notificationsEnabled = userData?.lineNotifications?.enabled !== false
  const exchangeRequestEnabled = userData?.lineNotifications?.exchangeRequest !== false

  if (lineUserId && notificationsEnabled && exchangeRequestEnabled) {
    await sendPushMessage(lineUserId, [
      {
        type: "text",
        text: `📦 มีคนขอรับสิ่งของของคุณ

🏷️ รายการ: ${itemTitle}
👤 ผู้ขอ: ${requesterName || requesterEmail}

(เข้าเว็บแอป RMU-Campus X → การแลกเปลี่ยนของฉัน เพื่อดูและตอบกลับ)`,
      },
    ])
  }
}
