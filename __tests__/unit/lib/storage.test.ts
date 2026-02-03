/**
 * Unit tests for lib/storage.ts
 * Tests image upload and validation
 */
import { describe, it, expect } from 'vitest'
import { validateImageFile } from '@/lib/storage'

describe('Storage - Image Validation', () => {
  describe('validateImageFile', () => {
    const createMockFile = (name: string, type: string, _size: number): File => {
      const blob = new Blob([''], { type })
      return new File([blob], name, { type })
    }

    it('should accept valid JPEG image', () => {
      const file = createMockFile('test.jpg', 'image/jpeg', 1024)
      const result = validateImageFile(file)
      expect(result.valid).toBe(true)
    })

    it('should accept valid PNG image', () => {
      const file = createMockFile('test.png', 'image/png', 1024)
      const result = validateImageFile(file)
      expect(result.valid).toBe(true)
    })

    it('should reject WebP image (only JPG/PNG allowed)', () => {
      const file = createMockFile('test.webp', 'image/webp', 1024)
      const result = validateImageFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('JPEG')
    })

    it('should reject GIF image (only JPG/PNG allowed)', () => {
      const file = createMockFile('test.gif', 'image/gif', 1024)
      const result = validateImageFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('JPEG')
    })

    it('should reject non-image files', () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1024)
      const result = validateImageFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('รูปภาพ')
    })

    it('should reject files larger than 10MB', () => {
      const size = 11 * 1024 * 1024 // 11MB
      const file = createMockFile('large.jpg', 'image/jpeg', size)
      Object.defineProperty(file, 'size', { value: size })
      
      const result = validateImageFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('10MB')
    })
  })
})
