import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
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

export const loginUser = async (email: string, password: string) => {
  const auth = getFirebaseAuth()
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
