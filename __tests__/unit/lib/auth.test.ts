/**
 * Unit tests for lib/auth.ts
 * Tests authentication flows and validation
 */
import { describe, it, expect } from 'vitest'
import { validateRMUEmail } from '@/lib/auth'

describe('Authentication', () => {
  describe('validateRMUEmail', () => {
    it('should accept student email (12 digits)', () => {
      expect(validateRMUEmail('653120100123@rmu.ac.th')).toBe(true)
    })

    it('should accept lecturer/staff email (letters)', () => {
      expect(validateRMUEmail('somchai@rmu.ac.th')).toBe(true)
      expect(validateRMUEmail('name.surname@rmu.ac.th')).toBe(true)
    })

    it('should reject non-RMU domain', () => {
      expect(validateRMUEmail('user@gmail.com')).toBe(false)
      expect(validateRMUEmail('user@hotmail.com')).toBe(false)
    })

    it('should reject empty string', () => {
      expect(validateRMUEmail('')).toBe(false)
    })

    it('should accept domain case-insensitively', () => {
      expect(validateRMUEmail('653120100123@RMU.AC.TH')).toBe(true)
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
