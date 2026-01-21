// ============================================================
// Event Types
// ============================================================

import type { Exchange, Item, User, Report } from "@/types"

// ============ Event Names ============

export const EVENT_TYPES = {
  // Exchange Events
  EXCHANGE_CREATED: "EXCHANGE_CREATED",
  EXCHANGE_ACCEPTED: "EXCHANGE_ACCEPTED",
  EXCHANGE_REJECTED: "EXCHANGE_REJECTED",
  EXCHANGE_CANCELLED: "EXCHANGE_CANCELLED",
  EXCHANGE_COMPLETED: "EXCHANGE_COMPLETED",
  EXCHANGE_CONFIRMED: "EXCHANGE_CONFIRMED",

  // Item Events
  ITEM_CREATED: "ITEM_CREATED",
  ITEM_UPDATED: "ITEM_UPDATED",
  ITEM_DELETED: "ITEM_DELETED",
  ITEM_STATUS_CHANGED: "ITEM_STATUS_CHANGED",

  // User Events
  USER_REGISTERED: "USER_REGISTERED",
  USER_SUSPENDED: "USER_SUSPENDED",
  USER_BANNED: "USER_BANNED",
  USER_ACTIVATED: "USER_ACTIVATED",
  USER_WARNING_ISSUED: "USER_WARNING_ISSUED",

  // Report Events
  REPORT_CREATED: "REPORT_CREATED",
  REPORT_RESOLVED: "REPORT_RESOLVED",

  // Chat Events
  CHAT_MESSAGE_SENT: "CHAT_MESSAGE_SENT",
} as const

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]

// ============ Event Payloads ============

export interface ExchangeCreatedEvent {
  type: typeof EVENT_TYPES.EXCHANGE_CREATED
  payload: {
    exchange: Exchange
    item: Item
  }
}

export interface ExchangeAcceptedEvent {
  type: typeof EVENT_TYPES.EXCHANGE_ACCEPTED
  payload: {
    exchange: Exchange
    acceptedBy: string
  }
}

export interface ExchangeRejectedEvent {
  type: typeof EVENT_TYPES.EXCHANGE_REJECTED
  payload: {
    exchange: Exchange
    rejectedBy: string
    reason?: string
  }
}

export interface ExchangeCancelledEvent {
  type: typeof EVENT_TYPES.EXCHANGE_CANCELLED
  payload: {
    exchange: Exchange
    cancelledBy: string
    reason?: string
  }
}

export interface ExchangeCompletedEvent {
  type: typeof EVENT_TYPES.EXCHANGE_COMPLETED
  payload: {
    exchange: Exchange
  }
}

export interface UserSuspendedEvent {
  type: typeof EVENT_TYPES.USER_SUSPENDED
  payload: {
    userId: string
    adminId: string
    reason?: string
    suspendedUntil?: Date
  }
}

export interface UserBannedEvent {
  type: typeof EVENT_TYPES.USER_BANNED
  payload: {
    userId: string
    adminId: string
    reason?: string
  }
}

export interface UserWarningIssuedEvent {
  type: typeof EVENT_TYPES.USER_WARNING_ISSUED
  payload: {
    userId: string
    adminId: string
    reason: string
    warningCount: number
  }
}

export interface ReportCreatedEvent {
  type: typeof EVENT_TYPES.REPORT_CREATED
  payload: {
    report: Report
  }
}

// ============ Union Type ============

export type AppEvent =
  | ExchangeCreatedEvent
  | ExchangeAcceptedEvent
  | ExchangeRejectedEvent
  | ExchangeCancelledEvent
  | ExchangeCompletedEvent
  | UserSuspendedEvent
  | UserBannedEvent
  | UserWarningIssuedEvent
  | ReportCreatedEvent
