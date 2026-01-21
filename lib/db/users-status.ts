import { getAuth } from "firebase/auth"
import { notifyUserStatusChange, notifyUserWarning } from "@/lib/services/client-line-service"

import type { UserStatus } from "@/types"

// ============ User Status & Warning Management ============

// Refactored to use API Routes (Bypassing Rules via Admin SDK)
export const updateUserStatus = async (
  userId: string,
  status: UserStatus,
  _adminId: string, // Kept for interface compatibility
  _adminEmail: string, // Kept for interface compatibility
  reason?: string,
  suspendDays?: number,
  suspendMinutes?: number
) => {
  const auth = getAuth()
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null

  if (!token) throw new Error("Unauthorized: Login required")

  const response = await fetch(`/api/admin/users/${userId}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      status,
      reason,
      suspendDays,
      suspendMinutes,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to update user status")
  }

  const result = await response.json()

  // Trigger LINE Notification (Client-side trigger for now)
  // Note: ideally this should be server-side too, but keeping parity.
  notifyUserStatusChange(userId, status, reason, result.suspendedUntil)
    .catch(err => console.error("Failed to send LINE notification:", err))

  return result
}

// Issue warning - Admin approval required
export const issueWarning = async (
  userId: string,
  _userEmail: string, // Unused in API but kept for signature
  reason: string,
  _adminId: string,
  _adminEmail: string,
  relatedReportId?: string,
  relatedItemId?: string
) => {
  const auth = getAuth()
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null

  if (!token) throw new Error("Unauthorized: Login required")

  const response = await fetch(`/api/admin/users/${userId}/warning`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      reason,
      relatedReportId,
      relatedItemId,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to issue warning")
  }

  const result = await response.json()

  // Send LINE notification
  notifyUserWarning(userId, reason, result.warningCount)
    .catch(err => console.error("Failed to send LINE warning:", err))

  return result
}

export const deleteUserAndData = async (userId: string) => {
  console.log("[deleteUserAndData] Requesting hard delete for:", userId)

  const auth = getAuth()
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null

  if (!token) throw new Error("Unauthorized: Login required for admin action")

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BASE_URL || "https://rmu-app-3-1-2569-wwn2.vercel.app"

  try {
    const response = await fetch(`${baseUrl}/api/admin/users/${userId}/delete`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to delete user")
    }

    const result = await response.json()
    console.log("[deleteUserAndData] Success:", result)
    return result

  } catch (error) {
    console.error("[deleteUserAndData] Error:", error)
    throw error
  }
}

// ============ Auto-Unsuspend System ============ (delegated to separate module)
