/**
 * Login Attempt Tracker
 * Tracks failed login attempts and blocks after threshold
 */

interface LoginAttempt {
  count: number
  firstAttempt: number
  lastAttempt: number
  blocked: boolean
  blockedUntil?: number
}

// In-memory store (for serverless, use Redis in production)
const loginAttempts = new Map<string, LoginAttempt>()

// Configuration
const CONFIG = {
  maxAttempts: 5,           // Max failed attempts before block
  windowMs: 15 * 60 * 1000, // 15 minutes window
  blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
  cleanupIntervalMs: 5 * 60 * 1000, // Cleanup every 5 minutes
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(identifier: string): {
  blocked: boolean
  remainingAttempts: number
  blockedUntil?: Date
} {
  const now = Date.now()
  const existing = loginAttempts.get(identifier)

  // Check if currently blocked
  if (existing?.blocked && existing.blockedUntil && existing.blockedUntil > now) {
    return {
      blocked: true,
      remainingAttempts: 0,
      blockedUntil: new Date(existing.blockedUntil),
    }
  }

  // Reset if window expired or was blocked but block expired
  if (!existing || existing.firstAttempt + CONFIG.windowMs < now) {
    loginAttempts.set(identifier, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
      blocked: false,
    })
    return {
      blocked: false,
      remainingAttempts: CONFIG.maxAttempts - 1,
    }
  }

  // Increment attempt count
  const newCount = existing.count + 1
  const shouldBlock = newCount >= CONFIG.maxAttempts

  loginAttempts.set(identifier, {
    count: newCount,
    firstAttempt: existing.firstAttempt,
    lastAttempt: now,
    blocked: shouldBlock,
    blockedUntil: shouldBlock ? now + CONFIG.blockDurationMs : undefined,
  })

  if (shouldBlock) {
    console.warn(`[LoginTracker] Blocked ${identifier} after ${newCount} failed attempts`)
    return {
      blocked: true,
      remainingAttempts: 0,
      blockedUntil: new Date(now + CONFIG.blockDurationMs),
    }
  }

  return {
    blocked: false,
    remainingAttempts: CONFIG.maxAttempts - newCount,
  }
}

/**
 * Check if an identifier is currently blocked
 */
export function isBlocked(identifier: string): {
  blocked: boolean
  blockedUntil?: Date
  remainingAttempts: number
} {
  const now = Date.now()
  const existing = loginAttempts.get(identifier)

  if (!existing) {
    return { blocked: false, remainingAttempts: CONFIG.maxAttempts }
  }

  // Check if block expired
  if (existing.blocked && existing.blockedUntil && existing.blockedUntil <= now) {
    loginAttempts.delete(identifier)
    return { blocked: false, remainingAttempts: CONFIG.maxAttempts }
  }

  if (existing.blocked && existing.blockedUntil) {
    return {
      blocked: true,
      blockedUntil: new Date(existing.blockedUntil),
      remainingAttempts: 0,
    }
  }

  // Check if window expired
  if (existing.firstAttempt + CONFIG.windowMs < now) {
    loginAttempts.delete(identifier)
    return { blocked: false, remainingAttempts: CONFIG.maxAttempts }
  }

  return {
    blocked: false,
    remainingAttempts: CONFIG.maxAttempts - existing.count,
  }
}

/**
 * Clear attempts for an identifier (call on successful login)
 */
export function clearAttempts(identifier: string): void {
  loginAttempts.delete(identifier)
}

/**
 * Get all blocked identifiers (for admin monitoring)
 */
export function getBlockedIdentifiers(): Array<{
  identifier: string
  blockedUntil: Date
  attemptCount: number
}> {
  const now = Date.now()
  const blocked: Array<{
    identifier: string
    blockedUntil: Date
    attemptCount: number
  }> = []

  loginAttempts.forEach((attempt, identifier) => {
    if (attempt.blocked && attempt.blockedUntil && attempt.blockedUntil > now) {
      blocked.push({
        identifier,
        blockedUntil: new Date(attempt.blockedUntil),
        attemptCount: attempt.count,
      })
    }
  })

  return blocked
}

/**
 * Cleanup old entries (call periodically)
 */
export function cleanup(): number {
  const now = Date.now()
  let cleaned = 0

  loginAttempts.forEach((attempt, identifier) => {
    const windowExpired = attempt.firstAttempt + CONFIG.windowMs < now
    const blockExpired = attempt.blockedUntil && attempt.blockedUntil < now

    if (windowExpired || blockExpired) {
      loginAttempts.delete(identifier)
      cleaned++
    }
  })

  return cleaned
}

// Auto-cleanup every 5 minutes (in Node.js environment)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cleaned = cleanup()
    if (cleaned > 0) {
      console.log(`[LoginTracker] Cleaned up ${cleaned} entries`)
    }
  }, CONFIG.cleanupIntervalMs)
}
