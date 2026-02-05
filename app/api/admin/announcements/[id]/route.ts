/**
 * Admin Announcement by ID
 * PATCH: แก้ไขประกาศ
 * DELETE: ลบประกาศ
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

const VALID_TYPES: AnnouncementType[] = ["info", "warning", "critical"]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, error, user } = await verifyAdminAccess(request)
  if (!authorized) return error!

  const { id } = await params
  if (!id) return errorResponse(AdminErrorCode.VALIDATION_ERROR, "Missing announcement ID", 400)

  try {
    const body = await request.json()
    const db = getAdminDb()
    const ref = db.collection("announcements").doc(id)
    const snap = await ref.get()
    if (!snap.exists) return errorResponse(AdminErrorCode.NOT_FOUND, "ไม่พบประกาศนี้", 404)

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (typeof body.title === "string") updates.title = body.title.trim()
    if (typeof body.message === "string") updates.message = body.message.trim()
    if (VALID_TYPES.includes(body.type)) updates.type = body.type
    if (typeof body.isActive === "boolean") updates.isActive = body.isActive
    if (body.linkUrl !== undefined) updates.linkUrl = typeof body.linkUrl === "string" ? body.linkUrl.trim() || null : null
    if (body.linkLabel !== undefined) updates.linkLabel = typeof body.linkLabel === "string" ? body.linkLabel.trim() || null : null

    if (body.startAt !== undefined) {
      if (body.startAt == null) updates.startAt = null
      else {
        const d = new Date(body.startAt)
        if (!isNaN(d.getTime())) updates.startAt = Timestamp.fromDate(d)
      }
    }
    if (body.endAt !== undefined) {
      if (body.endAt == null) updates.endAt = null
      else {
        const d = new Date(body.endAt)
        if (!isNaN(d.getTime())) updates.endAt = Timestamp.fromDate(d)
      }
    }

    await ref.update(updates)
    return successResponse({ id })
  } catch (err) {
    console.error("[Admin API] Announcement PATCH Error:", err)
    return errorResponse(AdminErrorCode.INTERNAL_ERROR, "Failed to update announcement", 500)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, error } = await verifyAdminAccess(_request)
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
