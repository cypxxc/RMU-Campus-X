/**
 * Upstash Redis Cache — server-side cache for serverless environments
 * 
 * Uses the same Upstash Redis credentials as the rate limiter.
 * Falls back to in-memory Map if Upstash is not configured (dev mode).
 * 
 * Usage:
 *   import { upstashCache } from '@/lib/upstash-cache'
 *   await upstashCache.set('key', value, 60_000) // 60s TTL
 *   const val = await upstashCache.get<MyType>('key')
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const IS_CONFIGURED = !!(UPSTASH_URL && UPSTASH_TOKEN)

// Prefix to avoid key collisions with rate limiter
const KEY_PREFIX = "cache:"

// In-memory fallback for dev/no-Upstash environments
const memoryFallback = new Map<string, { value: string; expiresAt: number }>()

/**
 * Execute a Redis REST command via Upstash HTTP API.
 * This avoids importing the full @upstash/redis SDK for simple get/set operations.
 */
async function redisCommand(command: string[]): Promise<unknown> {
  if (!IS_CONFIGURED) return null

  try {
    const res = await fetch(`${UPSTASH_URL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    })

    if (!res.ok) {
      console.warn(`[UpstashCache] Redis command failed: ${res.status}`)
      return null
    }

    const data = await res.json()
    return data.result
  } catch (error) {
    console.warn("[UpstashCache] Redis error, using fallback:", error)
    return null
  }
}

export const upstashCache = {
  /**
   * Get a cached value by key. Returns null if not found or expired.
   */
  async get<T>(key: string): Promise<T | null> {
    const prefixedKey = KEY_PREFIX + key

    if (IS_CONFIGURED) {
      const result = await redisCommand(["GET", prefixedKey])
      if (result === null || result === undefined) return null
      try {
        return JSON.parse(result as string) as T
      } catch {
        return null
      }
    }

    // Fallback: in-memory
    const entry = memoryFallback.get(prefixedKey)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      memoryFallback.delete(prefixedKey)
      return null
    }
    try {
      return JSON.parse(entry.value) as T
    } catch {
      return null
    }
  },

  /**
   * Set a value in cache with TTL in milliseconds.
   */
  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const prefixedKey = KEY_PREFIX + key
    const serialized = JSON.stringify(value)
    const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000))

    if (IS_CONFIGURED) {
      await redisCommand(["SET", prefixedKey, serialized, "EX", String(ttlSeconds)])
      return
    }

    // Fallback: in-memory
    memoryFallback.set(prefixedKey, {
      value: serialized,
      expiresAt: Date.now() + ttlMs,
    })
    // Simple size guard
    if (memoryFallback.size > 500) {
      const firstKey = memoryFallback.keys().next().value as string | undefined
      if (firstKey) memoryFallback.delete(firstKey)
    }
  },

  /**
   * Delete a cached key.
   */
  async delete(key: string): Promise<void> {
    const prefixedKey = KEY_PREFIX + key

    if (IS_CONFIGURED) {
      await redisCommand(["DEL", prefixedKey])
      return
    }

    memoryFallback.delete(prefixedKey)
  },

  /**
   * Check if Upstash Redis is configured.
   */
  isConfigured(): boolean {
    return IS_CONFIGURED
  },
}
