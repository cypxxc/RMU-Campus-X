// ============================================================
// Centralized Error Codes
// ============================================================

export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",

  // Resource Errors
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Business Logic
  ITEM_NOT_AVAILABLE: "ITEM_NOT_AVAILABLE",
  EXCHANGE_ALREADY_EXISTS: "EXCHANGE_ALREADY_EXISTS",
  CANNOT_EXCHANGE_OWN_ITEM: "CANNOT_EXCHANGE_OWN_ITEM",
  EXCHANGE_NOT_PENDING: "EXCHANGE_NOT_PENDING",
  USER_SUSPENDED: "USER_SUSPENDED",
  USER_BANNED: "USER_BANNED",

  // Rate Limiting
  RATE_LIMITED: "RATE_LIMITED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // External Services
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  FIREBASE_ERROR: "FIREBASE_ERROR",
  CLOUDINARY_ERROR: "CLOUDINARY_ERROR",
  LINE_API_ERROR: "LINE_API_ERROR",

  // Internal
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

// ============ Error Messages (Thai) ============

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentication & Authorization
  UNAUTHORIZED: "กรุณาเข้าสู่ระบบ",
  FORBIDDEN: "คุณไม่มีสิทธิ์ในการดำเนินการนี้",
  INVALID_TOKEN: "Token ไม่ถูกต้อง",
  TOKEN_EXPIRED: "Token หมดอายุ กรุณาเข้าสู่ระบบใหม่",

  // Resource Errors
  NOT_FOUND: "ไม่พบข้อมูลที่ต้องการ",
  ALREADY_EXISTS: "ข้อมูลนี้มีอยู่แล้ว",
  CONFLICT: "ข้อมูลขัดแย้ง กรุณาลองใหม่",

  // Validation
  VALIDATION_ERROR: "ข้อมูลไม่ถูกต้อง",
  INVALID_INPUT: "ข้อมูลที่กรอกไม่ถูกต้อง",
  MISSING_REQUIRED_FIELD: "กรุณากรอกข้อมูลให้ครบถ้วน",

  // Business Logic
  ITEM_NOT_AVAILABLE: "สิ่งของนี้ไม่พร้อมแลกเปลี่ยนแล้ว",
  EXCHANGE_ALREADY_EXISTS: "คุณได้ขอแลกเปลี่ยนสิ่งของนี้ไปแล้ว",
  CANNOT_EXCHANGE_OWN_ITEM: "ไม่สามารถขอแลกเปลี่ยนสิ่งของของตัวเองได้",
  EXCHANGE_NOT_PENDING: "การแลกเปลี่ยนนี้ไม่อยู่ในสถานะรอดำเนินการ",
  USER_SUSPENDED: "บัญชีของคุณถูกระงับชั่วคราว",
  USER_BANNED: "บัญชีของคุณถูกระงับถาวร",

  // Rate Limiting
  RATE_LIMITED: "คำขอมากเกินไป กรุณารอสักครู่",
  TOO_MANY_REQUESTS: "คำขอมากเกินไป กรุณาลองใหม่ภายหลัง",

  // External Services
  EXTERNAL_SERVICE_ERROR: "เกิดข้อผิดพลาดกับบริการภายนอก",
  FIREBASE_ERROR: "เกิดข้อผิดพลาดกับ Firebase",
  CLOUDINARY_ERROR: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ",
  LINE_API_ERROR: "เกิดข้อผิดพลาดกับ LINE API",

  // Internal
  INTERNAL_ERROR: "เกิดข้อผิดพลาดภายในระบบ",
  DATABASE_ERROR: "เกิดข้อผิดพลาดกับฐานข้อมูล",
  UNKNOWN_ERROR: "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
}

/**
 * Get Thai error message for error code
 */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR
}
