/**
 * Notifications API Route
 * POST: create notification (system/cross-user)
 * GET: list notifications of authenticated user
 */

import { NextRequest } from "next/server"
import {
  successResponse,
  ApiErrors,
  validateRequiredFields,
  parseRequestBody,
  getAuthToken,
} from "@/lib/api-response"
import { getAdminDb, verifyIdToken } from "@/lib/firebase-admin"
import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore"
import type { NotificationType } from "@/types"
import { log } from "@/lib/logger"
import { isAdmin } from "@/lib/admin-auth"
import { checkRateLimitScalable, getClientIP } from "@/lib/upstash-rate-limiter"
import { deliverInAppNotification } from "@/lib/server/notification-delivery"

const ALLOWED_NOTIFICATION_TYPES: NotificationType[] = [
  "exchange",
  "chat",
  "report",
  "system",
  "warning",
  "support",
]

const NOTIFICATION_POST_LIMIT = 30
const NOTIFICATION_POST_WINDOW_MS = 60_000
const MAX_TITLE_LENGTH = 150
const MAX_MESSAGE_LENGTH = 2000

interface NotificationBody {
  userId: string
  title: string
  message: string
  type: NotificationType
  relatedId?: string
  senderId?: string
}

interface FilteredFallbackOptions {
  userId: string
  notificationTypes: NotificationType[]
  isReadFilter?: boolean
  pageSize: number
  lastId?: string
}

function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length <= maxLength ? trimmed : trimmed.slice(0, maxLength)
}

function parseBooleanParam(value: string | null, paramName: string): boolean | undefined {
  if (value === null) return undefined
  if (value === "true") return true
  if (value === "false") return false
  throw new Error(`Invalid ${paramName}. Use true or false.`)
}

function parseNotificationTypes(value: string | null): NotificationType[] {
  if (!value) return []

  const types = Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  )

  if (types.length > 10) {
    throw new Error("Maximum 10 notification types per request")
  }

  const invalid = types.filter((type) => !ALLOWED_NOTIFICATION_TYPES.includes(type as NotificationType))
  if (invalid.length > 0) {
    throw new Error(`Invalid notification type(s): ${invalid.join(", ")}`)
  }

  return types as NotificationType[]
}

function isIndexError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes("failed_precondition") || lower.includes("requires an index") || lower.includes("index")
}

function matchesNotificationFilters(
  data: DocumentData,
  notificationTypes: NotificationType[],
  isReadFilter?: boolean
): boolean {
  if (notificationTypes.length > 0 && !notificationTypes.includes(data.type as NotificationType)) {
    return false
  }
  if (isReadFilter !== undefined && Boolean(data.isRead) !== isReadFilter) {
    return false
  }
  return true
}

