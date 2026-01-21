import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { createNotification } from "./notifications"

export interface AutoUnsuspendNotification {
  title: string
  message: string
}

/**
 * Check if a user's suspension has expired and auto-unsuspend them
 */
export const checkAndAutoUnsuspend = async (
  userId: string,
  existingUserData: any | undefined,
  notification: AutoUnsuspendNotification
): Promise<boolean> => {
  const db = getFirebaseDb()
  const userRef = doc(db, "users", userId)

  try {
    let userData = existingUserData

    if (!userData) {
      const userDoc = await getDoc(userRef)
      if (!userDoc.exists()) return false
      userData = userDoc.data()
    }

    // Only process SUSPENDED users
    if (userData.status !== "SUSPENDED") return false

    // Check if suspendedUntil exists and has expired
    const suspendedUntil = userData.suspendedUntil?.toDate?.()
    if (!suspendedUntil) return false

    const now = new Date()
    if (now >= suspendedUntil) {
      // Suspension has expired - auto unsuspend
      await updateDoc(userRef, {
        status: "ACTIVE",
        updatedAt: serverTimestamp(),
      })

      // Notify user about auto-unsuspend
      await createNotification({
        userId,
        title: notification.title,
        message: notification.message,
        type: "system",
        relatedId: userId,
      })

      console.log(`[AutoUnsuspend] User ${userId} has been auto-unsuspended`)
      return true
    }

    return false
  } catch (error) {
    console.error("[AutoUnsuspend] Error checking suspension:", error)
    return false
  }
}
