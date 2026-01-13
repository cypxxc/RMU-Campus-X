/**
 * User-friendly error messages
 * แปลง Firebase error เป็นข้อความภาษาไทยที่เข้าใจง่าย
 */

// Firebase Auth Error Codes
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/user-not-found": "ไม่พบบัญชีผู้ใช้นี้",
  "auth/wrong-password": "รหัสผ่านไม่ถูกต้อง",
  "auth/email-already-in-use": "อีเมลนี้ถูกใช้งานแล้ว",
  "auth/weak-password": "รหัสผ่านไม่ปลอดภัยเพียงพอ",
  "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง",
  "auth/operation-not-allowed": "ไม่อนุญาตให้ดำเนินการนี้",
  "auth/account-exists-with-different-credential": "บัญชีนี้ผูกกับวิธีการเข้าสู่ระบบอื่น",
  "auth/invalid-credential": "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง",
  "auth/invalid-verification-code": "รหัสยืนยันไม่ถูกต้อง",
  "auth/invalid-verification-id": "ID ยืนยันไม่ถูกต้อง",
  "auth/requires-recent-login": "กรุณาเข้าสู่ระบบใหม่เพื่อดำเนินการ",
  "auth/too-many-requests": "มีการร้องขอมากเกินไป กรุณารอสักครู่",
  "auth/user-disabled": "บัญชีนี้ถูกระงับการใช้งาน",
  "auth/network-request-failed": "ไม่สามารถเชื่อมต่อเครือข่ายได้",
  "auth/popup-closed-by-user": "หน้าต่างถูกปิดก่อนดำเนินการเสร็จ",
  "auth/cancelled-popup-request": "การเข้าสู่ระบบถูกยกเลิก",
}

// Firestore Error Codes
const FIRESTORE_ERROR_MESSAGES: Record<string, string> = {
  "permission-denied": "คุณไม่มีสิทธิ์ดำเนินการนี้",
  "unavailable": "บริการไม่พร้อมใช้งาน กรุณาลองใหม่",
  "not-found": "ไม่พบข้อมูลที่ต้องการ",
  "already-exists": "ข้อมูลนี้มีอยู่แล้ว",
  "resource-exhausted": "ถึงขีดจำกัดการใช้งาน กรุณารอสักครู่",
  "failed-precondition": "ไม่สามารถดำเนินการได้ในสถานะปัจจุบัน",
  "aborted": "การดำเนินการถูกยกเลิก",
  "out-of-range": "ค่าที่ระบุอยู่นอกช่วงที่อนุญาต",
  "unimplemented": "ฟีเจอร์นี้ยังไม่พร้อมใช้งาน",
  "internal": "เกิดข้อผิดพลาดภายในระบบ",
  "deadline-exceeded": "หมดเวลาดำเนินการ กรุณาลองใหม่",
}

// General Error Messages
const GENERAL_ERROR_MESSAGES: Record<string, string> = {
  "network-error": "ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้",
  "timeout": "หมดเวลาดำเนินการ",
  "unknown": "เกิดข้อผิดพลาดที่ไม่คาดคิด",
}

/**
 * แปลง error เป็นข้อความที่เข้าใจง่าย
 */
export function getErrorMessage(error: unknown): string {
  // Error เป็น string
  if (typeof error === "string") {
    return error
  }

  // Error object
  if (error instanceof Error) {
    const message = error.message

    // Firebase Auth error
    const authMatch = message.match(/auth\/[\w-]+/)
    if (authMatch) {
      return AUTH_ERROR_MESSAGES[authMatch[0]] || message
    }

    // Firestore error
    for (const [code, msg] of Object.entries(FIRESTORE_ERROR_MESSAGES)) {
      if (message.toLowerCase().includes(code)) {
        return msg
      }
    }

    // Network error
    if (message.includes("network") || message.includes("fetch")) {
      return GENERAL_ERROR_MESSAGES["network-error"] || "เกิดข้อผิดพลาดในการเชื่อมต่อ"
    }

    // ใช้ message เดิมถ้าสั้นพอ (ไม่ใช่ stack trace)
    if (message.length < 100 && !message.includes("\n")) {
      return message
    }
  }

  // Default
  return GENERAL_ERROR_MESSAGES["unknown"] || "เกิดข้อผิดพลาดที่ไม่คาดคิด"
}

/**
 * สร้าง error object ที่พร้อมแสดงผล
 */
export function createUserError(
  error: unknown,
  fallbackMessage = "เกิดข้อผิดพลาด"
): { message: string; code?: string } {
  const message = getErrorMessage(error)
  
  let code: string | undefined
  if (error instanceof Error && "code" in error) {
    code = (error as any).code
  }

  return {
    message: message || fallbackMessage,
    code,
  }
}

/**
 * Log error สำหรับ development (ซ่อน stack ใน production)
 */
import { SystemLogger } from './services/logger'

/**
 * Log error สำหรับ development และ Production
 */
export function logError(context: string, error: unknown): void {
  // Use SystemLogger to handle logging logic (console + firestore + alerts)
  SystemLogger.logError(error, context, 'ERROR').catch(err => {
    // Fallback if logger fails
    console.error(`[${context}] Original Error:`, error)
    console.error(`[${context}] Logger Error:`, err)
  })
}
