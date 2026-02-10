/**
 * Admin Announcements API
 * GET: list all announcements
 * POST: create a new announcement
 */

import { NextRequest } from "next/server"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from "@/lib/admin-api"
import type { AnnouncementType } from "@/types"

const VALID_TYPES: AnnouncementType[] = ["info", "warning", "critical"]

function parseOptionalDate(input: unknown): Date | null {
  if (!input) return null
  const date = new Date(String(input))
  return Number.isNaN(date.getTime()) ? null : date
}

function parseOptionalText(input: unknown): string | null {
  if (typeof input !== "string") return null
  const value = input.trim()
  return value.length > 0 ? value : null
}

function parseType(input: unknown): AnnouncementType {
  return VALID_TYPES.includes(input as AnnouncementType) ? (input as AnnouncementType) : "info"
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
        type: parseType(data.type),
        isActive: data.isActive ?? true,
        startAt: data.startAt ?? null,
        endAt: data.endAt ?? null,
        linkUrl: data.linkUrl ?? null,
        linkLabel: data.linkLabel ?? null,
        imagePublicId: data.imagePublicId ?? null,
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

export async function POST(request: NextRequest) {
  const { authorized, error, user } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const body = await request.json()
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const type = parseType(body.type)
    const isActive = body.isActive !== false
    const startAt = parseOptionalDate(body.startAt)
    const endAt = parseOptionalDate(body.endAt)
    const linkUrl = parseOptionalText(body.linkUrl)
    const linkLabel = parseOptionalText(body.linkLabel)
    const imagePublicId = parseOptionalText(body.imagePublicId)

    if (!title) {
      return errorResponse(AdminErrorCode.VALIDATION_ERROR, "กรุณาระบุหัวข้อประกาศ", 400)
    }
    if (!message) {
      return errorResponse(AdminErrorCode.VALIDATION_ERROR, "กรุณาระบุเนื้อหาประกาศ", 400)
    }
    if (startAt && endAt && endAt < startAt) {
      return errorResponse(AdminErrorCode.VALIDATION_ERROR, "วันหมดอายุต้องมากกว่าวันเริ่มแสดง", 400)
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
      imagePublicId,
      createdBy: user?.uid ?? "",
      createdByEmail: user?.email ?? "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return successResponse({ id: ref.id })
  } catch (err) {
    console.error("[Admin API] Announcements POST Error:", err)
    return errorResponse(AdminErrorCode.INTERNAL_ERROR, "Failed to create announcement", 500)
  }
}

