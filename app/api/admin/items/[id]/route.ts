/**
 * Admin Item Detail API
 * GET /api/admin/items/[id]
 * DELETE /api/admin/items/[id]
 */

import { NextRequest } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
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
    const db = getAdminDb()
    
    const itemSnap = await db.collection('items').doc(id).get()
    
    if (!itemSnap.exists) {
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
    const db = getAdminDb()
    
    const itemRef = db.collection('items').doc(id)
    const itemSnap = await itemRef.get()
    
    if (!itemSnap.exists) {
        return errorResponse(AdminErrorCode.NOT_FOUND, "Item not found", 404)
    }

    // Guard: Check for active exchanges
    const exchangesQuery = db.collection('exchanges')
        .where('itemId', '==', id)
        .where('status', 'in', ['pending', 'accepted', 'in_progress'])
        .limit(1)
        
    const activeExchanges = await exchangesQuery.get()
    
    if (!activeExchanges.empty) {
        return errorResponse(
            AdminErrorCode.CONFLICT,
            "Cannot delete item with active exchanges. Please cancel exchanges first.",
            409
        )
    }

    await itemRef.delete()

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
