/**
 * Simple in-memory rate limiter using sliding window algorithm
 * For production with multiple instances, consider using Redis/Upstash
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const CLEANUP_INTERVAL = 60 * 1000 // 1 minute

class RateLimiterService {
  // In-memory store (resets on server restart)
  private readonly rateLimitStore = new Map<string, RateLimitEntry>()
  private lastCleanup = Date.now()

  private cleanup(): void {
    const now = Date.now()
    if (now - this.lastCleanup < CLEANUP_INTERVAL) return

    this.lastCleanup = now
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key)
      }
    }
  }

  checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    this.cleanup()

    const now = Date.now()
    const entry = this.rateLimitStore.get(key)

    // No existing entry or expired entry
    if (!entry || now > entry.resetTime) {
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
      return { allowed: true, remaining: limit - 1, resetTime: now + windowMs }
    }

    // Check if limit exceeded
    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime }
    }

    // Increment count
    entry.count++
    return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime }
  }
}

const rateLimiterService = new RateLimiterService()

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  return rateLimiterService.checkRateLimit(key, limit, windowMs)
}

/**
 * Rate limit configuration presets
 */
export const RATE_LIMITS = {
  // General API endpoints: 100 requests per minute
  API: { limit: 100, windowMs: 60 * 1000 },

  // Read-only API endpoints: higher than write but still bounded
  READ: { limit: 300, windowMs: 60 * 1000 },
  
  // Upload endpoint: 10 requests per minute (to prevent abuse)
  UPLOAD: { limit: 10, windowMs: 60 * 1000 },
  
  // Authentication: 5 requests per minute (to prevent brute force)
  AUTH: { limit: 5, windowMs: 60 * 1000 },
  
  // Search: 30 requests per minute
  SEARCH: { limit: 30, windowMs: 60 * 1000 },
} as const

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Try various headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIP = forwardedFor.split(',')[0]
    return firstIP ? firstIP.trim() : 'unknown'
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  // Fallback
  return 'unknown'
}
