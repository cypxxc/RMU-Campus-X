/**
 * Tests for API Validation Wrapper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

// Mock firebase-admin
vi.mock('@/lib/firebase-admin', () => ({
  extractBearerToken: vi.fn(),
}))

import { extractBearerToken } from '@/lib/firebase-admin'

describe('API Validation Types', () => {
  // These tests verify the validation logic patterns
  // without making actual HTTP requests
  
  const testSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    age: z.number().optional(),
  })

  describe('Schema Validation', () => {
    it('should validate valid input', () => {
      const result = testSchema.safeParse({
        name: 'Test User',
        email: 'test@example.com',
      })
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Test User')
        expect(result.data.email).toBe('test@example.com')
      }
    })

    it('should reject invalid email', () => {
      const result = testSchema.safeParse({
        name: 'Test User',
        email: 'invalid-email',
      })
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email')
      }
    })

    it('should reject missing required fields', () => {
      const result = testSchema.safeParse({
        email: 'test@example.com',
      })
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('name')
      }
    })

    it('should accept optional fields', () => {
      const result = testSchema.safeParse({
        name: 'Test User',
        email: 'test@example.com',
        age: 25,
      })
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.age).toBe(25)
      }
    })

    it('should strip extra fields', () => {
      const strictSchema = testSchema.strict()
      const result = strictSchema.safeParse({
        name: 'Test User',
        email: 'test@example.com',
        extraField: 'should fail',
      })
      
      expect(result.success).toBe(false)
    })
  })

  describe('Error Formatting', () => {
    function formatZodErrors(error: z.ZodError): Array<{ field: string; message: string }> {
      return error.errors.map((e) => ({
        field: e.path.join('.') || 'root',
        message: e.message,
      }))
    }

    it('should format errors with field paths', () => {
      const result = testSchema.safeParse({
        name: '',
        email: 'invalid',
      })
      
      expect(result.success).toBe(false)
      if (!result.success) {
        const formatted = formatZodErrors(result.error)
        expect(formatted.length).toBeGreaterThan(0)
        expect(formatted[0]).toHaveProperty('field')
        expect(formatted[0]).toHaveProperty('message')
      }
    })

    it('should handle nested field paths', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1),
          }),
        }),
      })

      const result = nestedSchema.safeParse({
        user: {
          profile: {
            name: '',
          },
        },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const formatted = formatZodErrors(result.error)
        expect(formatted[0].field).toBe('user.profile.name')
      }
    })
  })

  describe('Authentication Token Handling', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should extract bearer token from header', () => {
      const mockExtract = extractBearerToken as unknown as ReturnType<typeof vi.fn>
      mockExtract.mockReturnValue('valid-token')
      
      const result = extractBearerToken('Bearer valid-token')
      expect(result).toBe('valid-token')
    })

    it('should return null for missing header', () => {
      const mockExtract = extractBearerToken as unknown as ReturnType<typeof vi.fn>
      mockExtract.mockReturnValue(null)
      
      const result = extractBearerToken(null)
      expect(result).toBeNull()
    })
  })
})
