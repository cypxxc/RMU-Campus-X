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

const CONFIG = {
  maxAttempts: 5,           // Max failed attempts before block
  windowMs: 15 * 60 * 1000, // 15 minutes window
  blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
  cleanupIntervalMs: 5 * 60 * 1000, // Cleanup every 5 minutes
}

class LoginTrackerService {
  // In-memory store (for serverless, use Redis in production)
  private readonly loginAttempts = new Map<string, LoginAttempt>()

  recordFailedAttempt(identifier: string): {
    blocked: boolean
    remainingAttempts: number
    blockedUntil?: Date
  } {
    const now = Date.now()
    const existing = this.loginAttempts.get(identifier)

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
      this.loginAttempts.set(identifier, {
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

    this.loginAttempts.set(identifier, {
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

  isBlocked(identifier: string): {
    blocked: boolean
    blockedUntil?: Date
    remainingAttempts: number
  } {
    const now = Date.now()
    const existing = this.loginAttempts.get(identifier)

    if (!existing) {
      return { blocked: false, remainingAttempts: CONFIG.maxAttempts }
    }

    // Check if block expired
    if (existing.blocked && existing.blockedUntil && existing.blockedUntil <= now) {
      this.loginAttempts.delete(identifier)
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
      this.loginAttempts.delete(identifier)
      return { blocked: false, remainingAttempts: CONFIG.maxAttempts }
    }

    return {
      blocked: false,
      remainingAttempts: CONFIG.maxAttempts - existing.count,
    }
  }

  clearAttempts(identifier: string): void {
    this.loginAttempts.delete(identifier)
  }

  getBlockedIdentifiers(): Array<{
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

    this.loginAttempts.forEach((attempt, identifier) => {
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

  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    this.loginAttempts.forEach((attempt, identifier) => {
      const windowExpired = attempt.firstAttempt + CONFIG.windowMs < now
      const blockExpired = attempt.blockedUntil && attempt.blockedUntil < now

      if (windowExpired || blockExpired) {
        this.loginAttempts.delete(identifier)
        cleaned++
      }
    })

    return cleaned
  }
}

const loginTrackerService = new LoginTrackerService()

export function recordFailedAttempt(identifier: string) {
  return loginTrackerService.recordFailedAttempt(identifier)
}

export function isBlocked(identifier: string) {
  return loginTrackerService.isBlocked(identifier)
}

export function clearAttempts(identifier: string): void {
  loginTrackerService.clearAttempts(identifier)
}

export function getBlockedIdentifiers() {
  return loginTrackerService.getBlockedIdentifiers()
}

export function cleanup(): number {
  return loginTrackerService.cleanup()
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
