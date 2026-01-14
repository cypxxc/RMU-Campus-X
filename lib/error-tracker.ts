/**
 * Error Tracking Service
 * Centralized error reporting for production
 * 
 * Setup Instructions:
 * 1. Create account at https://sentry.io
 * 2. Create a Next.js project
 * 3. Add NEXT_PUBLIC_SENTRY_DSN to .env
 * 4. Add SENTRY_AUTH_TOKEN to .env (for source maps)
 */

type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug'

interface ErrorContext {
  userId?: string
  email?: string
  extra?: Record<string, unknown>
  tags?: Record<string, string>
}

interface ErrorTracker {
  captureException: (error: Error, context?: ErrorContext) => string
  captureMessage: (message: string, severity?: ErrorSeverity, context?: ErrorContext) => string
  setUser: (user: { id: string; email?: string; username?: string } | null) => void
  addBreadcrumb: (message: string, category?: string, data?: Record<string, unknown>) => void
  flush: () => Promise<boolean>
}

// Initialize error tracker (Sentry-compatible API)
class ErrorTrackerService implements ErrorTracker {
  private isInitialized = false
  private userId: string | null = null

  constructor() {
    this.initialize()
  }

  private initialize() {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

    if (!dsn) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ErrorTracker] Running in development mode (no DSN)')
      }
      return
    }

    // In production, you would initialize Sentry here:
    // Sentry.init({
    //   dsn,
    //   environment: process.env.NODE_ENV,
    //   tracesSampleRate: 0.1,
    //   replaysSessionSampleRate: 0.1,
    //   replaysOnErrorSampleRate: 1.0,
    // })

    this.isInitialized = true
    console.log('[ErrorTracker] Initialized')
  }

  captureException(error: Error, context?: ErrorContext): string {
    const eventId = this.generateEventId()

    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorTracker] Exception:', error.message, context)
      return eventId
    }

    if (!this.isInitialized) {
      console.error('[ErrorTracker] Not initialized:', error.message)
      return eventId
    }

    // Log to console with structured data
    console.error('[ErrorTracker] Captured:', {
      eventId,
      error: error.message,
      stack: error.stack,
      userId: context?.userId || this.userId,
      ...context,
    })

    // In production with Sentry:
    // return Sentry.captureException(error, { extra: context?.extra, tags: context?.tags })

    return eventId
  }

  captureMessage(message: string, severity: ErrorSeverity = 'info', context?: ErrorContext): string {
    const eventId = this.generateEventId()

    if (process.env.NODE_ENV === 'development') {
      console.log(`[ErrorTracker] ${severity.toUpperCase()}:`, message)
      return eventId
    }

    console.log('[ErrorTracker] Message:', { eventId, message, severity, ...context })

    // In production with Sentry:
    // return Sentry.captureMessage(message, severity)

    return eventId
  }

  setUser(user: { id: string; email?: string; username?: string } | null): void {
    this.userId = user?.id || null

    if (process.env.NODE_ENV === 'development') {
      console.log('[ErrorTracker] User set:', user?.id || 'anonymous')
    }

    // In production with Sentry:
    // Sentry.setUser(user)
  }

  addBreadcrumb(message: string, category = 'default', data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ErrorTracker] Breadcrumb:', { message, category, data })
    }

    // In production with Sentry:
    // Sentry.addBreadcrumb({ message, category, data })
  }

  async flush(): Promise<boolean> {
    // In production with Sentry:
    // return Sentry.flush(2000)
    return true
  }

  private generateEventId(): string {
    return Math.random().toString(36).substring(2, 15)
  }
}

// Singleton instance
export const errorTracker = new ErrorTrackerService()

// Convenience exports
export const captureException = errorTracker.captureException.bind(errorTracker)
export const captureMessage = errorTracker.captureMessage.bind(errorTracker)
export const setErrorUser = errorTracker.setUser.bind(errorTracker)
export const addBreadcrumb = errorTracker.addBreadcrumb.bind(errorTracker)

// React Error Boundary helper
export function captureReactError(error: Error, errorInfo: React.ErrorInfo): void {
  errorTracker.captureException(error, {
    extra: {
      componentStack: errorInfo.componentStack,
    },
  })
}

// API Error helper
export function captureApiError(
  error: Error,
  endpoint: string,
  method: string,
  statusCode?: number
): void {
  errorTracker.captureException(error, {
    tags: {
      api_endpoint: endpoint,
      api_method: method,
      status_code: statusCode?.toString() || 'unknown',
    },
  })
}
