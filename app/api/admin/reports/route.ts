/**
 * Admin Reports API
 * GET /api/admin/reports
 */

import { NextRequest } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  parsePaginationParams,
  parseFilterParams,
  AdminErrorCode,
} from '@/lib/admin-api'

class AdminReportsController {
  async get(request: NextRequest) {
    const { authorized, error } = await verifyAdminAccess(request)
    if (!authorized) return error!

    try {
      const pagination = parsePaginationParams(request)
      const filters = parseFilterParams(request)
      const db = getAdminDb()

      let q: FirebaseFirestore.Query = db
        .collection('reports')
        .orderBy(pagination.sortBy, pagination.sortOrder)
        .limit(pagination.limit)

      if (filters.status) {
        q = q.where('status', '==', filters.status)
      }
      if (filters.type) {
        q = q.where('reportType', '==', filters.type)
      }

      const snapshot = await q.get()
      const reports = snapshot.docs.map((doc) => ({
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
      return errorResponse(AdminErrorCode.INTERNAL_ERROR, 'Failed to fetch reports', 500)
    }
  }
}

const controller = new AdminReportsController()

export async function GET(request: NextRequest) {
  return controller.get(request)
}
