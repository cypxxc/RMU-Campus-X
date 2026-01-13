/**
 * Unit tests for lib/auth.ts
 * Tests authentication flows and validation
 */
import { describe, it, expect } from 'vitest'
import { validateRMUEmail } from '@/lib/auth'

describe('Authentication', () => {
  describe('validateRMUEmail', () => {
    it('should accept valid RMU email format', () => {
      expect(validateRMUEmail('653120100123@rmu.ac.th')).toBe(true)
    })

    it('should reject non-RMU domain', () => {
      expect(validateRMUEmail('user@gmail.com')).toBe(false)
      expect(validateRMUEmail('user@hotmail.com')).toBe(false)
    })

    it('should reject invalid student ID format', () => {
      expect(validateRMUEmail('abc@rmu.ac.th')).toBe(false)
      expect(validateRMUEmail('12345@rmu.ac.th')).toBe(false) // Too short
      expect(validateRMUEmail('1234567890123456@rmu.ac.th')).toBe(false) // Too long
    })

    it('should reject empty string', () => {
      expect(validateRMUEmail('')).toBe(false)
    })

    it('should be case sensitive on domain', () => {
      // The regex is case-sensitive
      expect(validateRMUEmail('653120100123@RMU.AC.TH')).toBe(false)
    })
  })
})

describe('Registration Schema', () => {
  // These tests would require importing the schema
  // For now, placeholder tests that verify the shape
  it.todo('should validate password length >= 6')
  it.todo('should require matching password confirmation')
  it.todo('should require valid email format')
})
