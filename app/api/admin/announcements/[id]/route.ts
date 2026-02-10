/**
 * Admin Announcement by ID
 * PATCH: update announcement
 * DELETE: delete announcement
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

function parseType(input: unknown): AnnouncementType {
  return VALID_TYPES.includes(input as AnnouncementType) ? (input as AnnouncementType) : "info"
}

function hasKey(obj: unknown, key: string): boolean {
  return !!obj && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, key)
}

function parseOptionalText(input: unknown): string | null {
  if (input == null) return null
  if (typeof input !== "string") return null
  const value = input.trim()
  return value.length > 0 ? value : null
}

function toDate(input: unknown): Date | null {
  if (!input) return null
  if (typeof (input as { toDate?: () => Date }).toDate === "function") {
    const parsed = (input as { toDate: () => Date }).toDate()
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof (input as { toMillis?: () => number }).toMillis === "function") {
    const parsed = new Date((input as { toMillis: () => number }).toMillis())
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const parsed = new Date(String(input))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseDateInput(input: unknown): { value: Date | null; valid: boolean } {
  if (input == null || input === "") return { value: null, valid: true }
  const parsed = new Date(String(input))
  if (Number.isNaN(parsed.getTime())) return { value: null, valid: false }
  return { value: parsed, valid: true }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  const { id } = await params
  if (!id) return errorResponse(AdminErrorCode.VALIDATION_ERROR, "Missing announcement ID", 400)

  try {
    const db = getAdminDb()
    const ref = db.collection("announcements").doc(id)
    const snap = await ref.get()
    if (!snap.exists) return errorResponse(AdminErrorCode.NOT_FOUND, "ไม่พบประกาศนี้", 404)

    const current = snap.data() ?? {}
    const body = await request.json().catch(() => ({}))

    const titleSource = hasKey(body, "title") ? body.title : current.title
    const messageSource = hasKey(body, "message") ? body.message : current.message
    const title = typeof titleSource === "string" ? titleSource.trim() : ""
    const message = typeof messageSource === "string" ? messageSource.trim() : ""
    if (!title) {
      return errorResponse(AdminErrorCode.VALIDATION_ERROR, "กรุณาระบุหัวข้อประกาศ", 400)
    }
    if (!message) {
      return errorResponse(AdminErrorCode.VALIDATION_ERROR, "กรุณาระบุเนื้อหาประกาศ", 400)
    }

    const type = hasKey(body, "type") ? parseType(body.type) : parseType(current.type)
    const isActive = hasKey(body, "isActive") ? body.isActive !== false : current.isActive !== false
    const linkUrl = hasKey(body, "linkUrl") ? parseOptionalText(body.linkUrl) : (current.linkUrl ?? null)
    const linkLabel = hasKey(body, "linkLabel") ? parseOptionalText(body.linkLabel) : (current.linkLabel ?? null)
    const imagePublicId = hasKey(body, "imagePublicId")
      ? parseOptionalText(body.imagePublicId)
      : (current.imagePublicId ?? null)

    const startInput = hasKey(body, "startAt")
      ? parseDateInput(body.startAt)
      : { value: toDate(current.startAt), valid: true }
    const endInput = hasKey(body, "endAt")
      ? parseDateInput(body.endAt)
      : { value: toDate(current.endAt), valid: true }

    if (!startInput.valid) {
      return errorResponse(AdminErrorCode.VALIDATION_ERROR, "รูปแบบวันเริ่มแสดงไม่ถูกต้อง", 400)
    }
    if (!endInput.valid) {
      return errorResponse(AdminErrorCode.VALIDATION_ERROR, "รูปแบบวันหมดอายุไม่ถูกต้อง", 400)
    }
    if (startInput.value && endInput.value && endInput.value < startInput.value) {
      return errorResponse(AdminErrorCode.VALIDATION_ERROR, "วันหมดอายุต้องมากกว่าวันเริ่มแสดง", 400)
    }

    await ref.update({
      title,
      message,
      type,
      isActive,
      startAt: startInput.value ? Timestamp.fromDate(startInput.value) : null,
      endAt: endInput.value ? Timestamp.fromDate(endInput.value) : null,
      linkUrl,
      linkLabel,
      imagePublicId,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return successResponse({ id })
  } catch (err) {
    console.error("[Admin API] Announcement PATCH Error:", err)
    return errorResponse(AdminErrorCode.INTERNAL_ERROR, "Failed to update announcement", 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  const { id } = await params
  if (!id) return errorResponse(AdminErrorCode.VALIDATION_ERROR, "Missing announcement ID", 400)

  try {
    const db = getAdminDb()
    const ref = db.collection("announcements").doc(id)
    const snap = await ref.get()
    if (!snap.exists) return errorResponse(AdminErrorCode.NOT_FOUND, "ไม่พบประกาศนี้", 404)
    await ref.delete()
    return successResponse({ id })
  } catch (err) {
    console.error("[Admin API] Announcement DELETE Error:", err)
    return errorResponse(AdminErrorCode.INTERNAL_ERROR, "Failed to delete announcement", 500)
  }
}

