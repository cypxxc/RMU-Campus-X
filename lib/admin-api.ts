/**
 * Admin API Utilities
 * Helper functions for admin API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { SystemLogger } from './services/logger'
import { checkRateLimitScalable, getClientIP } from './upstash-rate-limiter'
import { log } from './logger'
// import { isAdmin } from './admin-auth' // Removed, using server-side check

/**
 * Standard API Response format
 */
export interface AdminApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Error codes for admin API
 */
export enum AdminErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
}

const DEFAULT_ADMIN_MUTATION_LIMIT = 30
const DEFAULT_ADMIN_MUTATION_WINDOW_MS = 60_000

class AdminApiService {
  successResponse<T>(
    data: T,
    pagination?: AdminApiResponse['pagination']
  ): NextResponse<AdminApiResponse<T>> {
    return NextResponse.json({
      success: true,
      data,
      ...(pagination && { pagination }),
    })
  }

  errorResponse(
    code: AdminErrorCode,
    message: string,
    status: number = 400,
    details?: any
  ): NextResponse<AdminApiResponse> {
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          ...(details && { details }),
        },
      },
      { status }
    )
  }

  async verifyAdminAccess(request: NextRequest): Promise<{
    authorized: boolean
    user?: any
    error?: NextResponse
  }> {
    try {
      const token = getAuthToken(request)

      if (!token) {
        return {
          authorized: false,
          error: this.errorResponse(
            AdminErrorCode.UNAUTHORIZED,
            'Authentication required (Bearer Token)',
            401
          ),
        }
      }

      const decodedToken = await verifyIdToken(token)
      if (!decodedToken) {
        return {
          authorized: false,
          error: this.errorResponse(
            AdminErrorCode.UNAUTHORIZED,
            'Invalid or expired token',
            401
          ),
        }
      }

      const userEmail = decodedToken.email ?? null
      const db = getAdminDb()
      const adminsRef = db.collection('admins')
      const adminDocByUid = await adminsRef.doc(decodedToken.uid).get()

      let adminData: FirebaseFirestore.DocumentData | undefined

      if (adminDocByUid.exists) {
        adminData = adminDocByUid.data()
      } else if (userEmail) {
        const snapshot = await adminsRef.where('email', '==', userEmail).limit(1).get()
        if (!snapshot.empty) {
          adminData = snapshot.docs[0]?.data()
        }
      }

      if (!adminData) {
        return {
          authorized: false,
          error: this.errorResponse(
            AdminErrorCode.FORBIDDEN,
            'Admin access required',
            403
          ),
        }
      }

      return {
        authorized: true,
        user: {
          uid: decodedToken.uid,
          email: userEmail ?? adminData.email,
          ...adminData
        },
      }
    } catch (error) {
      await SystemLogger.logError(error, 'AdminAPI:Auth', 'CRITICAL')
      return {
        authorized: false,
        error: this.errorResponse(
          AdminErrorCode.INTERNAL_ERROR,
          'Internal server error during auth',
          500
        ),
      }
    }
  }

  async enforceAdminMutationRateLimit(
    request: NextRequest,
    adminUid: string,
    action: string,
    limit: number = DEFAULT_ADMIN_MUTATION_LIMIT,
    windowMs: number = DEFAULT_ADMIN_MUTATION_WINDOW_MS
  ): Promise<NextResponse | null> {
    try {
      const clientIp = getClientIP(request)
      const rateKey = `admin:mutation:${action}:${adminUid}:${clientIp}`
      const rate = await checkRateLimitScalable(rateKey, limit, windowMs)

      if (rate.allowed) return null

      log.security('admin_mutation_rate_limited', {
        action,
        adminUid,
        ip: clientIp,
        resetTime: rate.resetTime,
      })

      return this.errorResponse(
        AdminErrorCode.RATE_LIMITED,
        'Too many admin mutation requests. Please try again shortly.',
        429
      )
    } catch (error) {
      log.warn('Admin mutation rate limiter unavailable', {
        action,
        adminUid,
        error: error instanceof Error ? error.message : String(error),
      }, 'AdminAPI')
      return null
    }
  }

  parsePaginationParams(request: NextRequest) {
    const { searchParams } = new URL(request.url)

    return {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
    }
  }

  parseFilterParams(request: NextRequest) {
    const { searchParams } = new URL(request.url)

    return {
      status: searchParams.get('status'),
      search: searchParams.get('search'),
      category: searchParams.get('category'),
      type: searchParams.get('type'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    }
  }

  async buildPaginatedQuery(
    collectionName: string,
    options: {
      page: number
      limit: number
      sortBy: string
      sortOrder: 'asc' | 'desc'
      filters?: Record<string, unknown>
    }
  ) {
    const db = getAdminDb()
    const { page, limit: pageLimit, sortBy, sortOrder, filters } = options

    let ref = db.collection(collectionName) as FirebaseFirestore.Query

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          ref = ref.where(key, '==', value)
        }
      })
    }

    ref = ref.orderBy(sortBy, sortOrder)

    if (page > 1) {
      const prevLimit = (page - 1) * pageLimit
      const prevSnapshot = await ref.limit(prevLimit).get()
      const lastDoc = prevSnapshot.docs[prevSnapshot.docs.length - 1]
      if (lastDoc) {
        ref = ref.startAfter(lastDoc)
      }
    }

    const snapshot = await ref.limit(pageLimit).get()

    let total: number
    try {
      const countSnap = await db.collection(collectionName).count().get()
      total = countSnap.data().count ?? snapshot.size
    } catch {
      total = snapshot.size
    }

    return {
      docs: snapshot.docs,
      pagination: {
        page,
        limit: pageLimit,
        total,
        totalPages: Math.ceil(total / pageLimit),
      },
    }
  }
}

