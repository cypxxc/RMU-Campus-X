/**
 * API Response Utilities
 * Standardized response helpers for Next.js API routes
 */

import { NextResponse } from "next/server"

// ============ Types ============

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: unknown
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

class ApiResponseService {
  successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
    return NextResponse.json({ success: true, data }, { status })
  }

  errorResponse(
    message: string,
    status = 400,
    code?: string,
    details?: unknown
  ): NextResponse<ApiErrorResponse> {
    const response: ApiErrorResponse = { success: false, error: message }
    if (code) response.code = code
    if (details) response.details = details
    return NextResponse.json(response, { status })
  }

  readonly apiErrors = {
    unauthorized: (message = "Unauthorized") =>
      this.errorResponse(message, 401, "UNAUTHORIZED"),

    forbidden: (message = "Forbidden") =>
      this.errorResponse(message, 403, "FORBIDDEN"),

    notFound: (message = "Not found") =>
      this.errorResponse(message, 404, "NOT_FOUND"),

    badRequest: (message = "Bad request") =>
      this.errorResponse(message, 400, "BAD_REQUEST"),

    methodNotAllowed: (method: string) =>
      this.errorResponse(`Method ${method} not allowed`, 405, "METHOD_NOT_ALLOWED"),

    internalError: (message = "Internal server error") =>
      this.errorResponse(message, 500, "INTERNAL_ERROR"),

    rateLimited: (message = "Too many requests") =>
      this.errorResponse(message, 429, "RATE_LIMITED"),

    validationError: (message: string, details?: unknown) =>
      this.errorResponse(message, 400, "VALIDATION_ERROR", details),

    missingFields: (fields: string[]) =>
      this.errorResponse(`Missing required fields: ${fields.join(", ")}`, 400, "MISSING_FIELDS"),

    invalidToken: (message = "Invalid or expired token") =>
      this.errorResponse(message, 401, "INVALID_TOKEN"),

    conflict: (message = "Conflict") =>
      this.errorResponse(message, 409, "CONFLICT"),
  }

  withErrorHandler<T>(handler: (req: Request) => Promise<NextResponse<T>>) {
    return async (req: Request): Promise<NextResponse<T | ApiErrorResponse>> => {
      try {
        return await handler(req)
      } catch (error) {
        console.error("[API Error]:", error)

        if (error instanceof Error) {
          if (error.message.includes("Unauthorized")) {
            return this.apiErrors.unauthorized(error.message)
          }
          if (error.message.includes("Not found")) {
            return this.apiErrors.notFound(error.message)
          }

          return this.errorResponse(error.message, 500, "INTERNAL_ERROR")
        }

        return this.apiErrors.internalError()
      }
    }
  }

  validateRequiredFields<T extends object>(
    body: T,
    requiredFields: (keyof T)[]
  ): { valid: boolean; missing: string[] } {
    const missing = requiredFields.filter(field => {
      const value = body[field]
      return value === undefined || value === null || value === ""
    }) as string[]

    return {
      valid: missing.length === 0,
      missing,
    }
  }

  async parseRequestBody<T>(req: Request): Promise<T | null> {
    try {
      return await req.json() as T
    } catch {
      return null
    }
  }

  getAuthToken(req: Request): string | null {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return null
    }
    return authHeader.slice(7)
  }

  hasValidContentType(req: Request, expectedType = "application/json"): boolean {
    const contentType = req.headers.get("content-type")
    return contentType?.includes(expectedType) ?? false
  }
}

const apiResponseService = new ApiResponseService()

// ============ Response Helpers ============
export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return apiResponseService.successResponse(data, status)
}

export function errorResponse(
  message: string,
  status = 400,
  code?: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return apiResponseService.errorResponse(message, status, code, details)
}

export const ApiErrors = apiResponseService.apiErrors

// ============ Error Handler Wrapper ============
export function withErrorHandler<T>(
  handler: (req: Request) => Promise<NextResponse<T>>
) {
  return apiResponseService.withErrorHandler(handler)
}

// ============ Request Validation Helpers ============
export function validateRequiredFields<T extends object>(
  body: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missing: string[] } {
  return apiResponseService.validateRequiredFields(body, requiredFields)
}

export async function parseRequestBody<T>(req: Request): Promise<T | null> {
  return apiResponseService.parseRequestBody<T>(req)
}

// ============ Auth Helpers ============
export function getAuthToken(req: Request): string | null {
  return apiResponseService.getAuthToken(req)
}

export function hasValidContentType(req: Request, expectedType = "application/json"): boolean {
  return apiResponseService.hasValidContentType(req, expectedType)
}
