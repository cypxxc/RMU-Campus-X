/**
 * Scalable rate limiter using Upstash Redis
 * Falls back to in-memory if Upstash env vars are not configured
 * 
 * For production: Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 */

import { checkRateLimit as inMemoryCheck, getClientIP, RATE_LIMITS } from './rate-limiter'

// Types
interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

// Check if Upstash is configured
const UPSTASH_CONFIGURED = !!(
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Lazy-loaded Upstash client
let upstashRatelimit: unknown = null

async function getUpstashRatelimit() {
  if (!UPSTASH_CONFIGURED) return null
  
  if (!upstashRatelimit) {
    try {
      const { Ratelimit } = await import('@upstash/ratelimit')
      const { Redis } = await import('@upstash/redis')
      
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
      
      upstashRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'), // Default: 100 requests per minute
        analytics: true,
        prefix: 'rmu-campus-x',
      })
    } catch (error) {
      console.warn('[Rate Limit] Failed to initialize Upstash, falling back to in-memory:', error)
      return null
    }
  }
  
  return upstashRatelimit as InstanceType<typeof import('@upstash/ratelimit').Ratelimit>
}

/**
 * Check rate limit using Upstash Redis (with in-memory fallback)
 */
export async function checkRateLimitScalable(
  key: string,
  limit: number = RATE_LIMITS.API.limit,
  windowMs: number = RATE_LIMITS.API.windowMs
): Promise<RateLimitResult> {
  // Try Upstash first
  const ratelimit = await getUpstashRatelimit()
  
  if (ratelimit) {
    try {
      const result = await ratelimit.limit(key)
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetTime: result.reset,
      }
    } catch (error) {
      console.warn('[Rate Limit] Upstash error, falling back to in-memory:', error)
    }
  }
  
  // Fallback to in-memory
  return inMemoryCheck(key, limit, windowMs)
}

/**
 * Rate limit check for different presets
 */
export const rateLimitPresets = {
  api: (key: string) => checkRateLimitScalable(key, RATE_LIMITS.API.limit, RATE_LIMITS.API.windowMs),
  read: (key: string) => checkRateLimitScalable(key, RATE_LIMITS.READ.limit, RATE_LIMITS.READ.windowMs),
  upload: (key: string) => checkRateLimitScalable(key, RATE_LIMITS.UPLOAD.limit, RATE_LIMITS.UPLOAD.windowMs),
  auth: (key: string) => checkRateLimitScalable(key, RATE_LIMITS.AUTH.limit, RATE_LIMITS.AUTH.windowMs),
  search: (key: string) => checkRateLimitScalable(key, RATE_LIMITS.SEARCH.limit, RATE_LIMITS.SEARCH.windowMs),
}

// Re-export helpers
export { getClientIP, RATE_LIMITS }

/**
 * Check if Upstash is configured
 */
export function isUpstashConfigured(): boolean {
  return UPSTASH_CONFIGURED
}
