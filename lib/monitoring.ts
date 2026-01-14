/**
 * Application Monitoring & Error Tracking
 * 
 * This module provides centralized error logging and monitoring.
 * In production, this can be extended to integrate with:
 * - Sentry
 * - LogRocket
 * - Firebase Crashlytics
 * - Custom logging service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
  userId?: string
  requestId?: string
  stack?: string
}

interface MonitoringConfig {
  enabled: boolean
  logLevel: LogLevel
  captureExceptions: boolean
  sendToServer: boolean
}

// Default configuration
const config: MonitoringConfig = {
  enabled: true,
  logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  captureExceptions: process.env.NODE_ENV === 'production',
  sendToServer: process.env.NODE_ENV === 'production',
}

// Log level priority
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
}

// In-memory log buffer (for batching)
const logBuffer: LogEntry[] = []
const MAX_BUFFER_SIZE = 100

/**
 * Check if log should be processed based on level
 */
function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return false
  return LOG_LEVELS[level] >= LOG_LEVELS[config.logLevel]
}

/**
 * Format log entry for console output
 */
function formatForConsole(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
    entry.message,
  ]
  
  if (entry.context) {
    parts.push(JSON.stringify(entry.context))
  }
  
  return parts.join(' ')
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    stack: error?.stack,
  }
}

/**
 * Process and output log entry
 */
function processLog(entry: LogEntry): void {
  // Console output
  const formatted = formatForConsole(entry)
  
  switch (entry.level) {
    case 'debug':
      console.debug(formatted)
      break
    case 'info':
      console.info(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
    case 'fatal':
      console.error(formatted)
      if (entry.stack) console.error(entry.stack)
      break
  }

  // Add to buffer
  logBuffer.push(entry)
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift()
  }
}

// Public API

/**
 * Log debug message
 */
export function debug(message: string, context?: Record<string, unknown>): void {
  if (!shouldLog('debug')) return
  processLog(createLogEntry('debug', message, context))
}

/**
 * Log info message
 */
export function info(message: string, context?: Record<string, unknown>): void {
  if (!shouldLog('info')) return
  processLog(createLogEntry('info', message, context))
}

/**
 * Log warning message
 */
export function warn(message: string, context?: Record<string, unknown>): void {
  if (!shouldLog('warn')) return
  processLog(createLogEntry('warn', message, context))
}

/**
 * Log error message
 */
export function error(
  message: string,
  errorOrContext?: Error | Record<string, unknown>,
  context?: Record<string, unknown>
): void {
  if (!shouldLog('error')) return
  
  const err = errorOrContext instanceof Error ? errorOrContext : undefined
  const ctx = errorOrContext instanceof Error ? context : errorOrContext
  
  processLog(createLogEntry('error', message, ctx, err))
}

/**
 * Log fatal error
 */
export function fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
  processLog(createLogEntry('fatal', message, context, error))
}

/**
 * Capture exception for error tracking
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!config.captureExceptions) return
  
  processLog(createLogEntry('error', error.message, {
    ...context,
    name: error.name,
  }, error))
  
  // In production, send to error tracking service
  // Example: Sentry.captureException(error, { extra: context })
}

/**
 * Track performance metric
 */
export function trackPerformance(
  name: string,
  durationMs: number,
  context?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === 'development') {
    debug(`[Performance] ${name}: ${durationMs.toFixed(2)}ms`, context)
  }
}

/**
 * Create a performance timer
 */
export function startTimer(name: string): () => number {
  const start = performance.now()
  return () => {
    const duration = performance.now() - start
    trackPerformance(name, duration)
    return duration
  }
}

/**
 * Get recent logs from buffer
 */
export function getRecentLogs(count: number = 50): LogEntry[] {
  return logBuffer.slice(-count)
}

/**
 * Clear log buffer
 */
export function clearLogs(): void {
  logBuffer.length = 0
}

/**
 * Set user context for logs
 */
let currentUserId: string | undefined

export function setUser(userId: string | undefined): void {
  currentUserId = userId
}

export function getUser(): string | undefined {
  return currentUserId
}

// Default export for convenience
export const monitoring = {
  debug,
  info,
  warn,
  error,
  fatal,
  captureException,
  trackPerformance,
  startTimer,
  getRecentLogs,
  clearLogs,
  setUser,
  getUser,
}

export default monitoring
