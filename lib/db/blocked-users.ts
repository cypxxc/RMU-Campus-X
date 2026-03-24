import { authFetchJson } from "@/lib/api-client"

class BlockedUsersApi {
  async blockUser(targetUserId: string): Promise<void> {
    await authFetchJson("/api/users/me/block", {
      method: "POST",
      body: { targetUserId },
    })
  }

  async unblockUser(targetUserId: string): Promise<void> {
    await authFetchJson(`/api/users/me/block/${encodeURIComponent(targetUserId)}`, {
      method: "DELETE",
    })
  }

  async getBlockedUserIds(): Promise<string[]> {
    const j = await authFetchJson<{ user?: { blockedUserIds?: string[] } }>("/api/users/me", {
      method: "GET",
      cache: "no-store",
    })
    const ids = j.data?.user?.blockedUserIds
    return Array.isArray(ids) ? ids : []
  }
}

const blockedUsersApi = new BlockedUsersApi()

export async function blockUser(targetUserId: string): Promise<void> {
  await blockedUsersApi.blockUser(targetUserId)
}

export async function unblockUser(targetUserId: string): Promise<void> {
  await blockedUsersApi.unblockUser(targetUserId)
}

export async function getBlockedUserIds(): Promise<string[]> {
  return blockedUsersApi.getBlockedUserIds()
}
