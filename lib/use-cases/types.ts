// ============================================================
// Use Case Pattern - Base Types
// ============================================================

/**
 * Base Use Case Interface
 * Represents a single application use case with execute method
 */
export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>
}

/**
 * Use Case Result wrapper
 * Provides consistent success/failure handling
 */
export type UseCaseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string }

/**
 * Helper to create success result
 */
export function success<T>(data: T): UseCaseResult<T> {
  return { success: true, data }
}

/**
 * Helper to create failure result
 */
export function failure<T>(error: string, code: string): UseCaseResult<T> {
  return { success: false, error, code }
}
