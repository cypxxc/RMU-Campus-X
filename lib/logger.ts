/**
 * Centralized logging system for the application
 * Provides structured logging with different levels and environments
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: Date
  source?: string
  userId?: string
  requestId?: string
}

class Logger {
  private static instance: Logger
  private logLevel: LogLevel
  private isProduction: boolean

  private constructor() {
    this.isProduction = process.env.NODE_ENV === "production"
    // In production, only log WARN and above
    this.logLevel = this.isProduction ? LogLevel.WARN : LogLevel.DEBUG
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const levelStr = LogLevel[entry.level].padEnd(5)
    const source = entry.source ? `[${entry.source}]` : ""
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : ""
    
    return `${timestamp} ${levelStr} ${source} ${entry.message}${context}`
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, source?: string): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      source,
    }

    const formattedMessage = this.formatMessage(entry)

    // Send to appropriate console method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage)
        break
      case LogLevel.INFO:
        console.info(formattedMessage)
        break
      case LogLevel.WARN:
        console.warn(formattedMessage)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage)
        break
    }

    // In production, could also send to external logging service
    if (this.isProduction && level >= LogLevel.ERROR) {
      this.sendToExternalService(entry)
    }
  }

  private async sendToExternalService(_entry: LogEntry): Promise<void> {
    // Integration point for external logging services (Sentry, LogRocket, etc.)
    // For now, just log to console in production
    try {
      // Could implement Sentry integration here
      // Sentry.captureException(new Error(entry.message), { extra: entry.context })
    } catch (error) {
      // Fail silently to avoid infinite logging loops
      console.error("Failed to send log to external service:", error)
    }
  }

  public debug(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log(LogLevel.DEBUG, message, context, source)
  }

  public info(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log(LogLevel.INFO, message, context, source)
  }

  public warn(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log(LogLevel.WARN, message, context, source)
  }

  public error(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log(LogLevel.ERROR, message, context, source)
  }

  public fatal(message: string, context?: Record<string, unknown>, source?: string): void {
    this.log(LogLevel.FATAL, message, context, source)
  }

  // Convenience methods for common patterns
  public apiError(method: string, endpoint: string, error: unknown, context?: Record<string, unknown>): void {
    this.error(`${method} ${endpoint} failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      endpoint,
      method,
      ...context,
    }, "API")
  }

  public userAction(action: string, userId: string, context?: Record<string, unknown>): void {
    this.info(`User action: ${action}`, { userId, ...context }, "USER")
  }

  public adminAction(action: string, adminId: string, targetId?: string, context?: Record<string, unknown>): void {
    this.info(`Admin action: ${action}`, { adminId, targetId, ...context }, "ADMIN")
  }

  public security(event: string, context?: Record<string, unknown>): void {
    this.warn(`Security event: ${event}`, context, "SECURITY")
  }

  public performance(operation: string, duration: number, context?: Record<string, unknown>): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO
    this.log(level, `Performance: ${operation} took ${duration}ms`, { duration, ...context }, "PERF")
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Export convenience functions for direct usage
export const log = {
  debug: (message: string, context?: Record<string, unknown>, source?: string) => logger.debug(message, context, source),
  info: (message: string, context?: Record<string, unknown>, source?: string) => logger.info(message, context, source),
  warn: (message: string, context?: Record<string, unknown>, source?: string) => logger.warn(message, context, source),
  error: (message: string, context?: Record<string, unknown>, source?: string) => logger.error(message, context, source),
  fatal: (message: string, context?: Record<string, unknown>, source?: string) => logger.fatal(message, context, source),
  apiError: (method: string, endpoint: string, error: unknown, context?: Record<string, unknown>) => logger.apiError(method, endpoint, error, context),
  userAction: (action: string, userId: string, context?: Record<string, unknown>) => logger.userAction(action, userId, context),
  adminAction: (action: string, adminId: string, targetId?: string, context?: Record<string, unknown>) => logger.adminAction(action, adminId, targetId, context),
  security: (event: string, context?: Record<string, unknown>) => logger.security(event, context),
  performance: (operation: string, duration: number, context?: Record<string, unknown>) => logger.performance(operation, duration, context),
}
