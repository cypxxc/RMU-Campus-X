/**
 * Item Status
 * Possible states for an item in the system
 */
export const ITEM_STATUS = {
  AVAILABLE: "available",
  PENDING: "pending",
  COMPLETED: "completed",
} as const

export type ItemStatus = (typeof ITEM_STATUS)[keyof typeof ITEM_STATUS]

/**
 * Item status labels in Thai
 */
export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  [ITEM_STATUS.AVAILABLE]: "พร้อมแลกเปลี่ยน",
  [ITEM_STATUS.PENDING]: "รอดำเนินการ",
  [ITEM_STATUS.COMPLETED]: "แลกเปลี่ยนแล้ว",
}

/**
 * Exchange Status
 * Possible states for an exchange request
 */
export const EXCHANGE_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
} as const

export type ExchangeStatus = (typeof EXCHANGE_STATUS)[keyof typeof EXCHANGE_STATUS]

/**
 * Exchange status labels in Thai
 */
export const EXCHANGE_STATUS_LABELS: Record<ExchangeStatus, string> = {
  [EXCHANGE_STATUS.PENDING]: "รอการตอบรับ",
  [EXCHANGE_STATUS.ACCEPTED]: "ตอบรับแล้ว",
  [EXCHANGE_STATUS.IN_PROGRESS]: "กำลังดำเนินการ",
  [EXCHANGE_STATUS.COMPLETED]: "สำเร็จ",
  [EXCHANGE_STATUS.CANCELLED]: "ยกเลิก",
  [EXCHANGE_STATUS.REJECTED]: "ปฏิเสธ",
}

/**
 * User Status
 * Possible states for a user account
 */
export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  WARNING: "WARNING",
  SUSPENDED: "SUSPENDED",
  BANNED: "BANNED",
} as const

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS]

/**
 * User status labels in Thai
 */
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  [USER_STATUS.ACTIVE]: "ใช้งานปกติ",
  [USER_STATUS.WARNING]: "ได้รับคำเตือน",
  [USER_STATUS.SUSPENDED]: "ถูกระงับ",
  [USER_STATUS.BANNED]: "ถูกแบน",
}
