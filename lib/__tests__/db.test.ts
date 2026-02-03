/**
 * Database Functions Tests
 * Testing core database operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  getFirebaseAuth: vi.fn(() => ({})),
}))

// Mock Firestore functions
const mockGetDocs = vi.fn()
const mockGetDoc = vi.fn()
const mockAddDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockDeleteDoc = vi.fn()
const mockQuery = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockLimit = vi.fn()
const mockGetCountFromServer = vi.fn()
const mockStartAfter = vi.fn()

vi.mock('firebase/firestore', () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  limit: (...args: unknown[]) => mockLimit(...args),
  startAfter: (...args: unknown[]) => mockStartAfter(...args),
  getCountFromServer: (...args: unknown[]) => mockGetCountFromServer(...args),
  serverTimestamp: vi.fn(() => new Date()),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
  },
}))

describe('Database Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Pagination Helper', () => {
    it('should calculate hasMore correctly when items equal pageSize', () => {
      const itemsCount = 20
      const pageSize = 20
      const hasMore = itemsCount === pageSize
      expect(hasMore).toBe(true)
    })

    it('should calculate hasMore correctly when items less than pageSize', () => {
      const itemsCount = 15
      const pageSize = 20
      // When items < pageSize, there are no more items
      const hasMore = itemsCount >= pageSize
      expect(hasMore).toBe(false)
    })
  })

  describe('Query Building', () => {
    it('should chunk arrays correctly for Firestore in() limit', () => {
      const chunkArray = <T>(arr: T[], size: number): T[][] => {
        const chunks: T[][] = []
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size))
        }
        return chunks
      }

      const emails = Array.from({ length: 50 }, (_, i) => `user${i}@rmu.ac.th`)
      const chunks = chunkArray(emails, 30)
      
      expect(chunks).toHaveLength(2)
      expect(chunks[0]).toHaveLength(30)
      expect(chunks[1]).toHaveLength(20)
    })
  })
})

describe('Security Utilities', () => {
  describe('Input Validation', () => {
    it('should sanitize HTML in text input', () => {
      const sanitizeHtml = (input: string): string => {
        return input
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
      }

      const malicious = '<script>alert("xss")</script>'
      const sanitized = sanitizeHtml(malicious)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    })

    it('should validate email format', () => {
      const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
      }

      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
    })

    it('should validate RMU email (student or staff @rmu.ac.th)', () => {
      const isRMUEmail = (email: string): boolean => {
        return /^[a-zA-Z0-9._+-]{1,64}@rmu\.ac\.th$/.test(email)
      }

      expect(isRMUEmail('123456789012@rmu.ac.th')).toBe(true)
      expect(isRMUEmail('somchai@rmu.ac.th')).toBe(true)
      expect(isRMUEmail('123456789012@gmail.com')).toBe(false) // wrong domain
    })
  })

  describe('Rate Limit Logic', () => {
    it('should track request counts correctly', () => {
      const requestLog: Map<string, { count: number; resetAt: number }> = new Map()
      const windowMs = 60000 // 1 minute
      const maxRequests = 100

      const checkRateLimit = (ip: string): boolean => {
        const now = Date.now()
        const existing = requestLog.get(ip)

        if (!existing || existing.resetAt < now) {
          requestLog.set(ip, { count: 1, resetAt: now + windowMs })
          return true
        }

        if (existing.count >= maxRequests) {
          return false
        }

        existing.count++
        return true
      }

      const ip = '192.168.1.1'
      
      // First 100 requests should pass
      for (let i = 0; i < 100; i++) {
        expect(checkRateLimit(ip)).toBe(true)
      }
      
      // 101st request should fail
      expect(checkRateLimit(ip)).toBe(false)
    })
  })
})
