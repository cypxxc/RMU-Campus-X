/**
 * Validation Constants
 * Constants used for form validation across the application
 */

/**
 * File Upload Limits
 */
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 5,
  MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".webp"],
} as const

/**
 * Text Input Limits
 */
export const TEXT_LIMITS = {
  ITEM_TITLE_MIN: 3,
  ITEM_TITLE_MAX: 100,
  ITEM_DESCRIPTION_MIN: 10,
  ITEM_DESCRIPTION_MAX: 1000,
  LOCATION_MAX: 200,
  REPORT_REASON_MIN: 10,
  REPORT_REASON_MAX: 500,
  MESSAGE_MAX: 500,
} as const

/**
 * Email Validation
 */
export const EMAIL = {
  RMU_DOMAIN: "@rmu.ac.th",
  PATTERN: /^[a-zA-Z0-9._%+-]+@rmu\.ac\.th$/,
} as const

/**
 * Password Requirements
 */
export const PASSWORD = {
  MIN_LENGTH: 6,
  MAX_LENGTH: 128,
} as const

/**
 * Pagination
 */
export const PAGINATION = {
  ITEMS_PER_PAGE: 12,
  NOTIFICATIONS_PER_PAGE: 20,
  MESSAGES_PER_PAGE: 50,
} as const

/**
 * Rate Limiting
 */
export const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
} as const
