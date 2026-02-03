/**
 * Admin Item Detail API
 * GET /api/admin/items/[id]
 * PATCH /api/admin/items/[id] — แก้ไขโพส (แจ้งเตือนเจ้าของในเว็บ + LINE)
 * DELETE /api/admin/items/[id]
 */

import { NextRequest } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from '@/lib/admin-api'
import { itemUpdateSchema } from '@/lib/schemas'
import { generateKeywords } from '@/lib/db/items-helpers'
import { z } from 'zod'

const adminItemPatchSchema = itemUpdateSchema.extend({
  imageUrls: z.array(z.string().url()).max(5).optional().nullable(),
}).partial()

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const { id } = await params
    const db = getAdminDb()
    const itemRef = db.collection('items').doc(id)
    const itemSnap = await itemRef.get()

    if (!itemSnap.exists) {
      return errorResponse(AdminErrorCode.NOT_FOUND, 'Item not found', 404)
    }

    const body = await request.json().catch(() => ({}))
    const parsed = adminItemPatchSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(
        AdminErrorCode.VALIDATION_ERROR,
        parsed.error.flatten().fieldErrors ? String(parsed.error.message) : 'Validation failed',
        400
      )
    }

    const data = parsed.data as Record<string, unknown>
    const itemData = itemSnap.data() as Record<string, unknown>
    const postedBy = itemData.postedBy as string
    const currentTitle = (itemData.title as string) || ''
    const currentDescription = (itemData.description as string) || ''

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (data.title !== undefined) updates.title = data.title
    if (data.description !== undefined) updates.description = data.description
    if (data.category !== undefined) updates.category = data.category
    if (data.location !== undefined) updates.location = data.location
    if (data.locationDetail !== undefined) updates.locationDetail = data.locationDetail
    if (data.imageUrls !== undefined) updates.imageUrls = data.imageUrls

    if (data.title || data.description) {
      const title = (data.title as string) ?? currentTitle
      const description = (data.description as string) ?? currentDescription
      updates.searchKeywords = generateKeywords(title, description)
    }

    await itemRef.update(updates)

    // แจ้งเตือนเจ้าของในเว็บ (notification)
    await db.collection('notifications').add({
      userId: postedBy,
      title: 'โพสถูกแก้ไขโดยผู้ดูแล',
      message: `โพส "${data.title ?? currentTitle}" ถูกแก้ไขโดยผู้ดูแลระบบ กรุณาตรวจสอบรายละเอียด`,
      type: 'system',
      relatedId: id,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    })

    // แจ้งเตือน LINE (ถ้าเจ้าของเชื่อม LINE และเปิดการแจ้งเตือน)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin
      const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || ''
      await fetch(`${baseUrl}/api/line/notify-user-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            userId: postedBy,
            action: 'item_edited_by_admin',
            itemTitle: data.title ?? currentTitle,
          }),
        })
    } catch (e) {
      console.error('[Admin PATCH Item] LINE notify error:', e)
    }

    return successResponse({ success: true, message: 'Item updated' })
  } catch (err) {
    console.error('[Admin API] PATCH item error:', err)
    return errorResponse(AdminErrorCode.INTERNAL_ERROR, 'Failed to update item', 500)
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
