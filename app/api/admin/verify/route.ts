/**
 * Admin Verify API
 * GET /api/admin/verify
 * 
 * Lightweight endpoint to check if the current user is an admin.
 * Used by admin pages instead of client-side Firestore queries.
 */

import { NextRequest } from 'next/server'
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from '@/lib/admin-api'

export async function GET(request: NextRequest) {
  try {
    const { authorized, user, error } = await verifyAdminAccess(request)
    if (!authorized) return error!

    return successResponse({
      isAdmin: true,
      uid: user?.uid,
      email: user?.email,
    })
  } catch (error) {
    console.error('[Admin Verify] Error:', error)
    return errorResponse(AdminErrorCode.INTERNAL_ERROR, 'Internal server error', 500)
  }
}