const adminApiService = new AdminApiService()

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  pagination?: AdminApiResponse['pagination']
): NextResponse<AdminApiResponse<T>> {
  return adminApiService.successResponse(data, pagination)
}

/**
 * Create error response
 */
export function errorResponse(
  code: AdminErrorCode,
  message: string,
  status: number = 400,
  details?: any
): NextResponse<AdminApiResponse> {
  return adminApiService.errorResponse(code, message, status, details)
}

/**
 * Verify admin access
 */
/**
 * Verify admin access using Firebase ID Token
 */
import { verifyIdToken, getAdminDb } from './firebase-admin'
import { getAuthToken } from './api-response'

export async function verifyAdminAccess(request: NextRequest): Promise<{
  authorized: boolean
  user?: any
  error?: NextResponse
}> {
  return adminApiService.verifyAdminAccess(request)
}

/**
 * Rate limit mutating admin operations by admin user + client IP.
 * Returns a ready-to-send response when throttled, otherwise null.
 */
export async function enforceAdminMutationRateLimit(
  request: NextRequest,
  adminUid: string,
  action: string,
  limit: number = DEFAULT_ADMIN_MUTATION_LIMIT,
  windowMs: number = DEFAULT_ADMIN_MUTATION_WINDOW_MS
): Promise<NextResponse | null> {
  return adminApiService.enforceAdminMutationRateLimit(request, adminUid, action, limit, windowMs)
}

/**
 * Parse pagination params from request
 */
export function parsePaginationParams(request: NextRequest) {
  return adminApiService.parsePaginationParams(request)
}

/**
 * Parse filter params from request
 */
export function parseFilterParams(request: NextRequest) {
  return adminApiService.parseFilterParams(request)
}

/**
 * Build Firestore query with pagination (uses Admin SDK – for API routes only)
 */
export async function buildPaginatedQuery(
  collectionName: string,
  options: {
    page: number
    limit: number
    sortBy: string
    sortOrder: 'asc' | 'desc'
    filters?: Record<string, unknown>
  }
) {
  return adminApiService.buildPaginatedQuery(collectionName, options)
}

// function logAdminAction removed. Use createAdminLog from @/lib/db/logs instead.
