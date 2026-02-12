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

// Lazy-loaded Upstash Redis client (shared across all rate limit instances)
let upstashRedis: unknown = null

async function getUpstashRedis() {
  if (!UPSTASH_CONFIGURED) return null

  if (!upstashRedis) {
    try {
      const { Redis } = await import('@upstash/redis')
      upstashRedis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    } catch (error) {
      console.warn('[Rate Limit] Failed to initialize Upstash Redis:', error)
      return null
    }
  }

  return upstashRedis
}

// Per-configuration Ratelimit instances (keyed by "limit:windowMs")
const upstashRatelimitMap = new Map<string, unknown>()

async function getUpstashRatelimit(limit: number, windowMs: number) {
  const redis = await getUpstashRedis()
  if (!redis) return null

  const cacheKey = `${limit}:${windowMs}`
  let instance = upstashRatelimitMap.get(cacheKey)

  if (!instance) {
    try {
      const { Ratelimit } = await import('@upstash/ratelimit')
      const windowSec = Math.max(1, Math.round(windowMs / 1000))
      instance = new Ratelimit({
        redis: redis as ConstructorParameters<typeof Ratelimit>[0]['redis'],
        limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
        analytics: true,
        prefix: `rmu-campus-x:${cacheKey}`,
      })
      upstashRatelimitMap.set(cacheKey, instance)
    } catch (error) {
      console.warn('[Rate Limit] Failed to initialize Upstash Ratelimit:', error)
      return null
    }
  }

  return instance as InstanceType<typeof import('@upstash/ratelimit').Ratelimit>
}

/**
 * Check rate limit using Upstash Redis (with in-memory fallback)
 */
export async function checkRateLimitScalable(
  key: string,
  limit: number = RATE_LIMITS.API.limit,
  windowMs: number = RATE_LIMITS.API.windowMs
): Promise<RateLimitResult> {
  // Try Upstash first (with per-endpoint configuration)
  const ratelimit = await getUpstashRatelimit(limit, windowMs)
  
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
