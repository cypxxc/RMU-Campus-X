import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getClientIP, RATE_LIMITS } from './lib/rate-limiter'

/**
 * Next.js Middleware for rate limiting API requests
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Only apply rate limiting to API routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
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
  
  const { allowed, remaining, resetTime } = checkRateLimit(
    key,
    rateLimitConfig.limit,
    rateLimitConfig.windowMs
  )
  
  // If rate limited, return 429
  if (!allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(rateLimitConfig.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
          'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000))
        }
      }
    )
  }
  
  // Add rate limit headers to response
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', String(rateLimitConfig.limit))
  response.headers.set('X-RateLimit-Remaining', String(remaining))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)))
  
  return response
}

// Configure which routes to apply middleware to
export const config = {
  matcher: '/api/:path*'
}
