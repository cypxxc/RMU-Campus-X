import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  sendPasswordResetEmail,
  updatePassword,
  deleteUser,
  type User,
} from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { getFirebaseAuth, getFirebaseDb } from "./firebase"

export const validateRMUEmail = (email: string): boolean => {
  // Must be exactly 12 digits followed by @rmu.ac.th
  const regex = /^\d{12}@rmu\.ac\.th$/
  return regex.test(email)
}

export const registerUser = async (email: string, password: string) => {
  if (!validateRMUEmail(email)) {
    throw new Error("Only @rmu.ac.th email addresses are allowed")
  }

  const auth = getFirebaseAuth()
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  await sendEmailVerification(userCredential.user)

  // Create user document in Firestore
  const db = getFirebaseDb()
  await setDoc(doc(db, "users", userCredential.user.uid), {
    uid: userCredential.user.uid,
    email: email,
    displayName: email.split("@")[0], // Use email prefix as default name
    status: "ACTIVE",
    warningCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    restrictions: {
      canPost: true,
      canExchange: true,
      canChat: true,
    },
  })

  return userCredential.user
}

export const loginUser = async (email: string, password: string, remember: boolean = false) => {
  const auth = getFirebaseAuth()
  
  // Set persistence based on remember me preference
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
  
  const userCredential = await signInWithEmailAndPassword(auth, email, password)

  if (!userCredential.user.emailVerified) {
    throw new Error("Please verify your email before logging in")
  }

  return userCredential.user
}

export const signOut = async () => {
  const auth = getFirebaseAuth()
  await firebaseSignOut(auth)
}

export const resendVerificationEmail = async (user: User) => {
  await sendEmailVerification(user)
}

export const resetPassword = async (email: string) => {
  const auth = getFirebaseAuth()
  await sendPasswordResetEmail(auth, email)
}

export const updateUserPassword = async (user: User, newPassword: string) => {
  await updatePassword(user, newPassword)
}

export const deleteUserAccount = async (user: User) => {
  // 1. Delete Firestore Data
  const { getFirebaseDb } = await import("./firebase")
  const { doc, deleteDoc } = await import("firebase/firestore")
  const db = getFirebaseDb()
  
  // Delete user document
  await deleteDoc(doc(db, "users", user.uid))
  
  // Note: We might want to keep or archive items/exchanges, 
  // or use a Cloud Function to clean them up recursively.
  // For now, we just delete the user record.

  // 2. Delete Auth User
  await deleteUser(user)
}
