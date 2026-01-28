import { test, expect } from '@playwright/test'

/**
 * API Security & Validation Tests
 * Tests that API endpoints properly require authentication
 */
test.describe('API Security & Validation', () => {
  // Increase timeout for CI
  test.setTimeout(30000)

  test.describe('Unauthenticated Access', () => {
    test('POST /api/exchanges should return 401 without token', async ({ request }) => {
      const response = await request.post('/api/exchanges', {
        data: {
          itemId: 'test-item',
          ownerId: 'owner-id',
          requesterId: 'requester-id'
        }
      })
      expect(response.status()).toBe(401)
      
      const body = await response.json()
      expect(body).toHaveProperty('error')
    })
    
    test('POST /api/reports should return 401 without token', async ({ request }) => {
      const response = await request.post('/api/reports', {
        data: {
          reportType: 'item_report',
          description: 'Test report',
          targetId: 'target-id'
        }
      })
      expect(response.status()).toBe(401)
    })

    test('POST /api/support should return 401 without token', async ({ request }) => {
      const response = await request.post('/api/support', {
        data: {
          subject: 'Help needed',
          category: 'general',
          description: 'Help me with this issue please'
        }
      })
      expect(response.status()).toBe(401)
    })
  })

  test.describe('Error Response Structure', () => {
    test('401 response should have correct error structure', async ({ request }) => {
      const response = await request.post('/api/exchanges', { data: {} })
      expect(response.status()).toBe(401)
      
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body).toHaveProperty('code')
    })
  })

  test.describe('Admin Routes', () => {
    test('GET /api/admin/items should return 401 without token', async ({ request }) => {
      const response = await request.get('/api/admin/items')
      expect(response.status()).toBe(401)
    })
  })
})
