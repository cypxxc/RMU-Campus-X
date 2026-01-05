/**
 * Admin Items API
 * GET /api/admin/items
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

import type { Item } from '@/types'

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
      collection(db, 'items'),
      orderBy(pagination.sortBy, pagination.sortOrder),
      limit(pagination.limit)
    )

    // Apply filters
    if (filters.status) {
      q = query(q, where('status', '==', filters.status))
    }
    if (filters.category) {
      q = query(q, where('category', '==', filters.category))
    }

    const snapshot = await getDocs(q)
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Item))

    // Apply search filter (client-side)
    let filteredItems = items
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredItems = items.filter(
        item =>
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
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      'Failed to fetch items',
      500
    )
  }
}
