/**
 * Security Utilities Tests
 */

import {
  sanitizeHtml,
  sanitizeText,
  isValidRMUEmail,
  isValidEmail,
  truncateString,
  sanitizeUrl,
  hasSuspiciousPatterns,
  sanitizeFilename,
  generateSafeId,
  isValidIntegerInRange,
  sanitizeObject,
} from '../security'

describe('Security Utilities', () => {
  describe('sanitizeHtml', () => {
    it('should escape HTML characters', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      )
    })

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('')
      expect(sanitizeHtml(null as any)).toBe('')
      expect(sanitizeHtml(undefined as any)).toBe('')
    })

    it('should escape all dangerous characters', () => {
      expect(sanitizeHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#x27;')
    })
  })

  describe('sanitizeText', () => {
    it('should trim whitespace', () => {
      expect(sanitizeText('  hello world  ')).toBe('hello world')
    })

    it('should remove null bytes', () => {
      expect(sanitizeText('hello\0world')).toBe('helloworld')
    })

    it('should remove control characters', () => {
      expect(sanitizeText('hello\x00\x07world')).toBe('helloworld')
    })
  })

  describe('isValidRMUEmail', () => {
    it('should accept student email (12 digits)', () => {
      expect(isValidRMUEmail('123456789012@rmu.ac.th')).toBe(true)
    })

    it('should accept lecturer/staff email (letters)', () => {
      expect(isValidRMUEmail('somchai@rmu.ac.th')).toBe(true)
      expect(isValidRMUEmail('abc456789012@rmu.ac.th')).toBe(true)
    })

    it('should reject invalid formats', () => {
      expect(isValidRMUEmail('123456789012@gmail.com')).toBe(false) // wrong domain
      expect(isValidRMUEmail('')).toBe(false)
    })
  })

  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.th')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('@domain.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      expect(truncateString('hello world', 5)).toBe('hello')
    })

    it('should not truncate short strings', () => {
      expect(truncateString('hi', 10)).toBe('hi')
    })

    it('should handle edge cases', () => {
      expect(truncateString('', 10)).toBe('')
      expect(truncateString(null as any, 10)).toBe('')
    })
  })

  describe('sanitizeUrl', () => {
    it('should accept valid URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/')
      expect(sanitizeUrl('http://test.com/path')).toBe('http://test.com/path')
    })

    it('should reject dangerous protocols', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe(null)
      expect(sanitizeUrl('data:text/html')).toBe(null)
    })

    it('should reject invalid URLs', () => {
      expect(sanitizeUrl('not-a-url')).toBe(null)
      expect(sanitizeUrl('')).toBe(null)
    })
  })

  describe('hasSuspiciousPatterns', () => {
    it('should detect XSS patterns', () => {
      expect(hasSuspiciousPatterns('<script>alert(1)</script>')).toBe(true)
      expect(hasSuspiciousPatterns('javascript:alert(1)')).toBe(true)
      expect(hasSuspiciousPatterns('<img onerror=alert(1)>')).toBe(true)
      expect(hasSuspiciousPatterns('<div onload=fetch(x)>')).toBe(true)
    })

    it('should not flag normal text', () => {
      expect(hasSuspiciousPatterns('Hello World')).toBe(false)
      expect(hasSuspiciousPatterns('This is a normal message')).toBe(false)
      expect(hasSuspiciousPatterns('SELECT a book and UPDATE your shelf')).toBe(false)
      expect(hasSuspiciousPatterns('1 OR 2 items; pick one')).toBe(false)
    })
  })

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      // Function replaces invalid chars with _ and collapses multiple underscores
      expect(sanitizeFilename('file<>:"/\\|?*.txt')).toBe('file_.txt')
    })

    it('should limit length', () => {
      const longName = 'a'.repeat(200)
      expect(sanitizeFilename(longName).length).toBe(100)
    })

    it('should handle empty input', () => {
      expect(sanitizeFilename('')).toBe('unnamed')
    })
  })

  describe('generateSafeId', () => {
    it('should generate ID of specified length', () => {
      expect(generateSafeId(16)).toHaveLength(16)
      expect(generateSafeId(32)).toHaveLength(32)
    })

    it('should only contain alphanumeric characters', () => {
      const id = generateSafeId(100)
      expect(/^[a-zA-Z0-9]+$/.test(id)).toBe(true)
    })

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateSafeId()))
      expect(ids.size).toBe(100)
    })
  })

  describe('isValidIntegerInRange', () => {
    it('should validate integers in range', () => {
      expect(isValidIntegerInRange(5, 1, 10)).toBe(true)
      expect(isValidIntegerInRange(1, 1, 10)).toBe(true)
      expect(isValidIntegerInRange(10, 1, 10)).toBe(true)
    })

    it('should reject values outside range', () => {
      expect(isValidIntegerInRange(0, 1, 10)).toBe(false)
      expect(isValidIntegerInRange(11, 1, 10)).toBe(false)
    })

    it('should reject non-integers', () => {
      expect(isValidIntegerInRange(5.5, 1, 10)).toBe(false)
      expect(isValidIntegerInRange('5' as any, 1, 10)).toBe(false)
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize nested strings', () => {
      const input = {
        name: '  hello  ',
        nested: {
          value: '  world  ',
        },
      }
      const result = sanitizeObject(input)
      expect(result.name).toBe('hello')
      expect((result.nested as any).value).toBe('world')
    })

    it('should sanitize arrays', () => {
      const input = {
        tags: ['  tag1  ', '  tag2  '],
      }
      const result = sanitizeObject(input)
      expect(result.tags).toEqual(['tag1', 'tag2'])
    })
  })
})
