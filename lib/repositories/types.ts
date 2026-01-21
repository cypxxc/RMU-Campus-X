// ============================================================
// Repository Pattern - Base Types
// ============================================================

/**
 * Generic Repository Interface
 * Provides standard CRUD operations for any entity
 */
export interface IRepository<T, CreateInput = Partial<T>, UpdateInput = Partial<T>> {
  findById(id: string): Promise<T | null>
  findAll(options?: QueryOptions): Promise<T[]>
  create(data: CreateInput): Promise<T>
  update(id: string, data: UpdateInput): Promise<void>
  delete(id: string): Promise<void>
}

/**
 * Query Options for find operations
 */
export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  filters?: Record<string, unknown>
}

/**
 * Pagination result wrapper
 */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  hasMore: boolean
  lastDoc?: unknown
}

/**
 * Repository Error
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly entity: string
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}
