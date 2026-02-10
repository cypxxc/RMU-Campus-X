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

async function getLatestWarningReason(
  db: FirebaseFirestore.Firestore,
  userId: string
): Promise<string> {
  try {
    const latestWarningSnap = await db
      .collection("userWarnings")
      .where("userId", "==", userId)
      .orderBy("issuedAt", "desc")
      .limit(1)
      .get()

    if (!latestWarningSnap.empty) {
      const reason = latestWarningSnap.docs[0]?.data()?.reason
      if (typeof reason === "string") return reason.trim()
    }
  } catch (error) {
    console.warn("[Users Me API] Could not read latest warning with ordered query:", error)
  }

  try {
    const fallbackWarningSnap = await db
      .collection("userWarnings")
      .where("userId", "==", userId)
      .limit(1)
      .get()

    if (!fallbackWarningSnap.empty) {
      const reason = fallbackWarningSnap.docs[0]?.data()?.reason
      if (typeof reason === "string") return reason.trim()
    }
  } catch (error) {
    console.warn("[Users Me API] Could not read warning reason with fallback query:", error)
  }

  return ""
}

/** GET /api/users/me – ดึงโปรไฟล์ผู้ใช้ */
export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")
    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const db = getAdminDb()
    const [userSnap, adminSnap] = await Promise.all([
      db.collection("users").doc(decoded.uid).get(),
      db.collection("admins").doc(decoded.uid).get(),
    ])

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
      await db.collection("users").doc(decoded.uid).set(initial)
      data = { ...initial, createdAt: new Date(), updatedAt: new Date() }
    } else {
      data = userSnap.data() as Record<string, unknown>
      // Auto-unsuspend ฝั่ง server ถ้าถึงเวลาแล้ว
      if (data?.status === "SUSPENDED" && data.suspendedUntil) {
        const until = (data.suspendedUntil as { toDate?: () => Date })?.toDate?.() ?? (typeof data.suspendedUntil === "string" ? new Date(data.suspendedUntil) : null)
        if (until && new Date() >= until) {
          const ref = db.collection("users").doc(decoded.uid)
          await ref.update({
            status: "ACTIVE",
            restrictions: { canPost: true, canExchange: true, canChat: true },
            suspendedUntil: null,
            updatedAt: FieldValue.serverTimestamp(),
          })
          data = { ...data, status: "ACTIVE", restrictions: { canPost: true, canExchange: true, canChat: true }, suspendedUntil: null }
        }
      }
    }

    const warningCount = Number(data.warningCount) || 0
    const latestWarningReason =
      warningCount > 0 ? await getLatestWarningReason(db, decoded.uid) : ""

    const isAdmin = adminSnap.exists
    return successResponse({
      user: {
        id: userSnap.id || decoded.uid,
        ...data,
        latestWarningReason,
        isAdmin,
      },
    })
  } catch (e) {
    console.error("[Users Me API] GET Error:", e)
    return ApiErrors.internalError("Internal server error")
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

