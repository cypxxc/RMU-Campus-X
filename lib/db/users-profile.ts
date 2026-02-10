import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { User } from "@/types"
import { authFetchJson } from "@/lib/api-client"

const isClient = typeof window !== "undefined"
const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false

// ============ User Profile Management ============

/** Allowed fields for profile update (email cannot be changed via this – use Auth). */
export const updateUserProfile = async (
  userId: string,
  data: Partial<{ displayName: string, photoURL: string, bio: string }>
) => {
  if (isClient) {
    await authFetchJson("/api/users/me", { method: "PATCH", body: data })
    return
  }
  const db = getFirebaseDb()
  const userRef = doc(db, "users", userId)
  const dataObj = data as Partial<{ displayName: string; photoURL: string; email: string; bio: string }>
  const safe = Object.fromEntries(
    Object.entries(dataObj).filter(([k]) => k !== "email")
  ) as Omit<typeof dataObj, "email">
  const cleanData = Object.fromEntries(
    Object.entries(safe).filter(([_, value]) => value !== undefined)
  )
  await setDoc(
    userRef,
    { ...cleanData, uid: userId, updatedAt: serverTimestamp() },
    { merge: true }
  )
}

/** Mark user as having accepted terms & privacy. Call after consent page submit. */
export const acceptTerms = async (userId: string) => {
  if (isClient) {
    await authFetchJson("/api/users/me/accept-terms", { method: "POST" })
    return
  }
  const db = getFirebaseDb()
  const userRef = doc(db, "users", userId)
  await updateDoc(userRef, {
    termsAccepted: true,
    termsAcceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export const getUserProfile = async (userId: string): Promise<User | null> => {
  if (isClient) {
    try {
      if (isOffline()) return null
      const { getAuth } = await import("firebase/auth")
      const auth = getAuth()
      const me = auth.currentUser?.uid
      if (me === userId) {
        const j = await authFetchJson<{ user?: Record<string, unknown> }>("/api/users/me", {
          method: "GET",
          cache: "no-store",
        })
        const u = j.data?.user
        return u ? { ...u, uid: (u.id as string) || userId } as User : null
      }
      const res = await fetch(`/api/users/${userId}`)
      const j = await res.json().catch(() => ({}))
      const u = j.user
      return u ? { ...u, uid: u.uid || userId } as User : null
    } catch {
      return null
    }
  }
  const db = getFirebaseDb()
  const userRef = doc(db, "users", userId)
  const docSnap = await getDoc(userRef)
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as unknown as User
  }
  return null
}

export const getUserPublicProfile = async (userId: string) => {
  if (isClient) {
    try {
      if (isOffline()) return null
      const res = await fetch(`/api/users/${userId}`)
      const j = await res.json().catch(() => ({}))
      const u = j.user
      return u ? { uid: u.uid, displayName: u.displayName, bio: u.bio, photoURL: u.photoURL, status: u.status, rating: u.rating } : null
    } catch {
      return null
    }
  }
  const db = getFirebaseDb()
  const userRef = doc(db, "users", userId)
  const docSnap = await getDoc(userRef)
  if (docSnap.exists()) {
    const data = docSnap.data() as User
    return {
      uid: data.uid,
      displayName: data.displayName,
      bio: data.bio,
      photoURL: data.photoURL,
      createdAt: data.createdAt,
      status: data.status,
      rating: data.rating,
    }
  }
  return null
}
