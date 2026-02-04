/**
 * Admin Support Tickets API
 * GET /api/admin/support
 */

import { NextRequest } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from '@/lib/admin-api'

export async function GET(request: NextRequest) {
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 200)
    const db = getAdminDb()
    const snapshot = await db
      .collection('support_tickets')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    const tickets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
    return successResponse({ tickets })
  } catch (err) {
    console.error('[Admin API] Support GET Error:', err)
    return errorResponse(AdminErrorCode.INTERNAL_ERROR, 'Failed to fetch support tickets', 500)
  }
}
