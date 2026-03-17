import { authFetchJson } from "@/lib/api-client"

export async function blockUser(targetUserId: string): Promise<void> {
  await authFetchJson("/api/users/me/block", {
    method: "POST",
    body: { targetUserId },
  })
}

export async function unblockUser(targetUserId: string): Promise<void> {
  await authFetchJson(`/api/users/me/block/${encodeURIComponent(targetUserId)}`, {
    method: "DELETE",
  })
}

export async function getBlockedUserIds(): Promise<string[]> {
  const j = await authFetchJson<{ user?: { blockedUserIds?: string[] } }>("/api/users/me", {
    method: "GET",
    cache: "no-store",
  })
  const ids = j.data?.user?.blockedUserIds
  return Array.isArray(ids) ? ids : []
}
