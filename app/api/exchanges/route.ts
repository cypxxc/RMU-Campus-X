/**
 * Exchange API Route
 * สร้างและจัดการ Exchange พร้อมส่ง LINE Notification
 * ใช้ Firebase REST API สำหรับ Vercel serverless
 */

import { NextRequest } from "next/server"
import { sendPushMessage } from "@/lib/line"
import { successResponse, ApiErrors, validateRequiredFields, parseRequestBody } from "@/lib/api-response"

const FIREBASE_PROJECT = "resource-4e4fc"
const FIREBASE_API_KEY = "AIzaSyAhtR1jX2lycnS2xYLhiAtMAjn5dLOYAZM"
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569-wwn2.vercel.app"

interface CreateExchangeBody {
  itemId: string
  itemTitle: string
  ownerId: string
  ownerEmail: string
  requesterId: string
  requesterEmail: string
  requesterName?: string
}

// Firebase REST API helpers
async function firestoreAdd(collectionPath: string, data: Record<string, unknown>): Promise<string> {
  console.log("[Exchange API] firestoreAdd:", collectionPath)
  
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${collectionPath}?key=${FIREBASE_API_KEY}`
  
  const firestoreFields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      firestoreFields[key] = { stringValue: value }
    } else if (typeof value === "boolean") {
      firestoreFields[key] = { booleanValue: value }
    } else if (value === null || value === undefined) {
      firestoreFields[key] = { nullValue: null }
    } else if (typeof value === "object" && value !== null) {
      const mapFields: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === "boolean") {
          mapFields[k] = { booleanValue: v }
        } else if (typeof v === "string") {
          mapFields[k] = { stringValue: v }
        }
      }
      firestoreFields[key] = { mapValue: { fields: mapFields } }
    }
  }

  // Add timestamp
  firestoreFields["createdAt"] = { timestampValue: new Date().toISOString() }
  firestoreFields["updatedAt"] = { timestampValue: new Date().toISOString() }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: firestoreFields })
  })

  const result = await response.json()
  console.log("[Exchange API] firestoreAdd result:", response.status, JSON.stringify(result).slice(0, 200))
  
  if (!response.ok) {
    throw new Error(`Firestore add failed: ${response.status} - ${JSON.stringify(result)}`)
  }

  // Extract document ID from name
  const docId = result.name?.split("/").pop() || ""
  return docId
}

async function firestoreGet(documentPath: string) {
  console.log("[Exchange API] firestoreGet:", documentPath)
  
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${documentPath}?key=${FIREBASE_API_KEY}`
  
  const response = await fetch(url)
  console.log("[Exchange API] firestoreGet result:", response.status)
  
  if (!response.ok) {
    return null
  }
  
  return response.json()
}

async function firestoreUpdate(documentPath: string, fields: Record<string, unknown>) {
  console.log("[Exchange API] firestoreUpdate:", documentPath)
  
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${documentPath}?key=${FIREBASE_API_KEY}`
  
  const firestoreFields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string") {
      firestoreFields[key] = { stringValue: value }
    } else if (typeof value === "boolean") {
      firestoreFields[key] = { booleanValue: value }
    }
  }
  firestoreFields["updatedAt"] = { timestampValue: new Date().toISOString() }

  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: firestoreFields })
  })

  console.log("[Exchange API] firestoreUpdate result:", response.status)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Firestore update failed: ${response.status} - ${JSON.stringify(error)}`)
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  console.log("[Exchange API] POST request received")
  
  try {
    const body = await parseRequestBody<CreateExchangeBody>(request)
    if (!body) {
      return ApiErrors.badRequest("Invalid request body")
    }
    console.log("[Exchange API] Body:", JSON.stringify(body))

    const {
      itemId,
      itemTitle,
      ownerId,
      ownerEmail,
      requesterId,
      requesterEmail,
      requesterName,
    } = body

    // Validate required fields
    const validation = validateRequiredFields(body, ["itemId", "ownerId", "requesterId"])
    if (!validation.valid) {
      console.log("[Exchange API] Missing required fields:", validation.missing)
      return ApiErrors.missingFields(validation.missing)
    }

    // Create exchange document
    console.log("[Exchange API] Creating exchange...")
    const exchangeData = {
      itemId,
      itemTitle: itemTitle || "",
      ownerId,
      ownerEmail: ownerEmail || "",
      requesterId,
      requesterEmail: requesterEmail || "",
      status: "pending",
      ownerConfirmed: false,
      requesterConfirmed: false,
    }

    const exchangeId = await firestoreAdd("exchanges", exchangeData)
    console.log("[Exchange API] Created exchange:", exchangeId)

    // Create in-app notification for owner
    console.log("[Exchange API] Creating notification...")
    await firestoreAdd("notifications", {
      userId: ownerId,
      title: "มีคำขอใหม่",
      message: `มีผู้ขอแลกเปลี่ยน "${itemTitle}" ของคุณ`,
      type: "exchange",
      relatedId: exchangeId,
      isRead: false,
    })

    // Update item status to pending
    console.log("[Exchange API] Updating item status...")
    await firestoreUpdate(`items/${itemId}`, { status: "pending" })

    // ============ LINE Notification ============
    try {
      console.log("[Exchange API] Checking owner LINE status...")
      const ownerDoc = await firestoreGet(`users/${ownerId}`)
      
      if (ownerDoc?.fields) {
        const lineUserId = ownerDoc.fields.lineUserId?.stringValue
        const notificationsEnabled = ownerDoc.fields.lineNotifications?.mapValue?.fields?.enabled?.booleanValue
        const exchangeRequestEnabled = ownerDoc.fields.lineNotifications?.mapValue?.fields?.exchangeRequest?.booleanValue
        
        console.log("[Exchange API] Owner LINE status:", { 
          hasLineId: !!lineUserId, 
          notificationsEnabled, 
          exchangeRequestEnabled 
        })

        if (lineUserId && notificationsEnabled && exchangeRequestEnabled) {
          console.log("[Exchange API] Sending LINE notification...")
          
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
          
          console.log("[Exchange API] LINE notification sent!")
        }
      }
    } catch (lineError) {
      console.error("[Exchange API] LINE notification error:", lineError)
      // Don't fail the whole request if LINE fails
    }

    console.log("[Exchange API] Success!")
    return successResponse({ exchangeId })
  } catch (error) {
    console.error("[Exchange API] Error:", error)
    return ApiErrors.internalError(error instanceof Error ? error.message : "Internal server error")
  }
}

