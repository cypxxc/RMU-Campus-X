import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { getFirebaseDb } from "@/lib/firebase"
import type { UserStatus, UserWarning } from "@/types"

// Get user warnings
export const getUserWarnings = async (userId: string) => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "userWarnings"),
    where("userId", "==", userId),
    orderBy("issuedAt", "desc")
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UserWarning)
}

// Get all warnings (admin)
export const getAllWarnings = async () => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "userWarnings"),
    orderBy("issuedAt", "desc"),
    limit(100)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UserWarning)
}

export interface DeleteUserWarningResult {
  success: boolean
  warningCount: number
  userStatus?: UserStatus
}

export const deleteUserWarningByAdmin = async (
  userId: string,
  warningId: string,
  reason?: string
): Promise<DeleteUserWarningResult> => {
  const auth = getAuth()
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
  if (!token) throw new Error("Unauthorized: Login required")

  const response = await fetch(`/api/admin/users/${userId}/warnings/${warningId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || "Failed to delete warning")
  }

  return {
    success: true,
    warningCount: Number(payload.warningCount) || 0,
    userStatus: payload.userStatus as UserStatus | undefined,
  }
}
