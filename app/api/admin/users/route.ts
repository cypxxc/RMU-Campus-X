/**
 * Example Admin API Route - Users
 * app/api/admin/users/route.ts
 */

import { NextRequest } from 'next/server'
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  parsePaginationParams,
  parseFilterParams,
  buildPaginatedQuery,
  AdminErrorCode,
} from '@/lib/admin-api'

/**
 * GET /api/admin/users
 * List all users with pagination and filters
 */
export async function GET(request: NextRequest) {
  // Verify admin access
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    // Parse params
    const pagination = parsePaginationParams(request)
    const filters = parseFilterParams(request)

    // Build query
    const { docs, pagination: paginationData } = await buildPaginatedQuery('users', {
      ...pagination,
      filters: {
        ...(filters.status && { status: filters.status }),
      },
    })

    // Map documents to user data
    const users = docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        email: data.email,
        displayName: data.displayName,
        status: data.status,
        emailVerified: data.emailVerified,
        createdAt: data.createdAt?.toDate?.().toISOString(),
        warningCount: data.warningCount || 0,
      }
    })

    // Apply search filter (client-side for simplicity)
    let filteredUsers = users
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredUsers = users.filter(
        u =>
          u.email.toLowerCase().includes(searchLower) ||
          u.displayName?.toLowerCase().includes(searchLower)
      )
    }

    return successResponse(
      { users: filteredUsers },
      paginationData
    )
  } catch (error) {
    console.error('[Admin API] Error fetching users:', error)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      'Failed to fetch users',
      500
    )
  }
}
