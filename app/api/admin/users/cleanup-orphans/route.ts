/**
 * POST /api/admin/users/cleanup-orphans
 * ลบเอกสารผู้ใช้ใน Firestore ที่ไม่มีใน Firebase Auth แล้ว
 * ใช้เมื่อลบบัญชีจาก Firebase Console (Auth) แต่ข้อมูลใน Firestore ยังเหลืออยู่
 */

import { NextRequest } from "next/server"
import { verifyAdminAccess, successResponse, errorResponse, AdminErrorCode } from "@/lib/admin-api"
import { deleteOrphanUserDocs } from "@/lib/services/admin/user-cleanup"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const { deleted } = await deleteOrphanUserDocs()
    return successResponse({ deleted })
  } catch (e) {
    console.error("[cleanup-orphans]", e)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      e instanceof Error ? e.message : "Cleanup failed",
      500
    )
  }
}
