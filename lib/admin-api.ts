/**
 * Admin API Utilities
 * Helper functions for admin API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, getDocs, limit, startAfter, orderBy, addDoc, serverTimestamp } from 'firebase/firestore'
import { getFirebaseDb } from './firebase'
import { SystemLogger } from './services/logger'
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
}

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  pagination?: AdminApiResponse['pagination']
): NextResponse<AdminApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(pagination && { pagination }),
  })
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
  try {
    // 1. Get Token
    const token = getAuthToken(request)
    
    if (!token) {
      return {
        authorized: false,
        error: errorResponse(
          AdminErrorCode.UNAUTHORIZED,
          'Authentication required (Bearer Token)',
          401
        ),
      }
    }

    // 2. Verify Token
    const decodedToken = await verifyIdToken(token)
    if (!decodedToken) {
      return {
        authorized: false,
        error: errorResponse(
          AdminErrorCode.UNAUTHORIZED,
          'Invalid or expired token',
          401
        ),
      }
    }
    
    const userEmail = decodedToken.email
    if (!userEmail) {
       return {
        authorized: false,
        error: errorResponse(
          AdminErrorCode.FORBIDDEN,
          'Token has no email',
          403
        ),
      }
    }

    // 3. Check Admin Status in Firestore (using Admin SDK)
    const db = getAdminDb()
    const adminsRef = db.collection('admins')
    const snapshot = await adminsRef.where('email', '==', userEmail).get()

    if (snapshot.empty) {
      return {
        authorized: false,
        error: errorResponse(
          AdminErrorCode.FORBIDDEN,
          'Admin access required',
          403
        ),
      }
    }

    // 4. Get Role (Optional, for granular permissions)
    const adminData = snapshot.docs[0]?.data() || {}
    // You could attach adminData.role to returns if needed

    return {
      authorized: true,
      user: { 
        uid: decodedToken.uid,
        email: userEmail,
        ...adminData 
      },
    }
  } catch (error) {
    await SystemLogger.logError(error, 'AdminAPI:Auth', 'CRITICAL')
    return {
      authorized: false,
      error: errorResponse(
        AdminErrorCode.INTERNAL_ERROR,
        'Internal server error during auth',
        500
      ),
    }
  }
}

/**
 * Parse pagination params from request
 */
export function parsePaginationParams(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  return {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
  }
}

/**
 * Parse filter params from request
 */
export function parseFilterParams(request: NextRequest) {
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

/**
 * Build Firestore query with pagination
 */
export async function buildPaginatedQuery(
  collectionName: string,
  options: {
    page: number
    limit: number
    sortBy: string
    sortOrder: 'asc' | 'desc'
    filters?: any
  }
) {
  const db = getFirebaseDb()
  const { page, limit: pageLimit, sortBy, sortOrder, filters } = options

  let constraints: any[] = [
    orderBy(sortBy, sortOrder),
    limit(pageLimit),
  ]

  // Add filters
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        constraints.unshift(where(key, '==', value))
      }
    })
  }

  // Add pagination
  if (page > 1) {
    // Get last document from previous page
    const prevQuery = query(
      collection(db, collectionName),
      ...constraints.slice(0, -1),
      limit((page - 1) * pageLimit)
    )
    const prevSnapshot = await getDocs(prevQuery)
    const lastDoc = prevSnapshot.docs[prevSnapshot.docs.length - 1]
    
    if (lastDoc) {
      constraints.push(startAfter(lastDoc))
    }
  }

  const q = query(collection(db, collectionName), ...constraints)
  const snapshot = await getDocs(q)

  // Get total count for pagination
  const countQuery = query(
    collection(db, collectionName),
    ...constraints.slice(0, -2) // Remove limit and startAfter
  )
  const countSnapshot = await getDocs(countQuery)
  const total = countSnapshot.size

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

// function logAdminAction removed. Use createAdminLog from @/lib/db/logs instead.
