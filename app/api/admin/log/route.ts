/**
 * Admin Log API Route
 * Creates admin activity logs using Admin SDK (server-side for audit integrity)
 */

import { NextRequest } from "next/server"
import { successResponse, ApiErrors, validateRequiredFields, parseRequestBody, getAuthToken } from "@/lib/api-response"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

interface AdminLogBody {
  actionType: string
  targetType: 'user' | 'item' | 'report' | 'ticket' | 'exchange' | 'system'
  targetId: string
  targetInfo?: string
  description: string
  status: 'success' | 'failed'
  reason?: string
  beforeState?: Record<string, any>
  afterState?: Record<string, any>
  metadata?: Record<string, any>
}

/** Strip undefined values so Firestore accepts the document */
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      !(v instanceof Date) &&
      typeof (v as { toDate?: () => unknown }).toDate !== "function"
    ) {
      result[k] = stripUndefined(v as Record<string, unknown>)
    } else {
      result[k] = v
    }
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const token = getAuthToken(request)
    if (!token) {
      return ApiErrors.unauthorized("Missing authentication token")
    }
    
    const decodedToken = await verifyIdToken(token, true)
    if (!decodedToken) {
      return ApiErrors.unauthorized("Invalid or expired session")
    }

    // 2. Verify Admin Status
    const db = getAdminDb()
    const adminDoc = await db.collection("admins").doc(decodedToken.uid).get()
    
    if (!adminDoc.exists) {
      return ApiErrors.forbidden("Admin access required")
    }

    // 3. Parse and Validate Body
    const body = await parseRequestBody<AdminLogBody>(request)
    if (!body) {
      return ApiErrors.badRequest("Invalid request body")
    }

    const validation = validateRequiredFields(body, ["actionType", "targetType", "targetId", "description", "status"])
    if (!validation.valid) {
      return ApiErrors.missingFields(validation.missing)
    }

    // 4. Get Admin Info
    const userDoc = await db.collection("users").doc(decodedToken.uid).get()
    const adminEmail = userDoc.exists ? userDoc.data()?.email : decodedToken.email || "unknown"

    // 5. Create Log Entry (strip undefined so Firestore accepts beforeState/afterState)
    const sanitized = stripUndefined(body as unknown as Record<string, unknown>)
    const logRef = await db.collection("adminLogs").add({
      ...sanitized,
      adminId: decodedToken.uid,
      adminEmail: adminEmail,
      createdAt: FieldValue.serverTimestamp()
    })

    return successResponse({ success: true, logId: logRef.id })

  } catch (error: any) {
    console.error("[AdminLog API] Error:", error)
    return ApiErrors.internalError(error.message)
  }
}
