export interface ItemDeletionContext {
  itemId: string
  requesterId: string
}

export interface ItemDeletionDeps {
  getItemById: (id: string) => Promise<Record<string, unknown> | null>
  hasActiveExchanges: (itemId: string) => Promise<boolean>
  deleteItem: (id: string) => Promise<void>
  deleteCloudinaryResources: (publicIds: string[]) => Promise<void>
}
