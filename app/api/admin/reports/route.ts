/**
 * Admin Reports API
 * GET /api/admin/reports
 */

import { NextRequest } from 'next/server'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  parsePaginationParams,
  parseFilterParams,
  AdminErrorCode,
} from '@/lib/admin-api'

export async function GET(request: NextRequest) {
  // Verify admin access
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const pagination = parsePaginationParams(request)
    const filters = parseFilterParams(request)
    const db = getFirebaseDb()

    // Build query
    let q = query(
      collection(db, 'reports'),
      orderBy(pagination.sortBy, pagination.sortOrder),
      limit(pagination.limit)
    )

    // Apply filters
    if (filters.status) {
      q = query(q, where('status', '==', filters.status))
    }
    if (filters.type) {
      q = query(q, where('reportType', '==', filters.type))
    }

    const snapshot = await getDocs(q)
    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    return successResponse(
      { reports },
      {
        page: pagination.page,
        limit: pagination.limit,
        total: reports.length,
        totalPages: Math.ceil(reports.length / pagination.limit),
      }
    )
  } catch (error) {
    console.error('[Admin API] Error fetching reports:', error)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      'Failed to fetch reports',
      500
    )
  }
}
