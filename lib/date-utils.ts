/**
 * Standardized date utility functions for consistent date handling across the application
 */

export function toDate(value: unknown): Date | null {
  if (!value) return null
  
  // Handle Firestore Timestamp
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(d.getTime()) ? null : d
  }
  
  // Handle Firestore Timestamp with toMillis
  if (typeof (value as { toMillis?: () => number }).toMillis === "function") {
    const d = new Date((value as { toMillis: () => number }).toMillis())
    return Number.isNaN(d.getTime()) ? null : d
  }
  
  // Handle Firestore timestamp object format
  if (typeof value === "object" && value !== null && "_seconds" in (value as object)) {
    const d = new Date((value as { _seconds: number })._seconds * 1000)
    return Number.isNaN(d.getTime()) ? null : d
  }
  
  // Handle string or number
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

export function toDateStr(value: unknown, locale: "th" | "en"): string {
  const d = toDate(value)
  if (!d) return locale === "th" ? "—" : "-"
  return d.toLocaleString(locale === "th" ? "th-TH" : "en-US", { 
    dateStyle: "short", 
    timeStyle: "short" 
  })
}

export function formatDate(value: unknown, locale: "th" | "en"): string {
  const d = toDate(value)
  if (!d) return "-"
  return d.toLocaleString(locale === "th" ? "th-TH" : "en-US", { 
    dateStyle: "medium", 
    timeStyle: "short" 
  })
}

export function toDateTimeLocal(value: unknown): string {
  const d = toDate(value)
  if (!d) return ""
  const tzOffset = d.getTimezoneOffset() * 60 * 1000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
}
