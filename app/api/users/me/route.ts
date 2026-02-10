/**
 * Users Me API – โปรไฟล์ผู้ใช้ที่ล็อกอิน
 * GET: ดึงโปรไฟล์
 * PATCH: แก้ไขโปรไฟล์ (displayName, photoURL, bio)
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { ApiErrors, getAuthToken, successResponse } from "@/lib/api-response"
import { userProfileSchema } from "@/lib/schemas"

const ADMIN_CACHE_TTL_MS = 60_000
const adminFlagCache = new Map<string, { isAdmin: boolean; at: number }>()
const WARNING_REASON_CACHE_TTL_MS = 60_000
const warningReasonCache = new Map<string, { reason: string; at: number }>()

interface TimingMetric {
  name: string
  durMs: number
}

function withServerTiming(response: NextResponse, metrics: TimingMetric[]): NextResponse {
  const header = metrics
    .filter((m) => Number.isFinite(m.durMs) && m.durMs >= 0)
    .map((m) => `${m.name};dur=${Math.round(m.durMs * 10) / 10}`)
    .join(", ")

  if (header) response.headers.set("Server-Timing", header)
  response.headers.set("Timing-Allow-Origin", "*")
  return response
}

function parseDateValue(value: unknown): Date | null {
  if (!value) return null
  if (typeof value === "string") return new Date(value)
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate()
  }
  return null
}

function getCachedAdminFlag(uid: string): boolean | null {
  const cached = adminFlagCache.get(uid)
  if (!cached) return null
  if (Date.now() - cached.at > ADMIN_CACHE_TTL_MS) {
    adminFlagCache.delete(uid)
    return null
  }
  return cached.isAdmin
}

function setCachedAdminFlag(uid: string, isAdmin: boolean): void {
  adminFlagCache.set(uid, { isAdmin, at: Date.now() })
  if (adminFlagCache.size > 1000) {
    const oldestKey = adminFlagCache.keys().next().value as string | undefined
    if (oldestKey) adminFlagCache.delete(oldestKey)
  }
}

function getCachedWarningReason(uid: string): string | null {
  const cached = warningReasonCache.get(uid)
  if (!cached) return null
  if (Date.now() - cached.at > WARNING_REASON_CACHE_TTL_MS) {
    warningReasonCache.delete(uid)
    return null
  }
  return cached.reason
}

function setCachedWarningReason(uid: string, reason: string): void {
  warningReasonCache.set(uid, { reason, at: Date.now() })
  if (warningReasonCache.size > 1000) {
    const oldestKey = warningReasonCache.keys().next().value as string | undefined
    if (oldestKey) warningReasonCache.delete(oldestKey)
  }
}

async function getAdminFlag(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<boolean> {
  const cached = getCachedAdminFlag(uid)
  if (cached !== null) return cached
  const adminSnap = await db.collection("admins").doc(uid).get()
  const isAdmin = adminSnap.exists
  setCachedAdminFlag(uid, isAdmin)
  return isAdmin
}

async function getLatestWarningReason(
  db: FirebaseFirestore.Firestore,
  userId: string
): Promise<string> {
  const cached = getCachedWarningReason(userId)
  if (cached !== null) return cached

  try {
    const latestWarningSnap = await db
      .collection("userWarnings")
      .where("userId", "==", userId)
      .orderBy("issuedAt", "desc")
      .limit(1)
      .select("reason")
      .get()

    if (latestWarningSnap.empty) {
      setCachedWarningReason(userId, "")
      return ""
    }
    const reason = latestWarningSnap.docs[0]?.get("reason")
    const normalized = typeof reason === "string" ? reason.trim() : ""
    setCachedWarningReason(userId, normalized)
    return normalized
  } catch (error) {
    console.warn("[Users Me API] Could not read latest warning with ordered query:", error)
  }

  try {
    const fallbackWarningSnap = await db
      .collection("userWarnings")
      .where("userId", "==", userId)
      .limit(1)
      .select("reason")
      .get()

    if (fallbackWarningSnap.empty) {
      setCachedWarningReason(userId, "")
      return ""
    }
    const reason = fallbackWarningSnap.docs[0]?.get("reason")
    const normalized = typeof reason === "string" ? reason.trim() : ""
    setCachedWarningReason(userId, normalized)
    return normalized
  } catch (error) {
    console.warn("[Users Me API] Could not read warning reason with fallback query:", error)
    return ""
  }
}

/** GET /api/users/me – ดึงโปรไฟล์ผู้ใช้ */
export async function GET(request: NextRequest) {
  const startedAt = Date.now()
  let verifyMs = 0
  let userReadMs = 0
  let userWriteMs = 0
  let unsuspendWriteMs = 0
  let warningMs = 0
  let adminMs = 0

  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    // Avoid extra users doc read in verifyIdToken(checkStatus=true); this route reads user doc anyway.
    const verifyStartedAt = Date.now()
    const decoded = await verifyIdToken(token)
    verifyMs = Date.now() - verifyStartedAt
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const db = getAdminDb()
    const userRef = db.collection("users").doc(decoded.uid)
    const userReadStartedAt = Date.now()
    const userSnap = await userRef.get()
    userReadMs = Date.now() - userReadStartedAt

    let data: Record<string, unknown>
    if (!userSnap.exists) {
      // สร้าง user doc ฝั่ง server ถ้ายังไม่มี (เช่น login ครั้งแรกจาก provider อื่น)
      const now = FieldValue.serverTimestamp()
      const initial = {
        uid: decoded.uid,
        email: decoded.email ?? "",
        displayName: (decoded.name as string) || (decoded.email as string)?.split("@")[0] || "",
        photoURL: (decoded.picture as string) || "",
        status: "ACTIVE",
        warningCount: 0,
        suspensionCount: 0,
        restrictions: { canPost: true, canExchange: true, canChat: true },
        termsAccepted: false,
        createdAt: now,
        updatedAt: now,
      }
      const userWriteStartedAt = Date.now()
      await userRef.set(initial)
      userWriteMs = Date.now() - userWriteStartedAt
      data = { ...initial, createdAt: new Date(), updatedAt: new Date() }
    } else {
      data = userSnap.data() as Record<string, unknown>
      // Auto-unsuspend ฝั่ง server ถ้าถึงเวลาแล้ว
      if (data?.status === "SUSPENDED" && data.suspendedUntil) {
        const until = parseDateValue(data.suspendedUntil)
        if (until && new Date() >= until) {
          const unsuspendWriteStartedAt = Date.now()
          await userRef.update({
            status: "ACTIVE",
            restrictions: { canPost: true, canExchange: true, canChat: true },
            suspendedUntil: null,
            updatedAt: FieldValue.serverTimestamp(),
          })
          unsuspendWriteMs = Date.now() - unsuspendWriteStartedAt
          data = { ...data, status: "ACTIVE", restrictions: { canPost: true, canExchange: true, canChat: true }, suspendedUntil: null }
        }
      }
    }

    const userStatus = typeof data.status === "string" ? data.status : "ACTIVE"
    if (userStatus !== "ACTIVE" && userStatus !== "WARNING") {
      return ApiErrors.unauthorized("Account is not allowed to access this endpoint")
    }

    const warningCount = Number(data.warningCount) || 0
    const warningTask =
      warningCount > 0
        ? (async () => {
            const warningStartedAt = Date.now()
            const latestWarningReason = await getLatestWarningReason(db, decoded.uid)
            warningMs = Date.now() - warningStartedAt
            return latestWarningReason
          })()
        : Promise.resolve("")

    const adminTask = (async () => {
      const adminStartedAt = Date.now()
      const isAdmin = await getAdminFlag(db, decoded.uid)
      adminMs = Date.now() - adminStartedAt
      return isAdmin
    })()

    const [latestWarningReason, isAdmin] = await Promise.all([warningTask, adminTask])

    const response = successResponse({
      user: {
        id: decoded.uid,
        ...data,
        latestWarningReason,
        isAdmin,
      },
    })
    const totalMs = Date.now() - startedAt
    return withServerTiming(response, [
      { name: "verify", durMs: verifyMs },
      { name: "user_read", durMs: userReadMs },
      { name: "user_write", durMs: userWriteMs },
      { name: "unsuspend_write", durMs: unsuspendWriteMs },
      { name: "warning", durMs: warningMs },
      { name: "admin", durMs: adminMs },
      { name: "total", durMs: totalMs },
    ])
  } catch (e) {
    console.error("[Users Me API] GET Error:", e)
    const totalMs = Date.now() - startedAt
    return withServerTiming(ApiErrors.internalError("Internal server error"), [
      { name: "verify", durMs: verifyMs },
      { name: "user_read", durMs: userReadMs },
      { name: "user_write", durMs: userWriteMs },
      { name: "unsuspend_write", durMs: unsuspendWriteMs },
      { name: "warning", durMs: warningMs },
      { name: "admin", durMs: adminMs },
      { name: "total", durMs: totalMs },
    ])
  }
}

/** PATCH /api/users/me – แก้ไขโปรไฟล์ (displayName, photoURL, bio) */
export async function PATCH(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return ApiErrors.badRequest("Invalid JSON body")
    }
    const parsed = userProfileSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const ref = db.collection("users").doc(decoded.uid)
    const updates: Record<string, unknown> = {
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
    }
    await ref.update(updates)
    return NextResponse.json({ success: true, message: "Profile updated" })
  } catch (e) {
    console.error("[Users Me API] PATCH Error:", e)
    return ApiErrors.internalError("Internal server error")
  }
}

