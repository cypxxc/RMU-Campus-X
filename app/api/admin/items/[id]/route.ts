/**
 * Admin Item Detail API
 * GET /api/admin/items/[id]
 * DELETE /api/admin/items/[id]
 */

import { NextRequest } from 'next/server'
import { doc, getDoc, deleteDoc } from 'firebase/firestore'
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
    
    const itemRef = doc(db, 'items', id)
    const itemSnap = await getDoc(itemRef)
    
    if (!itemSnap.exists()) {
      return errorResponse(
        AdminErrorCode.NOT_FOUND,
        'Item not found',
        404
      )
    }

    return successResponse({
      item: { id: itemSnap.id, ...itemSnap.data() },
    })
  } catch (error) {
    console.error('[Admin API] Error fetching item:', error)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      'Failed to fetch item',
      500
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin access
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const { id } = await params
    const db = getFirebaseDb()
    
    const itemRef = doc(db, 'items', id)
    await deleteDoc(itemRef)

    return successResponse({ success: true })
  } catch (error) {
    console.error('[Admin API] Error deleting item:', error)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      'Failed to delete item',
      500
    )
  }
}
