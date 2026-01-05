import { validateRMUEmail } from '../auth'

describe('Auth Utilities', () => {
  describe('validateRMUEmail', () => {
    it('should return true for valid RMU email with 12 digits', () => {
      expect(validateRMUEmail('123456789012@rmu.ac.th')).toBe(true)
    })

    it('should return false for email with less than 12 digits', () => {
      expect(validateRMUEmail('12345678901@rmu.ac.th')).toBe(false)
    })

    it('should return false for email with more than 12 digits', () => {
      expect(validateRMUEmail('1234567890123@rmu.ac.th')).toBe(false)
    })

    it('should return false for non-RMU domain', () => {
      expect(validateRMUEmail('123456789012@gmail.com')).toBe(false)
    })

    it('should return false for letters in student ID', () => {
      expect(validateRMUEmail('abc456789012@rmu.ac.th')).toBe(false)
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
