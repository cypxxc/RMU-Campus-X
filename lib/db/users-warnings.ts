import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { UserWarning } from "@/types"

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
