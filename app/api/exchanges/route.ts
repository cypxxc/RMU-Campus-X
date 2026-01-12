/**
 * Exchange API Route
 * สร้างและจัดการ Exchange พร้อมส่ง LINE Notification
 * ใช้ Firebase Admin SDK for robust server-side operations
 */

import { NextRequest } from "next/server"
import { sendPushMessage } from "@/lib/line" // Exported from index.ts usually
import { successResponse, ApiErrors, validateRequiredFields, parseRequestBody, getAuthToken } from "@/lib/api-response"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

interface CreateExchangeBody {
  itemId: string
  itemTitle: string
  ownerId: string
  ownerEmail: string
  requesterId: string
  requesterEmail: string
  requesterName?: string
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569-wwn2.vercel.app"

export async function POST(request: NextRequest) {
  console.log("[Exchange API] POST request received")
  
  try {
    // 0. Verify Authentication
    const token = getAuthToken(request)
    if (!token) {
      return ApiErrors.unauthorized("Missing authentication token")
    }
    
    const decodedToken = await verifyIdToken(token)
    if (!decodedToken) {
      return ApiErrors.unauthorized("Invalid authentication token")
    }

    const body = await parseRequestBody<CreateExchangeBody>(request)
    if (!body) {
      return ApiErrors.badRequest("Invalid request body")
    }

    const {
      itemId,
      itemTitle,
      ownerId,
      ownerEmail,
      requesterId,
      requesterEmail,
      requesterName,
    } = body

    // 1. Validate required fields
    const validation = validateRequiredFields(body, ["itemId", "ownerId", "requesterId"])
    if (!validation.valid) {
      return ApiErrors.missingFields(validation.missing)
    }

    if (ownerId === requesterId) {
      return ApiErrors.badRequest("Cannot request your own item")
    }

    const db = getAdminDb()
    
    // 2. Transaction: Check Availability + Create Exchange + Update Item
    const exchangeId = await db.runTransaction(async (transaction) => {
      // a. Check Item Availability
      const itemRef = db.collection("items").doc(itemId)
      const itemDoc = await transaction.get(itemRef)
      
      if (!itemDoc.exists) {
        throw new Error("Item not found")
      }
      
      const itemData = itemDoc.data()
      if (itemData?.status !== "available") {
        throw new Error(`Item is no longer available (current status: ${itemData?.status})`)
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

    console.log("[Exchange API] Created exchange successfully:", exchangeId)

    // 3. Create In-App Notification (No need for transaction here, can be async)
    await db.collection("notifications").add({
      userId: ownerId,
      title: "มีคำขอใหม่",
      message: `มีผู้ขอแลกเปลี่ยน "${itemTitle}" ของคุณ`,
      type: "exchange",
      relatedId: exchangeId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp()
    })

    // 4. LINE Notification
    try {
      const ownerDoc = await db.collection("users").doc(ownerId).get()
      if (ownerDoc.exists) {
        const userData = ownerDoc.data()
        const lineUserId = userData?.lineUserId
        const notificationsEnabled = userData?.lineNotifications?.enabled !== false // Default true
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
          console.log("[Exchange API] LINE notification sent")
        }
      }
    } catch (lineError) {
      console.error("[Exchange API] LINE notification error:", lineError)
    }

    return successResponse({ exchangeId })

  } catch (error: any) {
    console.error("[Exchange API] Error:", error)
    if (error.message.includes("Item is no longer available")) {
      return ApiErrors.conflict(error.message)
    }
    return ApiErrors.internalError(error.message || "Internal server error")
  }
}

