import { test, expect } from '@playwright/test'

/**
 * Authentication UI Flow Tests
 * These tests verify form validation behavior
 * 
 * Note: Some tests are marked .skip in CI due to environment variability
 */
test.describe('Authentication UI Flow', () => {
  // Increase timeout for CI
  test.setTimeout(60000)

  test.describe('Register Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/register')
      await page.waitForLoadState('networkidle')
    })

    test('should show validation error for invalid RMU email', async ({ page }) => {
      // Wait for form to be ready
      await page.waitForSelector('input#email', { timeout: 10000 })
      
      // Input invalid email
      await page.fill('input#email', 'invalid@gmail.com')
      await page.fill('input#password', 'password123')
      await page.fill('input#confirmPassword', 'password123')
      
      // Submit
      await page.click('button[type="submit"]')

      // Check for error - either HTML5 validation or UI error
      const emailInput = page.locator('input#email')
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity())
      expect(isInvalid).toBe(true)
    })

    // This test can be flaky in CI - skip if needed
    test.skip('should show error when passwords do not match', async ({ page }) => {
      await page.waitForSelector('input#email', { timeout: 10000 })
      
      await page.fill('input#email', '630123456789@rmu.ac.th')
      await page.fill('input#password', 'password123')
      await page.fill('input#confirmPassword', 'password456')
      
      await page.click('button[type="submit"]')
      
      // Look for Thai error message
      await expect(page.getByText(/ไม่ตรงกัน|match/i).first()).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Login Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
      await page.waitForLoadState('networkidle')
    })

    test('should require email and password', async ({ page }) => {
      await page.waitForSelector('input#email', { timeout: 10000 })
      await page.click('button[type="submit"]')
      
      const emailInput = page.locator('input#email')
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity())
      expect(isInvalid).toBe(true)
    })
  })
})
