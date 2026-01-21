// ============================================================
// Event Listeners - Notification Handlers
// ============================================================

import { getEventBus } from "../event-bus"
import { EVENT_TYPES } from "../event-types"
import type {
  ExchangeCreatedEvent,
  ExchangeAcceptedEvent,
  ExchangeCompletedEvent,
  UserSuspendedEvent,
  UserWarningIssuedEvent,
} from "../event-types"

// ============ Notification Listener ============

export function registerNotificationListeners(): void {
  const eventBus = getEventBus()

  // Exchange Created -> Notify item owner
  eventBus.on<ExchangeCreatedEvent>(EVENT_TYPES.EXCHANGE_CREATED, async (event) => {
    const { exchange } = event.payload
    console.log(
      `[Notification] Exchange request: ${exchange.requesterEmail} wants to exchange for "${exchange.itemTitle}"`
    )
    
    // TODO: Integrate with actual notification service
    // await notificationService.create({
    //   userId: exchange.ownerId,
    //   title: "มีคนขอแลกเปลี่ยนของคุณ",
    //   message: `${exchange.requesterEmail} ขอแลกเปลี่ยน "${exchange.itemTitle}"`,
    //   type: "exchange",
    //   relatedId: exchange.id,
    // })
  })

  // Exchange Accepted -> Notify requester
  eventBus.on<ExchangeAcceptedEvent>(EVENT_TYPES.EXCHANGE_ACCEPTED, async (event) => {
    const { exchange } = event.payload
    console.log(`[Notification] Exchange accepted: "${exchange.itemTitle}"`)
  })

  // Exchange Completed -> Notify both parties
  eventBus.on<ExchangeCompletedEvent>(EVENT_TYPES.EXCHANGE_COMPLETED, async (event) => {
    const { exchange } = event.payload
    console.log(`[Notification] Exchange completed: "${exchange.itemTitle}"`)
  })

  // User Suspended -> Notify user
  eventBus.on<UserSuspendedEvent>(EVENT_TYPES.USER_SUSPENDED, async (event) => {
    const { userId, reason } = event.payload
    console.log(`[Notification] User suspended: ${userId}, reason: ${reason}`)
  })

  // Warning Issued -> Notify user
  eventBus.on<UserWarningIssuedEvent>(EVENT_TYPES.USER_WARNING_ISSUED, async (event) => {
    const { userId, reason, warningCount } = event.payload
    console.log(`[Notification] Warning issued to ${userId}: ${reason} (Count: ${warningCount})`)
  })
}

// ============ LINE Notification Listener ============

export function registerLineNotificationListeners(): void {
  const eventBus = getEventBus()

  eventBus.on<ExchangeCreatedEvent>(EVENT_TYPES.EXCHANGE_CREATED, async (event) => {
    const { exchange } = event.payload
    console.log(`[LINE] Would notify ${exchange.ownerId} about new exchange request`)
    
    // TODO: Integrate with LINE service
    // await lineService.notifyExchangeRequest(exchange.ownerId, exchange)
  })

  eventBus.on<UserSuspendedEvent>(EVENT_TYPES.USER_SUSPENDED, async (event) => {
    const { userId, reason: _reason, suspendedUntil: _suspendedUntil } = event.payload
    console.log(`[LINE] Would notify ${userId} about suspension`)
    
    // TODO: Integrate with LINE service
    // await lineService.notifyUserStatusChange(userId, "SUSPENDED", reason, suspendedUntil)
  })
}

// ============ Audit Log Listener ============

export function registerAuditLogListeners(): void {
  const eventBus = getEventBus()

  // Log all user-related events
  eventBus.on<UserSuspendedEvent>(EVENT_TYPES.USER_SUSPENDED, async (event) => {
    console.log(`[AuditLog] User suspended:`, event.payload)
    
    // TODO: Create audit log entry
    // await auditLogRepository.create({
    //   action: "user_suspended",
    //   targetId: event.payload.userId,
    //   adminId: event.payload.adminId,
    //   details: event.payload,
    // })
  })

  eventBus.on<UserWarningIssuedEvent>(EVENT_TYPES.USER_WARNING_ISSUED, async (event) => {
    console.log(`[AuditLog] Warning issued:`, event.payload)
  })
}

// ============ Initialize All Listeners ============

let listenersRegistered = false

export function registerAllEventListeners(): void {
  if (listenersRegistered) {
    console.warn("[Events] Listeners already registered")
    return
  }

  registerNotificationListeners()
  registerLineNotificationListeners()
  registerAuditLogListeners()

  listenersRegistered = true
  console.log("[Events] All event listeners registered")
}
