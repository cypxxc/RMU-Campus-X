import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely converts a Firestore Timestamp or any timestamp-like object to a Date
 * Returns fallback date if conversion fails
 */
export function safeToDate(timestamp: any, fallback: Date = new Date()): Date {
  if (!timestamp) return fallback
  
  // Firestore Timestamp object
  if (typeof timestamp === 'object' && typeof timestamp.toDate === 'function') {
    try {
      return timestamp.toDate()
    } catch {
      return fallback
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
