import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { User } from "@/types"

// ============ User Profile Management ============

export const updateUserProfile = async (
  userId: string,
  data: Partial<{ displayName: string, photoURL: string, email: string, bio: string }>
) => {
  const db = getFirebaseDb()
  const userRef = doc(db, "users", userId)

  // Clean undefined values to prevent Firestore error
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  )

  await setDoc(
    userRef,
    {
      ...cleanData,
      uid: userId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export const getUserProfile = async (userId: string) => {
  const db = getFirebaseDb()
  const userRef = doc(db, "users", userId)
  const docSnap = await getDoc(userRef)

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as any as User
  }
  return null
}

export const getUserPublicProfile = async (userId: string) => {
  const db = getFirebaseDb()
  const userRef = doc(db, "users", userId)
  const docSnap = await getDoc(userRef)

  if (docSnap.exists()) {
    const data = docSnap.data() as User
    // Return only public fields
    return {
      uid: data.uid,
      displayName: data.displayName,
      bio: data.bio,
      photoURL: data.photoURL,
      createdAt: data.createdAt,
      status: data.status,
      rating: data.rating,
      // Add other safe fields if needed
    }
  }
  return null
}
