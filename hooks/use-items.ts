"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { getItems, type GetItemsResult } from "@/lib/firestore"
import type { ItemCategory, ItemStatus } from "@/types"

const PAGE_SIZE = 12
const STALE_TIME_MS = 30_000
const REFETCH_ON_WINDOW_FOCUS = true

export interface UseItemsOptions {
  categories?: ItemCategory[]
  status?: ItemStatus | "all"
  searchQuery?: string
  postedBy?: string
  pageSize?: number
  enabled?: boolean
}

export function useItems(options: UseItemsOptions) {
  const {
    categories = [],
    status = "available",
    searchQuery = "",
    postedBy,
    pageSize = PAGE_SIZE,
    enabled = true,
  } = options

  const [currentPage, setCurrentPage] = useState(1)
  const lastIdsRef = useRef<Map<number, string | null>>(new Map([[1, null]]))

  // รีเซ็ตเป็นหน้า 1 เมื่อตัวกรองเปลี่ยน
  useEffect(() => {
    setCurrentPage(1)
    lastIdsRef.current = new Map([[1, null]])
  }, [categories, status, searchQuery.trim(), postedBy])

  const query = useQuery({
    queryKey: ["items", categories, status, searchQuery.trim(), postedBy, currentPage] as const,
    queryFn: async (): Promise<GetItemsResult & { page: number }> => {
      const lastId = currentPage === 1 ? null : lastIdsRef.current.get(currentPage) ?? undefined
      const result = await getItems({
        pageSize,
        lastId: lastId ?? undefined,
        categories: categories.length > 0 ? categories : undefined,
        status: status !== "all" ? status : undefined,
        searchQuery: searchQuery.trim() || undefined,
        postedBy,
      })
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to load items")
      }
      return { ...result.data, page: currentPage }
    },
    enabled,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: REFETCH_ON_WINDOW_FOCUS,
    refetchInterval: 25_000, // poll ทุก 25 วินาทีเมื่อแท็บเปิดอยู่
    refetchIntervalInBackground: false,
  })

  const data = query.data
  const items = data?.items ?? []
  const hasMore = data?.hasMore ?? false
  const totalCount = data?.totalCount ?? 0

  useEffect(() => {
    if (data?.lastId != null && data?.hasMore) {
      lastIdsRef.current.set(currentPage + 1, data.lastId)
    }
  }, [data?.lastId, data?.hasMore, currentPage])

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : (hasMore ? currentPage + 1 : currentPage)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const resetToPageOne = () => {
    setCurrentPage(1)
    lastIdsRef.current = new Map([[1, null]])
  }

  return {
    items,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    currentPage,
    totalPages,
    totalCount,
    hasMore,
    goToPage,
    resetToPageOne,
  }
}
