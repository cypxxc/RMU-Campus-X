/**
 * Admin Items API
 * GET /api/admin/items
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

import type { Item } from '@/types'

class AdminItemsController {
  async get(request: NextRequest) {
    const { authorized, error } = await verifyAdminAccess(request)
    if (!authorized) return error!

    try {
      const pagination = parsePaginationParams(request)
      const filters = parseFilterParams(request)
      const db = getAdminDb()

      let q: FirebaseFirestore.Query = db
        .collection('items')
        .orderBy(pagination.sortBy, pagination.sortOrder)
        .limit(pagination.limit)

      if (filters.status) {
        q = q.where('status', '==', filters.status)
      }
      if (filters.category) {
        q = q.where('category', '==', filters.category)
      }

      const snapshot = await q.get()
      const items = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Item
      )

      let filteredItems = items
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredItems = items.filter(
          (item) =>
            item.title?.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower)
        )
      }

      return successResponse(
        { items: filteredItems },
        {
          page: pagination.page,
          limit: pagination.limit,
          total: filteredItems.length,
          totalPages: Math.ceil(filteredItems.length / pagination.limit),
        }
      )
    } catch (error) {
      console.error('[Admin API] Error fetching items:', error)
      return errorResponse(AdminErrorCode.INTERNAL_ERROR, 'Failed to fetch items', 500)
    }
  }
}

const controller = new AdminItemsController()

export async function GET(request: NextRequest) {
  return controller.get(request)
}
