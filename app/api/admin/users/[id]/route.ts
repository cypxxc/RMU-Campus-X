/**
 * Admin User Detail API
 * GET /api/admin/users/[id]
 * PATCH /api/admin/users/[id]
 */

import { NextRequest } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'
import { FieldValue } from "firebase-admin/firestore"
import { z } from 'zod'
import { sanitizeText } from '@/lib/security'
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from '@/lib/admin-api'

const adminUserPatchSchema = z
  .object({
    displayName: z.string().min(2).max(50).transform(sanitizeText).optional(),
    bio: z.string().max(300).transform(sanitizeText).optional(),
    photoURL: z.string().max(2000).optional(),
    status: z.enum(['ACTIVE', 'WARNING', 'SUSPENDED', 'BANNED']).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one updatable field is required',
  })

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
    
    // Get user
    const userSnap = await db.collection('users').doc(id).get()
    
    if (!userSnap.exists) {
      return errorResponse(
        AdminErrorCode.NOT_FOUND,
        'User not found',
        404
      )
    }

    const userData = { id: userSnap.id, ...userSnap.data() }

    // Get user's items
    const itemsSnap = await db.collection('items').where('postedBy', '==', id).get()
    const items = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Get user's exchanges
    const exchangesSnap = await db.collection('exchanges').where('ownerId', '==', id).get()
    const exchanges = exchangesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; status?: string }))

    // Get reports about this user
    const reportsSnap = await db.collection('reports').where('reportedUserId', '==', id).get()
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
  const { authorized, user, error } = await verifyAdminAccess(request)
  if (!authorized) return error!
  if (!user?.uid || !user?.email) {
    return errorResponse(
      AdminErrorCode.FORBIDDEN,
      'Admin identity missing',
      403
    )
  }

  try {
    const { id } = await params
    if (!id) {
      return errorResponse(
        AdminErrorCode.VALIDATION_ERROR,
        'Missing user id',
        400
      )
    }

    const rawBody = await request.json().catch(() => null)
    const parsed = adminUserPatchSchema.safeParse(rawBody)
    if (!parsed.success) {
      return errorResponse(
        AdminErrorCode.VALIDATION_ERROR,
        'Invalid request body',
        400,
        parsed.error.errors.map((issue) => ({
          field: issue.path.join('.') || 'root',
          message: issue.message,
        }))
      )
    }

    const updates = {
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
    }

    const db = getAdminDb()
    const auth = getAdminAuth()
    const userRef = db.collection('users').doc(id)
    const userSnap = await userRef.get()
    if (!userSnap.exists) {
      return errorResponse(
        AdminErrorCode.NOT_FOUND,
        'User not found',
        404
      )
    }

    // 1. Update Firestore (allow-list only)
    await userRef.update(updates)

    // 2. Handle Status Changes (Security Enforcement)
    if (parsed.data.status) {
      if (['SUSPENDED', 'BANNED'].includes(parsed.data.status)) {
        // Block Auth
        await auth.updateUser(id, { disabled: true })
        await auth.revokeRefreshTokens(id) // Force logout
        console.log(`[Admin] User ${id} blocked (disabled + tokens revoked)`)
      } else if (['ACTIVE', 'WARNING'].includes(parsed.data.status)) {
        // Unblock Auth
        await auth.updateUser(id, { disabled: false })
        console.log(`[Admin] User ${id} unblocked`)
      }

      // 3. Log Action
      await db.collection("adminLogs").add({
        actionType: 'user_status_change',
        adminId: user.uid,
        adminEmail: user.email,
        targetType: 'user',
        targetId: id,
        description: `Changed status to ${parsed.data.status}`,
        metadata: { newStatus: parsed.data.status },
        createdAt: FieldValue.serverTimestamp()
      })
    } else {
      // Generic update log
      await db.collection("adminLogs").add({
        actionType: 'user_update',
        adminId: user.uid,
        adminEmail: user.email,
        targetType: 'user',
        targetId: id,
        description: 'Updated user profile',
        metadata: { fields: Object.keys(parsed.data) },
        createdAt: FieldValue.serverTimestamp()
      })
    }

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
