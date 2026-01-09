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

// ============ Response Helpers ============

/**
 * Create a success response
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Create an error response
 */
export function errorResponse(
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

/**
 * Common error responses
 */
export const ApiErrors = {
  unauthorized: (message = "Unauthorized") => 
    errorResponse(message, 401, "UNAUTHORIZED"),
  
  forbidden: (message = "Forbidden") => 
    errorResponse(message, 403, "FORBIDDEN"),
  
  notFound: (message = "Not found") => 
    errorResponse(message, 404, "NOT_FOUND"),
  
  badRequest: (message = "Bad request") => 
    errorResponse(message, 400, "BAD_REQUEST"),
  
  methodNotAllowed: (method: string) => 
    errorResponse(`Method ${method} not allowed`, 405, "METHOD_NOT_ALLOWED"),
  
  internalError: (message = "Internal server error") => 
    errorResponse(message, 500, "INTERNAL_ERROR"),
  
  rateLimited: (message = "Too many requests") => 
    errorResponse(message, 429, "RATE_LIMITED"),
  
  validationError: (message: string, details?: unknown) => 
    errorResponse(message, 400, "VALIDATION_ERROR", details),

  missingFields: (fields: string[]) =>
    errorResponse(`Missing required fields: ${fields.join(", ")}`, 400, "MISSING_FIELDS"),

  invalidToken: (message = "Invalid or expired token") =>
    errorResponse(message, 401, "INVALID_TOKEN"),
}

// ============ Error Handler Wrapper ============

/**
 * Wrap an API handler with error handling
 */
export function withErrorHandler<T>(
  handler: (req: Request) => Promise<NextResponse<T>>
) {
  return async (req: Request): Promise<NextResponse<T | ApiErrorResponse>> => {
    try {
      return await handler(req)
    } catch (error) {
      console.error("[API Error]:", error)
      
      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes("Unauthorized")) {
          return ApiErrors.unauthorized(error.message)
        }
        if (error.message.includes("Not found")) {
          return ApiErrors.notFound(error.message)
        }
        
        return errorResponse(error.message, 500, "INTERNAL_ERROR")
      }
      
      return ApiErrors.internalError()
    }
  }
}

// ============ Request Validation Helpers ============

/**
 * Validate required fields in request body
 */
export function validateRequiredFields<T extends object>(
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

/**
 * Parse and validate JSON body from request
 */
export async function parseRequestBody<T>(req: Request): Promise<T | null> {
  try {
    return await req.json() as T
  } catch {
    return null
  }
}

// ============ Auth Helpers ============

/**
 * Get authorization token from request headers
 */
export function getAuthToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  return authHeader.slice(7)
}

/**
 * Check if request has valid content type
 */
export function hasValidContentType(req: Request, expectedType = "application/json"): boolean {
  const contentType = req.headers.get("content-type")
  return contentType?.includes(expectedType) ?? false
}
