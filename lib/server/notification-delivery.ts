import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { log } from "@/lib/logger"
import type { NotificationType } from "@/types"

const RETRY_QUEUE_COLLECTION = "notificationRetryQueue"
const METRICS_COLLECTION = "notificationDeliveryMetrics"
const DEFAULT_IMMEDIATE_ATTEMPTS = 3
const DEFAULT_QUEUE_MAX_ATTEMPTS = 8
const DEFAULT_PROCESS_LIMIT = 50
const DEFAULT_STALE_MINUTES = 10
const DEFAULT_DEAD_LETTER_THRESHOLD = 0
const DEFAULT_STALE_PENDING_THRESHOLD = 0
const DEFAULT_PENDING_QUEUE_WARNING_THRESHOLD = 200
const QUEUE_BACKOFF_BASE_MS = 30_000
const QUEUE_BACKOFF_MAX_MS = 30 * 60_000

type QueueStatus = "pending" | "delivered" | "dead_letter"

export interface NotificationDeliveryInput {
  userId: string
  title: string
  message: string
  type: NotificationType
  relatedId?: string | null
  senderId?: string | null
}

interface NotificationPayload {
  userId: string
  title: string
  message: string
  type: NotificationType
  relatedId: string | null
  senderId: string | null
}

interface QueueDocument {
  userId?: unknown
  title?: unknown
  message?: unknown
  type?: unknown
  relatedId?: unknown
  senderId?: unknown
  status?: unknown
  attempts?: unknown
  maxAttempts?: unknown
}

export interface DeliverNotificationOptions {
  db?: Firestore
  source?: string
  maxImmediateAttempts?: number
  queueOnFailure?: boolean
  maxQueueAttempts?: number
}

export interface DeliverNotificationResult {
  delivered: boolean
  queued: boolean
  notificationId?: string
  queueId?: string
  attempts: number
  error?: string
}

export interface ProcessNotificationRetryOptions {
  db?: Firestore
  source?: string
  limit?: number
}

export interface ProcessNotificationRetryResult {
  processed: number
  delivered: number
  retried: number
  deadLetter: number
}

export interface NotificationDeliveryStats {
  pendingQueue: number
  stalePending: number
  deadLetter: number
  processedLastHour: number
  deliveredLastHour: number
  queuedLastHour: number
  retriedLastHour: number
  deadLetterLastHour: number
}

export interface NotificationDeliveryHealth {
  status: "healthy" | "degraded"
  reasons: string[]
  stats: NotificationDeliveryStats
}

function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function toSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  return trimmed.length <= maxLength ? trimmed : trimmed.slice(0, maxLength)
}

function normalizePayload(input: NotificationDeliveryInput): NotificationPayload | null {
  const userId = normalizeText(input.userId, 128)
  const title = normalizeText(input.title, 150)
  const message = normalizeText(input.message, 2000)
  const type = normalizeText(input.type, 32) as NotificationType
  const relatedId = normalizeText(input.relatedId ?? "", 128) || null
  const senderId = normalizeText(input.senderId ?? "", 128) || null

  if (!userId || !title || !message || !type) return null
  return { userId, title, message, type, relatedId, senderId }
}

async function addNotification(db: Firestore, payload: NotificationPayload): Promise<string> {
  const ref = await db.collection("notifications").add({
    userId: payload.userId,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    relatedId: payload.relatedId,
    senderId: payload.senderId,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  })
  return ref.id
}

