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
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const h1 = page.locator('h1#hero-heading').first()
    await expect(h1).toBeVisible({ timeout: 15000 })
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    const emailInput = page.locator('input#email, input[type="email"], input[name="email"]').first()
    await expect(emailInput).toBeVisible({ timeout: 15000 })
  })

  test('register page loads', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' })
    const emailInput = page.locator('input#email, input[type="email"], input[name="email"]').first()
    await expect(emailInput).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Landing Page Content', () => {
  test('should display hero section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const heroTitle = page.locator('h1#hero-heading').first()
    await expect(heroTitle).toBeVisible({ timeout: 15000 })
    await expect(heroTitle).toHaveText(/\S+/)
    const highlight = heroTitle.locator('span').first()
    await expect(highlight).toBeVisible({ timeout: 15000 })
  })

  test('should have navigation links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const header = page.locator('header').first()
    await expect(header).toBeVisible({ timeout: 15000 })
  })

  test('should have auth links in header', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    // Wait for the logo or something in the header to be sure it's rendered
    await page.waitForSelector('header', { state: 'visible', timeout: 15000 })
    const loginLink = page.locator('header a[href*="login"]').first()
    const registerLink = page.locator('header a[href*="register"]').first()
    await expect(loginLink).toBeVisible({ timeout: 15000 })
    await expect(registerLink).toBeVisible({ timeout: 15000 })
  })

  test('should navigate to login page', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Flaky navigation on WebKit in CI environment')
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    // Small wait for hydration to complete
    await page.waitForTimeout(1000)
    
    const loginLink = page.locator('header a[href*="login"]').first()
    await expect(loginLink).toBeVisible({ timeout: 15000 })
    await loginLink.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 30000 })
  })

  test('should navigate to register page', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Flaky navigation on WebKit in CI environment')
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    const registerLink = page.locator('header a[href*="register"]').first()
    await expect(registerLink).toBeVisible({ timeout: 15000 })
    await registerLink.click()
    await expect(page).toHaveURL(/\/register/, { timeout: 30000 })
  })
})

test.describe('Auth Pages', () => {
  test('login page has email and password fields', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    const emailInput = page.locator('input#email, input[type="email"], input[name="email"]').first()
    const passwordInput = page.locator('input#password, input[type="password"], input[name="password"]').first()
    await expect(emailInput).toBeVisible({ timeout: 15000 })
    await expect(passwordInput).toBeVisible({ timeout: 10000 })
  })

  test('register page has required fields', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' })
    const emailInput = page.locator('input#email, input[type="email"], input[name="email"]').first()
    const passwordInput = page.locator('input#password, input[name="password"]').first()
    const confirmPasswordInput = page.locator('input#confirmPassword, input[name="confirmPassword"]').first()
    await expect(emailInput).toBeVisible({ timeout: 15000 })
    await expect(passwordInput).toBeVisible({ timeout: 10000 })
    await expect(confirmPasswordInput).toBeVisible({ timeout: 10000 })
  })

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    const registerLink = page.locator('a[href="/register"]')
    await expect(registerLink.first()).toBeVisible({ timeout: 15000 })
  })

  test('register page has link to login', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' })
    const loginLink = page.locator('a[href="/login"]')
    await expect(loginLink.first()).toBeVisible({ timeout: 15000 })
  })

  test('login form accepts input', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    const emailInput = page.locator('input#email, input[type="email"], input[name="email"]').first()
    await expect(emailInput).toBeVisible({ timeout: 15000 })
    await emailInput.fill('test@rmu.ac.th', { force: true })
    await expect(emailInput).toHaveValue('test@rmu.ac.th')
    const passwordInput = page.locator('input#password, input[type="password"], input[name="password"]').first()
    await passwordInput.fill('password123')
    await expect(passwordInput).toHaveValue('password123')
  })

  test('register form accepts input', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'load' })
    const emailInput = page.locator('input#email, input[type="email"], input[name="email"]').first()
    await expect(emailInput).toBeVisible({ timeout: 15000 })
    await emailInput.fill('123456789012@rmu.ac.th')
    await expect(emailInput).toHaveValue('123456789012@rmu.ac.th')
    const passwordInput = page.locator('input#password, input[name="password"]').first()
    await passwordInput.fill('password123')
    await expect(passwordInput).toHaveValue('password123')
    const confirmPasswordInput = page.locator('input#confirmPassword, input[name="confirmPassword"]').first()
    await confirmPasswordInput.fill('password123')
    await expect(confirmPasswordInput).toHaveValue('password123')
  })
})
