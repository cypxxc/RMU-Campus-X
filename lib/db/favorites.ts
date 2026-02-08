/**
 * Favorites – ใช้ API เป็นหลัก (auth ฝั่ง server)
 */

import { authFetchJson } from "@/lib/api-client"
import { getItemById } from "@/lib/db/items"
import type { Item } from "@/types"
import { getItemPrimaryImageUrl } from "@/lib/cloudinary-url"

export interface FavoriteItem {
  id: string
  userId: string
  itemId: string
  itemTitle: string
  itemImage?: string
  createdAt: unknown
}

export const checkIsFavorite = async (_userId: string, itemId: string): Promise<boolean> => {
  try {
    const j = await authFetchJson<{ isFavorite?: boolean }>(`/api/favorites/check?itemId=${encodeURIComponent(itemId)}`, { method: "GET" })
    return j.data?.isFavorite === true
  } catch {
    return false
  }
}

export const toggleFavorite = async (userId: string, item: Item): Promise<boolean> => {
  try {
    const isFav = await checkIsFavorite(userId, item.id)
    if (isFav) {
      await authFetchJson(`/api/favorites/${encodeURIComponent(item.id)}`, { method: "DELETE" })
      return false
    }
    await authFetchJson("/api/favorites", {
      method: "POST",
      body: {
        itemId: item.id,
        itemTitle: item.title,
        itemImage: getItemPrimaryImageUrl(item) || undefined,
      },
    })
    return true
  } catch {
    throw new Error("ไม่สามารถเปลี่ยนสถานะรายการโปรดได้")
  }
}

export const getFavoriteItems = async (_userId: string): Promise<Item[]> => {
  try {
    const j = await authFetchJson<{ favorites?: FavoriteItem[] }>("/api/favorites", { method: "GET" })
    const list = j.data?.favorites ?? []
    if (list.length === 0) return []
    const results = await Promise.all(list.map((fav) => getItemById(fav.itemId)))
    const items = results.map((r) => r.data).filter((item): item is Item => item != null)
    return items
  } catch {
    return []
  }
}
