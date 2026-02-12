import { getErrorMessage, logError } from './error-messages'

/**
 * Standard API response format
 */
export type ApiResponse<T> = {
  data: T | null
  error: string | null
  success: boolean
}

/**
 * Timeout configuration for different operation types
 */
export const TIMEOUT_CONFIG = {
  // Quick operations (get single document)
  QUICK: 5000, // 5 seconds
  // Standard operations (queries, updates)
  STANDARD: 10000, // 10 seconds
  // Heavy operations (batch operations, complex queries)
  HEAVY: 30000, // 30 seconds
  // File uploads
  UPLOAD: 60000, // 60 seconds
} as const

/**
 * Wrapper for async operations with timeout support
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string = 'Operation'
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${operationName} timeout after ${timeoutMs}ms`)),
      timeoutMs
    )
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timer!)
  }
}

/**
 * Main API call wrapper with timeout and error handling
 * 
 * @param fn - The async function to execute
 * @param context - Context name for logging (e.g., 'getItemById')
 * @param timeoutMs - Timeout in milliseconds (default: STANDARD)
 * @returns ApiResponse with data or error
 * 
 * @example
 * ```typescript
 * const result = await apiCall(
 *   async () => {
 *     const doc = await getDoc(docRef)
 *     return doc.data()
 *   },
 *   'getItemById',
 *   TIMEOUT_CONFIG.QUICK
 * )
 * 
 * if (result.success) {
 *   console.log(result.data)
 * } else {
 *   console.error(result.error)
 * }
 * ```
 */
export async function apiCall<T>(
  fn: () => Promise<T>,
  context: string,
  timeoutMs: number = TIMEOUT_CONFIG.STANDARD
): Promise<ApiResponse<T>> {
  const startTime = performance.now()
  
  try {
    // Execute function with timeout
    const data = await withTimeout(fn(), timeoutMs, context)
    
    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      const duration = performance.now() - startTime
      console.log(`[${context}] Completed in ${duration.toFixed(2)}ms`)
    }
    
    return {
      data,
      error: null,
      success: true,
    }
  } catch (error) {
    // Log error
    logError(context, error)
    
    // Log performance even on error
    if (process.env.NODE_ENV === 'development') {
      const duration = performance.now() - startTime
      console.log(`[${context}] Failed after ${duration.toFixed(2)}ms`)
    }
    
    return {
      data: null,
      error: getErrorMessage(error),
      success: false,
    }
  }
}

/**
 * Batch API calls with individual error handling
 * Continues execution even if some calls fail
 * 
 * @param calls - Array of API call configurations
 * @returns Array of results in the same order
 * 
 * @example
 * ```typescript
 * const results = await batchApiCalls([
 *   { fn: () => getItem('1'), context: 'getItem1' },
 *   { fn: () => getItem('2'), context: 'getItem2' },
 * ])
 * ```
 */
export async function batchApiCalls<T>(
  calls: Array<{
    fn: () => Promise<T>
    context: string
    timeout?: number
  }>
): Promise<Array<ApiResponse<T>>> {
  return Promise.all(
    calls.map(({ fn, context, timeout }) =>
      apiCall(fn, context, timeout)
    )
  )
}

/**
 * Retry wrapper for failed API calls
 * 
 * @param fn - The async function to execute
 * @param context - Context name for logging
 * @param maxRetries - Maximum number of retries (default: 2)
 * @param retryDelay - Delay between retries in ms (default: 1000)
 * @returns ApiResponse with data or error
 */
export async function apiCallWithRetry<T>(
  fn: () => Promise<T>,
  context: string,
  maxRetries: number = 2,
  retryDelay: number = 1000,
  timeoutMs: number = TIMEOUT_CONFIG.STANDARD
): Promise<ApiResponse<T>> {
  let lastError: string = ''
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      console.log(`[${context}] Retry attempt ${attempt}/${maxRetries}`)
    }
    
    const result = await apiCall(fn, context, timeoutMs)
    
    if (result.success) {
      return result
    }
    
    lastError = result.error || 'Unknown error'
    
    // Don't retry on certain errors
    if (lastError.includes('permission') || lastError.includes('not found')) {
      break
    }
  }
  
  return {
    data: null,
    error: lastError,
    success: false,
  }
}