async function fetchFilteredNotificationsWithoutCompositeIndexes(
  options: FilteredFallbackOptions
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const db = getAdminDb()
  const { userId, notificationTypes, isReadFilter, pageSize, lastId } = options
  const batchSize = Math.min(Math.max(pageSize * 3, 30), 100)

  const matchedDocs: QueryDocumentSnapshot<DocumentData>[] = []
  let cursorDoc: QueryDocumentSnapshot<DocumentData> | null = null
  let firstCursorApplied = false
  let reachedEnd = false
  let safety = 0

  while (matchedDocs.length < pageSize + 1 && !reachedEnd && safety < 10) {
    let q = db
      .collection("notifications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(batchSize)

    if (!firstCursorApplied && lastId) {
      const lastSnap = await db.collection("notifications").doc(lastId).get()
      if (lastSnap.exists) {
        q = q.startAfter(lastSnap)
      }
      firstCursorApplied = true
    } else if (cursorDoc) {
      q = q.startAfter(cursorDoc)
    }

    const raw = await q.get()
    if (raw.empty) break

    for (const doc of raw.docs) {
      if (matchesNotificationFilters(doc.data(), notificationTypes, isReadFilter)) {
        matchedDocs.push(doc)
        if (matchedDocs.length >= pageSize + 1) break
      }
    }

    cursorDoc = raw.docs[raw.docs.length - 1] ?? null
    if (raw.size < batchSize) reachedEnd = true
    safety += 1
  }

  return matchedDocs
}

async function countFilteredNotificationsWithoutCompositeIndexes(
  userId: string,
  notificationTypes: NotificationType[],
  isReadFilter?: boolean
): Promise<number> {
  const db = getAdminDb()
  const batchSize = 200
  let total = 0
  let cursorDoc: QueryDocumentSnapshot<DocumentData> | null = null
  let safety = 0

  while (safety < 200) {
    let q = db
      .collection("notifications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(batchSize)

    if (cursorDoc) {
      q = q.startAfter(cursorDoc)
    }

    const snap = await q.get()
    if (snap.empty) break

    for (const doc of snap.docs) {
      if (matchesNotificationFilters(doc.data(), notificationTypes, isReadFilter)) {
        total += 1
      }
    }

    cursorDoc = snap.docs[snap.docs.length - 1] ?? null
    if (snap.size < batchSize) break
    safety += 1
  }

  return total
}

/** GET /api/notifications - list notifications of the logged-in user */
export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) return ApiErrors.unauthorized("Missing authentication token")

    const decoded = await verifyIdToken(token, true)
    if (!decoded) return ApiErrors.unauthorized("Invalid or expired session")

    const { searchParams } = new URL(request.url)
    const pageSizeRaw = Number(searchParams.get("pageSize"))
    const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(pageSizeRaw, 50) : 20
    const lastId = searchParams.get("lastId") ?? undefined

    let notificationTypes: NotificationType[] = []
    let unreadOnly: boolean | undefined
    let isReadParam: boolean | undefined
    let includeTotalCount = true
    try {
      notificationTypes = parseNotificationTypes(searchParams.get("types"))
      unreadOnly = parseBooleanParam(searchParams.get("unreadOnly"), "unreadOnly")
      isReadParam = parseBooleanParam(searchParams.get("isRead"), "isRead")
      includeTotalCount = parseBooleanParam(searchParams.get("includeTotalCount"), "includeTotalCount") ?? true
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Invalid query parameters"
      return ApiErrors.badRequest(message)
    }

    let isReadFilter: boolean | undefined
    if (unreadOnly === true) isReadFilter = false
    if (isReadParam !== undefined) {
      if (unreadOnly === true && isReadParam !== false) {
        return ApiErrors.badRequest("unreadOnly=true conflicts with isRead=true")
      }
      isReadFilter = isReadParam
    }

    const db = getAdminDb()
    let baseQuery = db.collection("notifications").where("userId", "==", decoded.uid)

    if (notificationTypes.length === 1) {
      baseQuery = baseQuery.where("type", "==", notificationTypes[0])
    } else if (notificationTypes.length > 1) {
      baseQuery = baseQuery.where("type", "in", notificationTypes)
    }

    if (isReadFilter !== undefined) {
      baseQuery = baseQuery.where("isRead", "==", isReadFilter)
    }

    let docs: QueryDocumentSnapshot<DocumentData>[] = []
    try {
      let q = baseQuery.orderBy("createdAt", "desc").limit(pageSize + 1)

      if (lastId) {
        const lastSnap = await db.collection("notifications").doc(lastId).get()
        if (lastSnap.exists) q = q.startAfter(lastSnap)
      }

      docs = (await q.get()).docs
    } catch (queryError) {
      const queryMessage = queryError instanceof Error ? queryError.message : String(queryError)
      const hasExtraFilters = notificationTypes.length > 0 || isReadFilter !== undefined
      if (!hasExtraFilters || !isIndexError(queryMessage)) {
        throw queryError
      }

      log.warn("Notifications query used fallback scan (missing composite index)", {
        userId: decoded.uid,
        hasTypeFilter: notificationTypes.length > 0,
        hasReadFilter: isReadFilter !== undefined,
      })

      docs = await fetchFilteredNotificationsWithoutCompositeIndexes({
        userId: decoded.uid,
        notificationTypes,
        isReadFilter,
        pageSize,
        lastId,
      })
    }

    const notifications = docs.map((d) => {
      const data = d.data()
      return { id: d.id, ...data }
    })

    const hasMore = notifications.length > pageSize
    const page = notifications.slice(0, pageSize)

    let totalCount: number | undefined
    if (includeTotalCount) {
      try {
        const countSnap = await baseQuery.count().get()
        totalCount = countSnap.data().count
      } catch (countError) {
        const countMessage = countError instanceof Error ? countError.message : String(countError)
        const hasExtraFilters = notificationTypes.length > 0 || isReadFilter !== undefined
        if (hasExtraFilters && isIndexError(countMessage)) {
          log.warn("Notifications count used fallback scan (missing composite index)", {
            userId: decoded.uid,
            hasTypeFilter: notificationTypes.length > 0,
            hasReadFilter: isReadFilter !== undefined,
          })
          totalCount = await countFilteredNotificationsWithoutCompositeIndexes(
            decoded.uid,
            notificationTypes,
            isReadFilter
          )
        } else {
          totalCount = undefined
        }
      }
    }

    return successResponse({
      notifications: page,
      lastId: page.length ? page[page.length - 1]?.id ?? null : null,
      hasMore,
      ...(totalCount !== undefined && { totalCount }),
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error"
    log.apiError("GET", "/api/notifications", e, { operation: "list-notifications" })
    if (message.includes("index") || message.includes("FAILED_PRECONDITION")) {
      return ApiErrors.internalError(
        "Notifications query requires a Firestore index. Run: firebase deploy --only firestore:indexes"
      )
    }
    return ApiErrors.internalError("Internal server error")
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request)
    if (!token) {
      return ApiErrors.unauthorized("Missing authentication token")
    }

    const decodedToken = await verifyIdToken(token, true)
    if (!decodedToken) {
      return ApiErrors.unauthorized("Invalid or expired session")
    }

    const clientIp = getClientIP(request)
    const rateKey = `notifications:post:${decodedToken.uid}:${clientIp}`
    const rate = await checkRateLimitScalable(
      rateKey,
      NOTIFICATION_POST_LIMIT,
      NOTIFICATION_POST_WINDOW_MS
    )
    if (!rate.allowed) {
      log.security("notifications_post_rate_limited", {
        userId: decodedToken.uid,
        ip: clientIp,
        resetTime: rate.resetTime,
      })
      return ApiErrors.rateLimited("Too many notification requests. Please try again shortly.")
    }

    const body = await parseRequestBody<NotificationBody>(request)
    if (!body) {
      return ApiErrors.badRequest("Invalid request body")
    }

    const validation = validateRequiredFields(body, ["userId", "title", "message", "type"])
    if (!validation.valid) {
      return ApiErrors.missingFields(validation.missing)
    }

    if (!ALLOWED_NOTIFICATION_TYPES.includes(body.type)) {
      return ApiErrors.badRequest(`Invalid notification type: ${body.type}`)
    }

    const targetUserId = normalizeText(body.userId, 128)
    if (!targetUserId) {
      return ApiErrors.badRequest("Invalid userId")
    }

    const title = normalizeText(body.title, MAX_TITLE_LENGTH)
    if (!title) {
      return ApiErrors.badRequest("Invalid title")
    }

    const message = normalizeText(body.message, MAX_MESSAGE_LENGTH)
    if (!message) {
      return ApiErrors.badRequest("Invalid message")
    }

    const requesterUserId = decodedToken.uid
    const requestedSenderId = normalizeText(body.senderId ?? null, 128)
    const isCrossUserNotification = targetUserId !== requesterUserId
    const adminOverride =
      isCrossUserNotification && decodedToken.email ? await isAdmin(decodedToken.email) : false

    if (isCrossUserNotification && !adminOverride) {
      log.security("notifications_cross_user_blocked", {
        requesterUserId,
        targetUserId,
        type: body.type,
      })
      return ApiErrors.forbidden("Creating notifications for other users is not allowed")
    }

    if (requestedSenderId && requestedSenderId !== requesterUserId && !adminOverride) {
      log.security("notifications_sender_spoof_blocked", {
        requesterUserId,
        requestedSenderId,
        targetUserId,
      })
      return ApiErrors.forbidden("Invalid senderId")
    }

    const effectiveSenderId = adminOverride
      ? requestedSenderId ?? requesterUserId
      : requesterUserId

    const db = getAdminDb()
    const delivery = await deliverInAppNotification(
      {
        userId: targetUserId,
        title,
        message,
        type: body.type,
        relatedId: normalizeText(body.relatedId ?? null, 128),
        senderId: effectiveSenderId,
      },
      {
        db,
        source: "api.notifications.post",
      }
    )

    if (!delivery.delivered && !delivery.queued) {
      return ApiErrors.internalError(delivery.error ?? "Unable to deliver notification")
    }

    return successResponse(
      {
        success: true,
        notificationId: delivery.notificationId ?? null,
        queueId: delivery.queueId ?? null,
        queued: delivery.queued,
        attempts: delivery.attempts,
      },
      delivery.delivered ? 200 : 202
    )
  } catch (error: unknown) {
    log.apiError("POST", "/api/notifications", error, { operation: "create-notification" })
    const message = error instanceof Error ? error.message : "Internal server error"
    return ApiErrors.internalError(message)
  }
}
