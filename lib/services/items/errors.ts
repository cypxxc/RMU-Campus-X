export type ItemDeletionErrorCode = "NOT_FOUND" | "FORBIDDEN" | "CONFLICT"

export class ItemDeletionError extends Error {
  readonly code: ItemDeletionErrorCode
  readonly status: number

  constructor(message: string, code: ItemDeletionErrorCode, status: number) {
    super(message)
    this.name = "ItemDeletionError"
    this.code = code
    this.status = status
  }
}

export function isItemDeletionError(error: unknown): error is ItemDeletionError {
  return error instanceof ItemDeletionError
}
