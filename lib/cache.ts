/**
 * Simple In-Memory Cache
 * For serverless environments (Vercel/Cloudflare)
 * 
 * Note: For production with multiple instances, use Redis instead
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
  createdAt: number
}

interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  expirations: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    expirations: 0,
  }
  private readonly maxSize: number
  private readonly defaultTtlMs: number

  constructor(options: { maxSize?: number; defaultTtlMs?: number } = {}) {
    this.maxSize = options.maxSize || 1000
    this.defaultTtlMs = options.defaultTtlMs || 5 * 60 * 1000 // 5 minutes default
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.misses++
      this.stats.expirations++
      return null
    }

    this.stats.hits++
    return entry.value as T
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    // Evict oldest entries if at max size
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }

    const now = Date.now()
    this.cache.set(key, {
      value,
      expiresAt: now + (ttlMs || this.defaultTtlMs),
      createdAt: now,
    })
    this.stats.sets++
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.stats.deletes++
    }
    return deleted
  }

  /**
   * Delete keys matching a pattern
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    let deleted = 0

    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        this.cache.delete(key)
        deleted++
      }
    })

    this.stats.deletes += deleted
    return deleted
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  /**
   * Get or set - returns cached value or calls factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    this.set(key, value, ttlMs)
    return value
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
    this.resetStats()
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { size: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      expirations: 0,
    }
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    })

    this.stats.expirations += cleaned
    return cleaned
  }

  /**
   * Evict oldest entries when at max size
   */
  private evictOldest(): void {
    const entriesToEvict = Math.ceil(this.maxSize * 0.1) // Evict 10%
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.createdAt - b.createdAt)
      .slice(0, entriesToEvict)

    entries.forEach(([key]) => this.cache.delete(key))
  }
}

// Singleton instances for different use cases
export const cache = new MemoryCache({ maxSize: 1000, defaultTtlMs: 5 * 60 * 1000 })
export const shortCache = new MemoryCache({ maxSize: 500, defaultTtlMs: 30 * 1000 }) // 30 seconds
export const longCache = new MemoryCache({ maxSize: 200, defaultTtlMs: 30 * 60 * 1000 }) // 30 minutes

// Cache key helpers
export const cacheKeys = {
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user:profile:${id}`,
  item: (id: string) => `item:${id}`,
  items: (filters: string) => `items:${filters}`,
  itemCount: () => `stats:item:count`,
  userCount: () => `stats:user:count`,
  exchangeCount: () => `stats:exchange:count`,
}

// Periodic cleanup (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cleaned = cache.cleanup() + shortCache.cleanup() + longCache.cleanup()
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired entries`)
    }
  }, 5 * 60 * 1000)
}
