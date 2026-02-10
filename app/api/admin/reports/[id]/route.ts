/**
 * Admin Report Detail API
 * GET /api/admin/reports/[id]
 * PATCH /api/admin/reports/[id]
 */

import { NextRequest } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from '@/lib/admin-api'

const reportPatchSchema = z
  .object({
    status: z
      .enum([
        'new',
        'under_review',
        'waiting_user',
        'action_taken',
        'resolved',
        'closed',
        'rejected',
      ])
      .optional(),
    adminNote: z.string().trim().max(1000).optional(),
    resolvedAt: z.union([z.string(), z.null()]).optional(),
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
    
    const reportSnap = await db.collection('reports').doc(id).get()
    
    if (!reportSnap.exists) {
      return errorResponse(
        AdminErrorCode.NOT_FOUND,
        'Report not found',
        404
      )
    }

    return successResponse({
      report: { id: reportSnap.id, ...reportSnap.data() },
    })
  } catch (error) {
    console.error('[Admin API] Error fetching report:', error)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      'Failed to fetch report',
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
        'Missing report id',
        400
      )
    }

    const rawBody = await request.json().catch(() => null)
    const parsed = reportPatchSchema.safeParse(rawBody)
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

    const db = getAdminDb()
    const reportRef = db.collection('reports').doc(id)
    const reportSnap = await reportRef.get()
    if (!reportSnap.exists) {
      return errorResponse(
        AdminErrorCode.NOT_FOUND,
        'Report not found',
        404
      )
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (parsed.data.status) {
      updates.status = parsed.data.status
      updates.handledBy = user.uid
      updates.handledByEmail = user.email
      if (parsed.data.status === 'resolved' || parsed.data.status === 'closed') {
        updates.resolvedAt = FieldValue.serverTimestamp()
      }
    }

    if (parsed.data.adminNote !== undefined) {
      updates.adminNote = parsed.data.adminNote
    }

    if (parsed.data.resolvedAt !== undefined) {
      if (parsed.data.resolvedAt === null) {
        updates.resolvedAt = null
      } else {
        const resolvedAtDate = new Date(parsed.data.resolvedAt)
        if (Number.isNaN(resolvedAtDate.getTime())) {
          return errorResponse(
            AdminErrorCode.VALIDATION_ERROR,
            'resolvedAt must be a valid date string or null',
            400
          )
        }
        updates.resolvedAt = Timestamp.fromDate(resolvedAtDate)
      }
    }

    await reportRef.update(updates)

    return successResponse({ success: true })
  } catch (error) {
    console.error('[Admin API] Error updating report:', error)
    return errorResponse(
      AdminErrorCode.INTERNAL_ERROR,
      'Failed to update report',
      500
    )
  }
}
