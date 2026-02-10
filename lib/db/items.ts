/**
 * Items – ใช้ API เป็นหลัก (auth, terms, canPost ฝั่ง server)
 */

import type { Item, ItemCategory, ItemStatus } from "@/types"
import { apiCall, TIMEOUT_CONFIG, type ApiResponse } from "@/lib/api-wrapper"
import { authFetchJson } from "@/lib/api-client"

export interface GetItemsFilters {
  categories?: ItemCategory[]
  status?: ItemStatus
  pageSize?: number
  lastId?: string | null
  searchQuery?: string
  postedBy?: string
  includeFavoriteStatus?: boolean
}

export interface GetItemsResult {
  items: Item[]
  lastId: string | null
  hasMore: boolean
  totalCount: number
}

export const createItem = async (
  itemData: Omit<Item, "id" | "postedAt" | "updatedAt">
): Promise<ApiResponse<string>> => {
  return apiCall(
    async () => {
      const json = await authFetchJson<{ id: string }>("/api/items", {
        method: "POST",
        body: {
          title: itemData.title,
          description: itemData.description,
          category: itemData.category,
          location: itemData.location ?? "",
          locationDetail: itemData.locationDetail,
          imagePublicIds: itemData.imagePublicIds,
          imageUrls: itemData.imageUrls,
        },
      })
      if (!json.success || !json.data?.id) throw new Error(json.error || "Failed to create item")
      return json.data.id
    },
    "createItem",
    TIMEOUT_CONFIG.STANDARD
  )
}

export const getItems = async (
  filters?: GetItemsFilters
): Promise<ApiResponse<GetItemsResult>> => {
  return apiCall(
    async () => {
      const params = new URLSearchParams()
      if (filters?.pageSize) params.set("pageSize", String(filters.pageSize))
      if (filters?.lastId) params.set("lastId", filters.lastId)
      if (filters?.categories?.length) params.set("categories", filters.categories.join(","))
      if (filters?.status) params.set("status", filters.status)
      if (filters?.searchQuery) params.set("search", filters.searchQuery)
      if (filters?.postedBy) params.set("postedBy", filters.postedBy)
      if (filters?.includeFavoriteStatus === false) params.set("includeFavoriteStatus", "false")

      const url = `/api/items?${params.toString()}`
      const res = await authFetchJson(url, { method: "GET" }) as {
        success?: boolean
        items?: Item[]
        lastId?: string | null
        hasMore?: boolean
        totalCount?: number
      }
      if (!Array.isArray(res.items)) throw new Error("Failed to load items")

      return {
        items: res.items,
        lastId: res.lastId ?? null,
        hasMore: res.hasMore ?? false,
        totalCount: res.totalCount ?? 0,
      }
    },
    "getItems",
    TIMEOUT_CONFIG.STANDARD
  )
}

export const getItemById = async (id: string): Promise<ApiResponse<Item | null>> => {
  const timeoutMs =
    process.env.NODE_ENV === "development"
      ? TIMEOUT_CONFIG.HEAVY
      : TIMEOUT_CONFIG.STANDARD

  return apiCall(
    async () => {
      try {
        const res = await authFetchJson(`/api/items/${id}`, { method: "GET" }) as { success?: boolean; item?: Item }
        return res.item ?? null
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes("not found") || msg.includes("404")) return null
        throw e
      }
    },
    "getItemById",
    timeoutMs
  )
}

export const updateItem = async (
  id: string,
  data: Partial<Pick<Item, "title" | "description" | "category" | "location" | "locationDetail" | "status" | "imagePublicIds" | "imageUrls">>
): Promise<ApiResponse<void>> => {
  return apiCall(
    async () => {
      const body: Record<string, unknown> = {}
      if (data.title !== undefined) body.title = data.title
      if (data.description !== undefined) body.description = data.description
      if (data.category !== undefined) body.category = data.category
      if (data.location !== undefined) body.location = data.location
      if (data.locationDetail !== undefined) body.locationDetail = data.locationDetail
      if (data.status !== undefined) body.status = data.status
      if (data.imagePublicIds !== undefined) body.imagePublicIds = data.imagePublicIds
      if (data.imageUrls !== undefined) body.imageUrls = data.imageUrls

      const json = await authFetchJson(`/api/items/${id}`, {
        method: "PATCH",
        body: Object.keys(body).length ? body : undefined,
      })
      if (!json.success) throw new Error(json.error || "Failed to update item")
    },
    "updateItem",
    TIMEOUT_CONFIG.STANDARD
  )
}

export const deleteItem = async (id: string): Promise<ApiResponse<void>> => {
  return apiCall(
    async () => {
      const { authFetch } = await import("@/lib/api-client")
      const res = await authFetch(`/api/items/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to delete item")
      }
    },
    "deleteItem",
    TIMEOUT_CONFIG.STANDARD
  )
}
