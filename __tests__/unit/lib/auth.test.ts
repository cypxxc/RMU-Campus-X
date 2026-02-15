/**
 * Unit tests for lib/auth.ts
 * Tests authentication flows and validation
 */
import { describe, it, expect } from 'vitest'
import { validateRMUEmail } from '@/lib/auth'
import { registrationSchema } from '@/lib/schemas'

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
  it('should validate password length >= 6', () => {
    const invalidData = {
      email: 'test@rmu.ac.th',
      password: '12345',
      confirmPassword: '12345'
    }
    const result = registrationSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('อย่างน้อย 6 ตัวอักษร')
    }

    const validData = {
      email: 'test@rmu.ac.th',
      password: '123456',
      confirmPassword: '123456'
    }
    expect(registrationSchema.safeParse(validData).success).toBe(true)
  })

  it('should require matching password confirmation', () => {
    const invalidData = {
      email: 'test@rmu.ac.th',
      password: 'password123',
      confirmPassword: 'different123'
    }
    const result = registrationSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe('รหัสผ่านไม่ตรงกัน')
    }
  })

  it('should require valid email format', () => {
    const invalidEmails = [
      'not-an-email',
      'user@gmail.com',
      '@rmu.ac.th',
      'user@rmu.ac.th.com'
    ]

    invalidEmails.forEach(email => {
      const result = registrationSchema.safeParse({
        email,
        password: 'password123',
        confirmPassword: 'password123'
      })
      expect(result.success).toBe(false)
    })

    const validData = {
      email: 'student65@rmu.ac.th',
      password: 'password123',
      confirmPassword: 'password123'
    }
    expect(registrationSchema.safeParse(validData).success).toBe(true)
  })
})
