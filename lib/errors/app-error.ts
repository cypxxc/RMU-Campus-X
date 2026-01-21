// ============================================================
// Centralized Error Handling - App Errors
// ============================================================

import { ERROR_CODES, type ErrorCode } from "./error-codes"

/**
 * Base Application Error
 * All application errors should extend this class
 */
export class AppError extends Error {
  public readonly isOperational: boolean
  public readonly timestamp: Date

  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly statusCode: number = 500,
    isOperational = true
  ) {
    super(message)
    this.name = "AppError"
    this.isOperational = isOperational
    this.timestamp = new Date()

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
    }
  }
}

// ============ Specific Error Types ============

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID "${id}" not found` : `${resource} not found`
    super(message, ERROR_CODES.NOT_FOUND, 404)
    this.name = "NotFoundError"
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, ERROR_CODES.UNAUTHORIZED, 401)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, ERROR_CODES.FORBIDDEN, 403)
    this.name = "ForbiddenError"
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly errors: Array<{ field: string; message: string }> = []
  ) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400)
    this.name = "ValidationError"
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors,
    }
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, ERROR_CODES.CONFLICT, 409)
    this.name = "ConflictError"
  }
}

export class RateLimitError extends AppError {
  constructor(
    message = "Too many requests",
    public readonly retryAfter?: number
  ) {
    super(message, ERROR_CODES.RATE_LIMITED, 429)
    this.name = "RateLimitError"
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(
      `External service "${service}" failed: ${originalError?.message || "Unknown error"}`,
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      502,
      false
    )
    this.name = "ExternalServiceError"
  }
}

// ============ Helper Functions ============

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      ERROR_CODES.INTERNAL_ERROR,
      500,
      false
    )
  }

  return new AppError(
    String(error),
    ERROR_CODES.INTERNAL_ERROR,
    500,
    false
  )
}

/**
 * Check if error is operational (safe to expose to user)
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}
