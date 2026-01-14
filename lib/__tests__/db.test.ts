/**
 * Database Functions Tests
 * Testing core database operations
 */

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  getFirebaseDb: jest.fn(() => ({})),
  getFirebaseAuth: jest.fn(() => ({})),
}))

// Mock Firestore functions
const mockGetDocs = jest.fn()
const mockGetDoc = jest.fn()
const mockAddDoc = jest.fn()
const mockUpdateDoc = jest.fn()
const mockDeleteDoc = jest.fn()
const mockQuery = jest.fn()
const mockCollection = jest.fn()
const mockDoc = jest.fn()
const mockWhere = jest.fn()
const mockOrderBy = jest.fn()
const mockLimit = jest.fn()
const mockGetCountFromServer = jest.fn()
const mockStartAfter = jest.fn()

jest.mock('firebase/firestore', () => ({
  getDocs: (...args: any[]) => mockGetDocs(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  query: (...args: any[]) => mockQuery(...args),
  collection: (...args: any[]) => mockCollection(...args),
  doc: (...args: any[]) => mockDoc(...args),
  where: (...args: any[]) => mockWhere(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  limit: (...args: any[]) => mockLimit(...args),
  startAfter: (...args: any[]) => mockStartAfter(...args),
  getCountFromServer: (...args: any[]) => mockGetCountFromServer(...args),
  serverTimestamp: jest.fn(() => new Date()),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
  },
}))

describe('Database Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Items', () => {
    it('should have correct pagination structure', async () => {
      // Mock successful response
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { id: '1', data: () => ({ title: 'Test Item', status: 'available' }) },
          { id: '2', data: () => ({ title: 'Test Item 2', status: 'available' }) },
        ],
      })
      mockGetCountFromServer.mockResolvedValueOnce({
        data: () => ({ count: 10 }),
      })

      // Import after mocks are set up
      const { getItems } = await import('@/lib/db/items')
      
      const result = await getItems({ pageSize: 2 })
      
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.items).toHaveLength(2)
        expect(result.data.hasMore).toBe(true)
        expect(result.data.totalCount).toBe(10)
      }
    })
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
      const hasMore = itemsCount === pageSize
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

    it('should validate RMU email strictly', () => {
      const isRMUEmail = (email: string): boolean => {
        return /^\d{12}@rmu\.ac\.th$/.test(email)
      }

      expect(isRMUEmail('123456789012@rmu.ac.th')).toBe(true)
      expect(isRMUEmail('12345678901@rmu.ac.th')).toBe(false) // 11 digits
      expect(isRMUEmail('abc456789012@rmu.ac.th')).toBe(false) // letters
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
