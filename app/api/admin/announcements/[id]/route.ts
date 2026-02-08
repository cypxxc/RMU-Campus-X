/**
 * Admin Announcement by ID
 * PATCH: ห้ามแก้ไข (ประกาศที่เผยแพร่แล้วแก้ไขไม่ได้)
 * DELETE: ลบประกาศ
 */

import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from "@/lib/admin-api"

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, error } = await verifyAdminAccess(_request)
  if (!authorized) return error!

  const { id } = await params
  if (!id) return errorResponse(AdminErrorCode.VALIDATION_ERROR, "Missing announcement ID", 400)

  return errorResponse(AdminErrorCode.FORBIDDEN, "ประกาศที่เผยแพร่แล้วไม่สามารถแก้ไขได้", 403)
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
