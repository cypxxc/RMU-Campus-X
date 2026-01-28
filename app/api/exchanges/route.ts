/**
 * Exchange API Route
 * สร้างและจัดการ Exchange พร้อมส่ง LINE Notification
 * ใช้ Firebase Admin SDK for robust server-side operations
 * 
 * ✅ Uses withValidation wrapper for consistent validation and auth
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { withValidation, type ValidationContext } from "@/lib/api-validation"
import { sendPushMessage } from "@/lib/line"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569-wwn2.vercel.app"

/**
 * Zod schema for exchange creation request
 * - Validates required fields with Thai error messages
 * - Ensures ownerId !== requesterId
 */
const createExchangeSchema = z.object({
  itemId: z.string().min(1, "กรุณาระบุ Item ID"),
  itemTitle: z.string().optional(),
  ownerId: z.string().min(1, "กรุณาระบุเจ้าของ"),
  ownerEmail: z.string().optional(),
  requesterId: z.string().min(1, "กรุณาระบุผู้ขอ"),
  requesterEmail: z.string().optional(),
  requesterName: z.string().optional(),
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
  { requireAuth: true }
)

/**
 * Send LINE Push notification to item owner
 */
async function sendLineNotification(
  ownerId: string,
  itemTitle: string,
  requesterName: string | undefined,
  requesterEmail: string,
  exchangeId: string
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
        text: `📦 มีคนขอรับสิ่งของของคุณ!

🏷️ ${itemTitle}
👤 จาก: ${requesterName || requesterEmail}

🔗 ดูรายละเอียด:
${BASE_URL}/chat/${exchangeId}`,
      },
    ])
  }
}
