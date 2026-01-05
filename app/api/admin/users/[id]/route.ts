/**
 * Admin User Detail API
 * GET /api/admin/users/[id]
 * PATCH /api/admin/users/[id]
 */

import { NextRequest } from 'next/server'
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from '@/lib/admin-api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin access
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const { id } = await params
    const db = getFirebaseDb()
    
    // Get user
    const userRef = doc(db, 'users', id)
    const userSnap = await getDoc(userRef)
    
    if (!userSnap.exists()) {
      return errorResponse(
        AdminErrorCode.NOT_FOUND,
        'User not found',
        404
      )
    }

    const userData = { id: userSnap.id, ...userSnap.data() }

    // Get user's items
    const itemsQuery = query(collection(db, 'items'), where('postedBy', '==', id))
    const itemsSnap = await getDocs(itemsQuery)
    const items = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Get user's exchanges
    const exchangesQuery = query(
      collection(db, 'exchanges'),
      where('ownerId', '==', id)
    )
    const exchangesSnap = await getDocs(exchangesQuery)
    const exchanges = exchangesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; status?: string }))

    // Get reports about this user
    const reportsQuery = query(
      collection(db, 'reports'),
      where('reportedUserId', '==', id)
    )
    const reportsSnap = await getDocs(reportsQuery)
    const reports = reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    return successResponse({
      user: userData,
      stats: {
        itemsPosted: items.length,
        exchangesCompleted: exchanges.filter(e => e.status === 'completed').length,
        reportsReceived: reports.length,
      },
      items,
      exchanges,
      reports,
    })
  } catch (error) {
    console.error('[Admin API] Error fetching user:', error)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      'Failed to fetch user details',
      500
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin access
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const { id } = await params
    const body = await request.json()
    const db = getFirebaseDb()
    
    const userRef = doc(db, 'users', id)
    await updateDoc(userRef, body)

    return successResponse({ success: true })
  } catch (error) {
    console.error('[Admin API] Error updating user:', error)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      'Failed to update user',
      500
    )
  }
}
