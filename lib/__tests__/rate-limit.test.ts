import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest'
import { 
  getRemainingCooldown, 
  isOnCooldown, 
  recordAction,
  formatCooldownTime 
} from '../rate-limit'

// Mock Date.now for consistent testing
const originalDateNow = Date.now

describe('Rate Limit Utilities', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
  })

  afterAll(() => {
    Date.now = originalDateNow
  })

  describe('formatCooldownTime', () => {
    it('should format seconds correctly', () => {
      expect(formatCooldownTime(5000)).toBe('5 วินาที')
      expect(formatCooldownTime(30000)).toBe('30 วินาที')
      expect(formatCooldownTime(59000)).toBe('59 วินาที')
    })

    it('should format minutes correctly', () => {
      expect(formatCooldownTime(60000)).toBe('1 นาที')
      expect(formatCooldownTime(120000)).toBe('2 นาที')
      expect(formatCooldownTime(300000)).toBe('5 นาที')
    })

    it('should round up seconds', () => {
      expect(formatCooldownTime(1500)).toBe('2 วินาที')
    })
  })

  describe('recordAction and isOnCooldown', () => {
    it('should record action and set cooldown', () => {
      const userId = 'test-user-123'
      const action = 'createItem'
      
      // Record the action
      recordAction(action, userId)
      
      // Should be on cooldown immediately after
      expect(isOnCooldown(action, userId)).toBe(true)
    })

    it('should return remaining cooldown correctly', () => {
      const userId = 'test-user-456'
      const action = 'createItem'
      
      // Mock Date.now
      const mockNow = 1000000
      Date.now = vi.fn(() => mockNow)
      
      recordAction(action, userId)
      
      // Advance time by 30 seconds
      Date.now = vi.fn(() => mockNow + 30000)
      
      // createItem has 60 second cooldown, so 30 seconds should remain
      const remaining = getRemainingCooldown(action, userId)
      expect(remaining).toBe(30000)
    })
  })

  describe('getRemainingCooldown', () => {
    it('should return 0 for unknown action', () => {
      const remaining = getRemainingCooldown('unknownAction', 'user123')
      expect(remaining).toBe(0)
    })

    it('should return 0 for user without recorded action', () => {
      const remaining = getRemainingCooldown('createItem', 'new-user-789')
      expect(remaining).toBe(0)
    })
  })
})