async function writeMetric(
  db: Firestore,
  data: {
    event: string
    source: string
    processed?: number
    delivered?: number
    queued?: number
    retried?: number
    deadLetter?: number
    extra?: Record<string, unknown>
  }
): Promise<void> {
  try {
    await db.collection(METRICS_COLLECTION).add({
      event: data.event,
      source: data.source,
      processed: data.processed ?? 0,
      delivered: data.delivered ?? 0,
      queued: data.queued ?? 0,
      retried: data.retried ?? 0,
      deadLetter: data.deadLetter ?? 0,
      extra: data.extra ?? {},
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch (metricError) {
    log.warn("Failed to write notification delivery metric", {
      event: data.event,
      source: data.source,
      error: toSafeErrorMessage(metricError),
    })
  }
}

function queueBackoffMs(attempts: number): number {
  const exp = QUEUE_BACKOFF_BASE_MS * Math.pow(2, Math.max(0, attempts - 1))
  return Math.min(exp, QUEUE_BACKOFF_MAX_MS)
}

async function enqueueRetry(
  db: Firestore,
  payload: NotificationPayload,
  source: string,
  errorMessage: string,
  maxAttempts: number
): Promise<string | null> {
  try {
    const ref = await db.collection(RETRY_QUEUE_COLLECTION).add({
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      relatedId: payload.relatedId,
      senderId: payload.senderId,
      source,
      status: "pending" as QueueStatus,
      attempts: 0,
      maxAttempts,
      nextAttemptAt: Timestamp.fromDate(new Date()),
      lastError: errorMessage,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    await writeMetric(db, {
      event: "queued",
      source,
      queued: 1,
      extra: { queueId: ref.id, reason: errorMessage },
    })
    return ref.id
  } catch (queueError) {
    log.error("Failed to enqueue notification retry", {
      source,
      userId: payload.userId,
      error: toSafeErrorMessage(queueError),
      originalError: errorMessage,
    })
    return null
  }
}

function parseQueuePayload(data: QueueDocument): NotificationPayload | null {
  const rawType = normalizeText(data.type, 32) as NotificationType
  const input: NotificationDeliveryInput = {
    userId: normalizeText(data.userId, 128),
    title: normalizeText(data.title, 150),
    message: normalizeText(data.message, 2000),
    type: rawType,
    relatedId: normalizeText(data.relatedId, 128) || null,
    senderId: normalizeText(data.senderId, 128) || null,
  }
  return normalizePayload(input)
}

export async function deliverInAppNotification(
  input: NotificationDeliveryInput,
  options: DeliverNotificationOptions = {}
): Promise<DeliverNotificationResult> {
  const db = options.db ?? getAdminDb()
  const source = options.source ?? "unknown"
  const maxImmediateAttempts = Math.max(1, options.maxImmediateAttempts ?? DEFAULT_IMMEDIATE_ATTEMPTS)
  const queueOnFailure = options.queueOnFailure !== false
  const maxQueueAttempts = Math.max(1, options.maxQueueAttempts ?? DEFAULT_QUEUE_MAX_ATTEMPTS)
  const payload = normalizePayload(input)

  if (!payload) {
    return {
      delivered: false,
      queued: false,
      attempts: 0,
      error: "Invalid notification payload",
    }
  }

  let lastError = ""
  for (let attempt = 1; attempt <= maxImmediateAttempts; attempt += 1) {
    try {
      const notificationId = await addNotification(db, payload)
      await writeMetric(db, {
        event: "immediate_delivered",
        source,
        processed: 1,
        delivered: 1,
        extra: { attempt, notificationId },
      })
      return {
        delivered: true,
        queued: false,
        notificationId,
        attempts: attempt,
      }
    } catch (error) {
      lastError = toSafeErrorMessage(error)
      if (attempt < maxImmediateAttempts) {
        const delayMs = Math.min(150 * Math.pow(2, attempt - 1), 1000)
        await sleep(delayMs)
      }
    }
  }

  if (!queueOnFailure) {
    await writeMetric(db, {
      event: "immediate_failed",
      source,
      processed: 1,
      extra: { attempts: maxImmediateAttempts, error: lastError },
    })
    return {
      delivered: false,
      queued: false,
      attempts: maxImmediateAttempts,
      error: lastError,
    }
  }

  const queueId = await enqueueRetry(db, payload, source, lastError, maxQueueAttempts)
  return {
    delivered: false,
    queued: !!queueId,
    queueId: queueId ?? undefined,
    attempts: maxImmediateAttempts,
    error: lastError || "Notification delivery failed",
  }
}

export async function processNotificationRetryQueue(
  options: ProcessNotificationRetryOptions = {}
): Promise<ProcessNotificationRetryResult> {
  const db = options.db ?? getAdminDb()
  const source = options.source ?? "internal.retry-processor"
  const limit = Math.max(1, options.limit ?? DEFAULT_PROCESS_LIMIT)
  const now = Timestamp.fromDate(new Date())
  const result: ProcessNotificationRetryResult = {
    processed: 0,
    delivered: 0,
    retried: 0,
    deadLetter: 0,
  }

  const dueSnap = await db
    .collection(RETRY_QUEUE_COLLECTION)
    .where("status", "==", "pending")
    .where("nextAttemptAt", "<=", now)
    .orderBy("nextAttemptAt", "asc")
    .limit(limit)
    .get()

  for (const doc of dueSnap.docs) {
    result.processed += 1
    const data = doc.data() as QueueDocument
    const payload = parseQueuePayload(data)
    const attempts = Number(data.attempts) || 0
    const maxAttempts = Math.max(1, Number(data.maxAttempts) || DEFAULT_QUEUE_MAX_ATTEMPTS)

    if (!payload) {
      await doc.ref.update({
        status: "dead_letter",
        attempts: attempts + 1,
        lastError: "Invalid payload",
        deadLetterAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      result.deadLetter += 1
      continue
    }

    try {
      const notificationId = await addNotification(db, payload)
      await doc.ref.update({
        status: "delivered",
        notificationId,
        deliveredAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      result.delivered += 1
    } catch (error) {
      const nextAttempts = attempts + 1
      const errorMessage = toSafeErrorMessage(error)
      if (nextAttempts >= maxAttempts) {
        await doc.ref.update({
          status: "dead_letter",
          attempts: nextAttempts,
          lastError: errorMessage,
          deadLetterAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        result.deadLetter += 1
      } else {
        const nextAttemptAt = Timestamp.fromDate(new Date(Date.now() + queueBackoffMs(nextAttempts)))
        await doc.ref.update({
          status: "pending",
          attempts: nextAttempts,
          nextAttemptAt,
          lastError: errorMessage,
          updatedAt: FieldValue.serverTimestamp(),
        })
        result.retried += 1
      }
    }
  }

  if (result.processed > 0) {
    await writeMetric(db, {
      event: "queue_process",
      source,
      processed: result.processed,
      delivered: result.delivered,
      retried: result.retried,
      deadLetter: result.deadLetter,
      extra: { limit },
    })
  }

  return result
}

export async function getNotificationDeliveryStats(
  db: Firestore = getAdminDb()
): Promise<NotificationDeliveryStats> {
  const staleMinutes = Math.max(1, parseEnvInt("NOTIFICATION_STALE_MINUTES", DEFAULT_STALE_MINUTES))
  const staleBefore = Timestamp.fromDate(new Date(Date.now() - staleMinutes * 60_000))
  const oneHourAgo = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000))

  const [pendingSnap, staleSnap, deadSnap, metricsSnap] = await Promise.all([
    db.collection(RETRY_QUEUE_COLLECTION).where("status", "==", "pending").count().get(),
    db
      .collection(RETRY_QUEUE_COLLECTION)
      .where("status", "==", "pending")
      .where("nextAttemptAt", "<=", staleBefore)
      .count()
      .get(),
    db.collection(RETRY_QUEUE_COLLECTION).where("status", "==", "dead_letter").count().get(),
    db.collection(METRICS_COLLECTION).where("createdAt", ">=", oneHourAgo).get(),
  ])

  let processedLastHour = 0
  let deliveredLastHour = 0
  let queuedLastHour = 0
  let retriedLastHour = 0
  let deadLetterLastHour = 0

  metricsSnap.forEach((doc) => {
    const data = doc.data() as {
      processed?: unknown
      delivered?: unknown
      queued?: unknown
      retried?: unknown
      deadLetter?: unknown
    }
    processedLastHour += Number(data.processed) || 0
    deliveredLastHour += Number(data.delivered) || 0
    queuedLastHour += Number(data.queued) || 0
    retriedLastHour += Number(data.retried) || 0
    deadLetterLastHour += Number(data.deadLetter) || 0
  })

  return {
    pendingQueue: pendingSnap.data().count,
    stalePending: staleSnap.data().count,
    deadLetter: deadSnap.data().count,
    processedLastHour,
    deliveredLastHour,
    queuedLastHour,
    retriedLastHour,
    deadLetterLastHour,
  }
}

export async function getNotificationDeliveryHealth(
  db: Firestore = getAdminDb()
): Promise<NotificationDeliveryHealth> {
  const stats = await getNotificationDeliveryStats(db)
  const deadLetterThreshold = Math.max(
    0,
    parseEnvInt("NOTIFICATION_DEAD_LETTER_THRESHOLD", DEFAULT_DEAD_LETTER_THRESHOLD)
  )
  const stalePendingThreshold = Math.max(
    0,
    parseEnvInt("NOTIFICATION_STALE_PENDING_THRESHOLD", DEFAULT_STALE_PENDING_THRESHOLD)
  )
  const pendingQueueWarningThreshold = Math.max(
    1,
    parseEnvInt("NOTIFICATION_PENDING_QUEUE_WARNING_THRESHOLD", DEFAULT_PENDING_QUEUE_WARNING_THRESHOLD)
  )

  const reasons: string[] = []

  if (stats.deadLetter > deadLetterThreshold) {
    reasons.push(`dead-letter=${stats.deadLetter} > ${deadLetterThreshold}`)
  }
  if (stats.stalePending > stalePendingThreshold) {
    reasons.push(`stale-pending=${stats.stalePending} > ${stalePendingThreshold}`)
  }
  if (stats.pendingQueue > pendingQueueWarningThreshold) {
    reasons.push(`pending-queue=${stats.pendingQueue} > ${pendingQueueWarningThreshold}`)
  }

  return {
    status: reasons.length > 0 ? "degraded" : "healthy",
    reasons,
    stats,
  }
}

