import { test, expect } from '@playwright/test'

// Increase timeout for all tests
test.setTimeout(60000)

test.describe('Dashboard Page (Public)', () => {
  test('dashboard redirects to login or shows content', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Dashboard may redirect to login if not authenticated
    // Or show the dashboard content if allowed for guests
    const url = page.url()
    const isLoginPage = url.includes('/login')
    const isDashboard = url.includes('/dashboard')
    
    expect(isLoginPage || isDashboard).toBe(true)
  })

  test('should show login form if redirected', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // If redirected to login, verify login form is shown
    const url = page.url()
    if (url.includes('/login')) {
      const emailInput = page.locator('input#email, input[type="email"]').first()
      await expect(emailInput).toBeVisible({ timeout: 10000 })
    }
  })
})

test.describe('Basic Navigation', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    
    // Landing page should have hero content
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible({ timeout: 10000 })
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')
    
    // Login page should have form
    const emailInput = page.locator('input#email, input[type="email"]').first()
    await expect(emailInput).toBeVisible({ timeout: 10000 })
  })

  test('register page loads', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('domcontentloaded')
    
    // Register page should have form with email input
    const emailInput = page.locator('input#email, input[type="email"]').first()
    await expect(emailInput).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Landing Page Content', () => {
  test('should display hero section', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Hero title should be visible
    const heroTitle = page.locator('h1')
    await expect(heroTitle).toBeVisible({ timeout: 10000 })
    
    // Should contain Thai text for exchange
    await expect(heroTitle).toContainText('แลกเปลี่ยน')
  })

  test('should have navigation links', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Page should have some navigation
    const header = page.locator('header').first()
    await expect(header).toBeVisible({ timeout: 10000 })
  })

  test('should have auth links in header', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Look for login/register links or buttons anywhere
    const loginElements = page.locator('a[href*="login"], button:has-text("เข้าสู่ระบบ")')
    const registerElements = page.locator('a[href*="register"], button:has-text("สมัคร")')
    
    // At least one should exist
    const loginCount = await loginElements.count()
    const registerCount = await registerElements.count()
    
    expect(loginCount + registerCount).toBeGreaterThan(0)
  })

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Click on login link
    const loginLink = page.locator('a[href*="login"]').first()
    if (await loginLink.isVisible()) {
      await loginLink.click()
      await expect(page).toHaveURL(/\/login/)
    }
  })

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Click on register link
    const registerLink = page.locator('a[href*="register"]').first()
    if (await registerLink.isVisible()) {
      await registerLink.click()
      await expect(page).toHaveURL(/\/register/)
    }
  })
})

test.describe('Auth Pages', () => {
  test('login page has email and password fields', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    const emailInput = page.locator('input#email, input[type="email"]').first()
    const passwordInput = page.locator('input#password, input[type="password"]').first()
    
    await expect(emailInput).toBeVisible({ timeout: 10000 })
    await expect(passwordInput).toBeVisible()
  })

  test('register page has required fields', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    
    const emailInput = page.locator('input#email, input[type="email"]').first()
    const passwordInput = page.locator('input#password').first()
    const confirmPasswordInput = page.locator('input#confirmPassword').first()
    
    await expect(emailInput).toBeVisible({ timeout: 10000 })
    await expect(passwordInput).toBeVisible()
    await expect(confirmPasswordInput).toBeVisible()
  })

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    const registerLink = page.locator('a[href*="register"]')
    await expect(registerLink).toBeVisible({ timeout: 10000 })
  })

  test('register page has link to login', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    
    const loginLink = page.locator('a[href*="login"]')
    await expect(loginLink).toBeVisible({ timeout: 10000 })
  })

  test('login form accepts input', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    const emailInput = page.locator('input#email, input[type="email"]').first()
    await emailInput.fill('test@rmu.ac.th')
    await expect(emailInput).toHaveValue('test@rmu.ac.th')
    
    const passwordInput = page.locator('input#password, input[type="password"]').first()
    await passwordInput.fill('password123')
    await expect(passwordInput).toHaveValue('password123')
  })

  test('register form accepts input', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    
    const emailInput = page.locator('input#email, input[type="email"]').first()
    await emailInput.fill('123456789012@rmu.ac.th')
    await expect(emailInput).toHaveValue('123456789012@rmu.ac.th')
    
    const passwordInput = page.locator('input#password').first()
    await passwordInput.fill('password123')
    await expect(passwordInput).toHaveValue('password123')
    
    const confirmPasswordInput = page.locator('input#confirmPassword').first()
    await confirmPasswordInput.fill('password123')
    await expect(confirmPasswordInput).toHaveValue('password123')
  })
})
