/**
 * Security Utilities
 * Input validation and sanitization functions
 */

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize text for database storage
 * Trims whitespace and removes null bytes
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .trim()
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return ''
  
  return email.trim().toLowerCase()
}

/**
 * Validate RMU email format — รองรับทั้งนักศึกษา (รหัส 12 หลัก) และอาจารย์/บุคลากร (ตัวอักษร)
 */
export function isValidRMUEmail(email: string): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return /^[a-zA-Z0-9._+-]{1,64}@rmu\.ac\.th$/.test(normalized)
}

/**
 * Validate general email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email.trim())
}

/**
 * Limit string length safely
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str || typeof str !== 'string') return ''
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength)
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null
  
  try {
    const parsed = new URL(url.trim())
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    return parsed.href
  } catch {
    return null
  }
}

/**
 * Check for potential SQL injection patterns (for logging/alerting)
 */
export function hasSuspiciousPatterns(input: string): boolean {
  if (!input) return false
  
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/i,
    /(--)|(;)|(\/\*)/,
    /(\bOR\b|\bAND\b).*[=<>]/i,
  ]
  
  return patterns.some(pattern => pattern.test(input))
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') return 'unnamed'
  
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .slice(0, 100) // Limit length
}

/**
 * Generate safe random ID
 */
export function generateSafeId(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Validate integer in range
 */
export function isValidIntegerInRange(value: unknown, min: number, max: number): boolean {
  if (typeof value !== 'number') return false
  if (!Number.isInteger(value)) return false
  return value >= min && value <= max
}

/**
 * Deep sanitize object (for API payloads)
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeText(item) : item
      )
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized as T
}
