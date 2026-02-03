import { validateRMUEmail } from '../auth'

describe('Auth Utilities', () => {
  describe('validateRMUEmail', () => {
    it('should return true for student email (12 digits)', () => {
      expect(validateRMUEmail('123456789012@rmu.ac.th')).toBe(true)
    })

    it('should return true for lecturer/staff email (letters)', () => {
      expect(validateRMUEmail('somchai@rmu.ac.th')).toBe(true)
      expect(validateRMUEmail('abc456789012@rmu.ac.th')).toBe(true)
    })

    it('should return false for non-RMU domain', () => {
      expect(validateRMUEmail('123456789012@gmail.com')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(validateRMUEmail('')).toBe(false)
    })

    it('should return false for email without @', () => {
      expect(validateRMUEmail('123456789012rmu.ac.th')).toBe(false)
    })

    it('should return false for similar but wrong domain', () => {
      expect(validateRMUEmail('123456789012@rmu.ac.com')).toBe(false)
      expect(validateRMUEmail('123456789012@rmu.co.th')).toBe(false)
    })
  })
})
