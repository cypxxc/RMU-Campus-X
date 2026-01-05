import type { ApiResponse } from './api-wrapper'

/**
 * Helper utilities for handling ApiResponse in components
 */

/**
 * Extract data from ApiResponse or return default value
 * 
 * @example
 * ```typescript
 * const result = await getItems()
 * const items = unwrapOr(result, [])
 * ```
 */
export function unwrapOr<T>(response: ApiResponse<T>, defaultValue: T): T {
  return response.success && response.data !== null ? response.data : defaultValue
}

/**
 * Extract data from ApiResponse or throw error
 * Use this when you want to handle errors at a higher level
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await getItem(id)
 *   const item = unwrap(result)
 * } catch (error) {
 *   toast.error(error.message)
 * }
 * ```
 */
export function unwrap<T>(response: ApiResponse<T>): T {
  if (response.success && response.data !== null) {
    return response.data
  }
  throw new Error(response.error || 'Unknown error')
}

/**
 * Check if ApiResponse is successful
 */
export function isSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } {
  return response.success && response.data !== null
}

/**
 * Check if ApiResponse is an error
 */
export function isError<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: false; error: string } {
  return !response.success
}

/**
 * Map ApiResponse data to a new value
 * 
 * @example
 * ```typescript
 * const result = await getItem(id)
 * const title = mapData(result, item => item?.title || 'Untitled')
 * ```
 */
export function mapData<T, U>(response: ApiResponse<T>, fn: (data: T | null) => U): U {
  return fn(response.data)
}

/**
 * Handle ApiResponse with callbacks
 * 
 * @example
 * ```typescript
 * const result = await getItem(id)
 * handleResponse(result, {
 *   onSuccess: (item) => console.log('Got item:', item),
 *   onError: (error) => toast.error(error)
 * })
 * ```
 */
export function handleResponse<T>(
  response: ApiResponse<T>,
  handlers: {
    onSuccess?: (data: T) => void
    onError?: (error: string) => void
  }
): void {
  if (response.success && response.data !== null) {
    handlers.onSuccess?.(response.data)
  } else {
    handlers.onError?.(response.error || 'Unknown error')
  }
}

/**
 * Convert old-style function to return ApiResponse
 * Useful for gradual migration
 * 
 * @example
 * ```typescript
 * const legacyGetItem = async (id: string) => {
 *   // old code that might throw
 *   return await fetchItem(id)
 * }
 * 
 * const newGetItem = wrapLegacy(legacyGetItem, 'getItem')
 * ```
 */
export async function wrapLegacy<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  context: string
): Promise<(...args: Args) => Promise<ApiResponse<T>>> {
  return async (...args: Args): Promise<ApiResponse<T>> => {
    try {
      const data = await fn(...args)
      return { data, error: null, success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${context}]`, error)
      return { data: null, error: errorMessage, success: false }
    }
  }
}

/**
 * Combine multiple ApiResponses
 * Returns success only if all responses are successful
 * 
 * @example
 * ```typescript
 * const [items, users] = await Promise.all([getItems(), getUsers()])
 * const combined = combineResponses({ items, users })
 * 
 * if (combined.success) {
 *   console.log(combined.data.items, combined.data.users)
 * }
 * ```
 */
export function combineResponses<T extends Record<string, ApiResponse<any>>>(
  responses: T
): ApiResponse<{ [K in keyof T]: T[K] extends ApiResponse<infer U> ? U : never }> {
  const errors: string[] = []
  const data: any = {}

  for (const [key, response] of Object.entries(responses)) {
    if (response.success && response.data !== null) {
      data[key] = response.data
    } else {
      errors.push(`${key}: ${response.error || 'Unknown error'}`)
    }
  }

  if (errors.length > 0) {
    return {
      data: null,
      error: errors.join('; '),
      success: false,
    }
  }

  return {
    data,
    error: null,
    success: true,
  }
}
