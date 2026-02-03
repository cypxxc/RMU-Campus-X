import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely converts a Firestore Timestamp or any timestamp-like object to a Date
 * Returns fallback date if conversion fails
 * รองรับ: Timestamp (.toDate), object หลัง serialize จาก API (_seconds / seconds), Date, string, number
 */
export function safeToDate(timestamp: unknown, fallback: Date = new Date()): Date {
  if (timestamp == null) return fallback

  // Firestore Timestamp object (มี .toDate)
  if (typeof timestamp === 'object' && typeof (timestamp as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (timestamp as { toDate: () => Date }).toDate()
    } catch {
      return fallback
    }
  }

  // Object หลัง JSON serialize จาก API (ไม่มี .toDate แต่มี _seconds หรือ seconds)
  if (typeof timestamp === 'object' && !(timestamp instanceof Date)) {
    const sec = (timestamp as { seconds?: number; _seconds?: number }).seconds ?? (timestamp as { _seconds?: number })._seconds
    if (typeof sec === 'number') {
      const d = new Date(sec * 1000)
      return isNaN(d.getTime()) ? fallback : d
    }
  }

  // Already a Date object
  if (timestamp instanceof Date) {
    return timestamp
  }

  // String or number timestamp
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp)
    return isNaN(date.getTime()) ? fallback : date
  }

  return fallback
}

/**
 * แสดงวัน-เวลาที่โพสแบบอ่านง่าย (ไทย) ไม่ต้องอัปเดตบ่อย
 * เช่น "3 ก.พ. 2568, 14:30 น."
 * ถ้าไม่มีวันที่หรือเป็น epoch (0) จะแสดง "—"
 */
export function formatPostedAt(date: Date): string {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime()) || d.getTime() === 0) return "—"
  const dateStr = d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const timeStr = d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return `${dateStr}, ${timeStr} น.`
}
