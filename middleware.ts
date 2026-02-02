import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimitScalable, getClientIP, RATE_LIMITS } from './lib/upstash-rate-limiter'

/**
 * Generate a unique request ID for tracing
 * Format: timestamp-random (e.g., "1705912345678-a1b2c3d4")
 */
function generateRequestId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}`
}

/**
 * Next.js Middleware for rate limiting API requests
 * Uses Upstash Redis for distributed rate limiting (persists across deploys)
 * Falls back to in-memory if Upstash env vars are not configured
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Generate unique request ID for tracing
  const requestId = request.headers.get('X-Request-Id') || generateRequestId()
  
  // Only apply rate limiting to API routes
  if (!pathname.startsWith('/api')) {
    const response = NextResponse.next()
    response.headers.set('X-Request-Id', requestId)
    return response
  }
  
  const clientIP = getClientIP(request)
  
  // Determine rate limit based on endpoint type
  let rateLimitConfig: { limit: number; windowMs: number } = RATE_LIMITS.API
  
  if (pathname.includes('/upload')) {
    rateLimitConfig = RATE_LIMITS.UPLOAD
  } else if (pathname.includes('/auth') || pathname.includes('/login') || pathname.includes('/register')) {
    rateLimitConfig = RATE_LIMITS.AUTH
  }
  
  // Create unique key for this client + endpoint type
  const key = `${clientIP}:${pathname.split('/')[2] || 'api'}`
  
  const { allowed, remaining, resetTime } = await checkRateLimitScalable(
    key,
    rateLimitConfig.limit,
    rateLimitConfig.windowMs
  )
  
  // If rate limited, return 429
  if (!allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
        requestId, // Include for debugging
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
          'X-RateLimit-Limit': String(rateLimitConfig.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
          'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000))
        }
      }
    )
  }
  
  // Add rate limit and request ID headers to response
  const response = NextResponse.next()
  response.headers.set('X-Request-Id', requestId)
  response.headers.set('X-RateLimit-Limit', String(rateLimitConfig.limit))
  response.headers.set('X-RateLimit-Remaining', String(remaining))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)))
  
  return response
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files with extensions: svg, png, jpg, jpeg, gif, webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

