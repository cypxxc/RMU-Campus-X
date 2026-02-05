/**
 * Admin Announcements API
 * GET: รายการประกาศทั้งหมด
 * POST: สร้างประกาศใหม่
 */

import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from "@/lib/admin-api"
import type { AnnouncementType } from "@/types"

function toDate(v: unknown): Date | null {
  if (!v) return null
  if (typeof (v as { toDate?: () => Date }).toDate === "function") return (v as { toDate: () => Date }).toDate()
  if (typeof v === "string" || typeof v === "number") return new Date(v)
  return null
}

export async function GET(request: NextRequest) {
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const db = getAdminDb()
    const snapshot = await db
      .collection("announcements")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get()

    const announcements = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title ?? "",
        message: data.message ?? "",
        type: (data.type as AnnouncementType) ?? "info",
        isActive: data.isActive ?? true,
        startAt: data.startAt ?? null,
        endAt: data.endAt ?? null,
        linkUrl: data.linkUrl ?? null,
        linkLabel: data.linkLabel ?? null,
        createdBy: data.createdBy ?? "",
        createdByEmail: data.createdByEmail ?? undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
    })

    return successResponse({ announcements })
  } catch (err) {
    console.error("[Admin API] Announcements GET Error:", err)
    return errorResponse(AdminErrorCode.INTERNAL_ERROR, "Failed to fetch announcements", 500)
  }
}

const VALID_TYPES: AnnouncementType[] = ["info", "warning", "critical"]

export async function POST(request: NextRequest) {
  const { authorized, error, user } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const body = await request.json()
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const type = VALID_TYPES.includes(body.type) ? body.type : "info"
    const isActive = body.isActive !== false
    const linkUrl = typeof body.linkUrl === "string" ? body.linkUrl.trim() || null : null
    const linkLabel = typeof body.linkLabel === "string" ? body.linkLabel.trim() || null : null

    let startAt: Date | null = null
    let endAt: Date | null = null
    if (body.startAt) {
      const d = new Date(body.startAt)
      if (!isNaN(d.getTime())) startAt = d
    }
    if (body.endAt) {
      const d = new Date(body.endAt)
      if (!isNaN(d.getTime())) endAt = d
    }

    if (!title) {
      return errorResponse(AdminErrorCode.VALIDATION_ERROR, "กรุณาระบุหัวข้อประกาศ", 400)
    }
    if (!message) {
      return errorResponse(AdminErrorCode.VALIDATION_ERROR, "กรุณาระบุเนื้อหาประกาศ", 400)
    }

    const db = getAdminDb()
    const ref = await db.collection("announcements").add({
      title,
      message,
      type,
      isActive,
      startAt: startAt ? Timestamp.fromDate(startAt) : null,
      endAt: endAt ? Timestamp.fromDate(endAt) : null,
      linkUrl,
      linkLabel,
      createdBy: user?.uid ?? "",
      createdByEmail: user?.email ?? "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return successResponse({ id: ref.id }, undefined as any)
  } catch (err) {
    console.error("[Admin API] Announcements POST Error:", err)
    return errorResponse(AdminErrorCode.INTERNAL_ERROR, "Failed to create announcement", 500)
  }
}
