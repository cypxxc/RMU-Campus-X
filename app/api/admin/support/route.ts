/**
 * Admin Support Tickets API
 * GET /api/admin/support
 */

import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import {
  verifyAdminAccess,
  successResponse,
  errorResponse,
  AdminErrorCode,
} from "@/lib/admin-api"
import type { SupportTicketStatus } from "@/types"

const VALID_STATUSES = new Set<SupportTicketStatus>([
  "new",
  "in_progress",
  "resolved",
  "closed",
])

function toISO(value: unknown): string | null {
  if (!value) return null
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  if (typeof (value as { toMillis?: () => number }).toMillis === "function") {
    return new Date((value as { toMillis: () => number }).toMillis()).toISOString()
  }
  if (typeof value === "string") return value
  if (typeof value === "number") return new Date(value).toISOString()
  return null
}

function parseStatuses(raw: string | null): SupportTicketStatus[] {
  if (!raw) return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is SupportTicketStatus => VALID_STATUSES.has(s as SupportTicketStatus))
}

function serializeTicket(doc: FirebaseFirestore.QueryDocumentSnapshot) {
  const data = doc.data() as Record<string, unknown>
  const messages = Array.isArray(data.messages)
    ? data.messages.map((msg) => {
        if (!msg || typeof msg !== "object") return msg
        const m = msg as Record<string, unknown>
        return {
          ...m,
          createdAt: toISO(m.createdAt),
        }
      })
    : []

  return {
    id: doc.id,
    subject: data.subject,
    category: data.category,
    description: data.description,
    userId: data.userId,
    userEmail: data.userEmail,
    status: data.status,
    adminReply: data.adminReply,
    messages,
    repliedBy: data.repliedBy,
    repliedByEmail: data.repliedByEmail,
    repliedAt: toISO(data.repliedAt),
    resolvedAt: toISO(data.resolvedAt),
    createdAt: toISO(data.createdAt),
    updatedAt: toISO(data.updatedAt),
  }
}

export async function GET(request: NextRequest) {
  const { authorized, error } = await verifyAdminAccess(request)
  if (!authorized) return error!

  try {
    const { searchParams } = new URL(request.url)
    const pageSize = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100)
    const cursor = searchParams.get("cursor")
    const statuses = parseStatuses(searchParams.get("status"))

    const db = getAdminDb()

    let baseQuery: FirebaseFirestore.Query = db.collection("support_tickets")
    if (statuses.length === 1) {
      baseQuery = baseQuery.where("status", "==", statuses[0])
    } else if (statuses.length > 1) {
      baseQuery = baseQuery.where("status", "in", statuses.slice(0, 10))
    }

    let paginatedQuery = baseQuery.orderBy("createdAt", "desc")
    if (cursor) {
      const cursorSnap = await db.collection("support_tickets").doc(cursor).get()
      if (cursorSnap.exists) {
        paginatedQuery = paginatedQuery.startAfter(cursorSnap)
      }
    }

    const snapshot = await paginatedQuery.limit(pageSize + 1).get()
    const hasMore = snapshot.docs.length > pageSize
    const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs
    const lastId = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1]!.id : null

    let totalCount = pageDocs.length
    try {
      const countSnap = await baseQuery.count().get()
      totalCount = countSnap.data().count ?? pageDocs.length
    } catch {
      totalCount = pageDocs.length
    }

    return successResponse({
      tickets: pageDocs.map(serializeTicket),
      lastId,
      hasMore,
      totalCount,
    })
  } catch (err) {
    console.error("[Admin API] Support GET Error:", err)
    return errorResponse(AdminErrorCode.INTERNAL_ERROR, "Failed to fetch support tickets", 500)
  }
}
