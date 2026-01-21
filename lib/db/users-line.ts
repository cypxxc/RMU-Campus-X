import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { User } from "@/types"

export const getUserLineSettings = async (userId: string) => {
  const db = getFirebaseDb()
  const userRef = doc(db, "users", userId)
  const userDoc = await getDoc(userRef)

  if (!userDoc.exists()) {
    return null
  }

  const userData = userDoc.data() as User
  return {
    lineUserId: userData.lineUserId,
    enabled: userData.lineNotifications?.enabled ?? false,
    settings: userData.lineNotifications,
  }
}

export const updateUserLineSettings = async (
  userId: string,
  settings: User["lineNotifications"]
) => {
  const db = getFirebaseDb()
  await updateDoc(doc(db, "users", userId), {
    lineNotifications: settings,
    updatedAt: serverTimestamp(),
  })
}

export const linkLineAccount = async (
  userId: string,
  lineUserId: string
) => {
  const db = getFirebaseDb()
  await updateDoc(doc(db, "users", userId), {
    lineUserId,
    lineNotifications: {
      enabled: true,
      exchangeRequest: true,
      exchangeStatus: true,
      exchangeComplete: true,
    },
    updatedAt: serverTimestamp(),
  })
}

export const unlinkLineAccount = async (userId: string) => {
  const db = getFirebaseDb()
  await updateDoc(doc(db, "users", userId), {
    lineUserId: null,
    lineNotifications: {
      enabled: false,
      exchangeRequest: false,
      exchangeStatus: false,
      exchangeComplete: false,
    },
    updatedAt: serverTimestamp(),
  })
}
