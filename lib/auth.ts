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

import { registrationSchema } from "./schemas"

import { z } from "zod"

export const validateRMUEmail = (email: string): boolean => {
  const emailSchema = z.string().regex(/^\d{12}@rmu\.ac\.th$/)
  const result = emailSchema.safeParse(email)
  return result.success
}

export const registerUser = async (rawEmail: string, password: string) => {
  // Normalize email
  const email = rawEmail.trim().toLowerCase();

  // 1. Strict Validation using Zod
  const validation = registrationSchema.safeParse({ email, password, confirmPassword: password })
  if (!validation.success) {
    const errorMessage = validation.error.errors[0]?.message || "ข้อมูลไม่ถูกต้อง"
    throw new Error(errorMessage)
  }

  const auth = getFirebaseAuth()
  let userCredential;

  try {
    // 2. Create Auth User
    userCredential = await createUserWithEmailAndPassword(auth, email, password)
    console.log("[Register] User Created:", userCredential.user.uid, userCredential.user.email);
  } catch (authError: any) {
    console.error("[Register] Auth Error:", authError)
    throw authError // Let the caller handle auth errors (e.g. email in use)
  }

  // 3. Atomic Profile Creation
  try {
    await sendEmailVerification(userCredential.user)

    // Verify Auth State before Write
    const currentUser = auth.currentUser;
    console.log("[Register] Current Auth User before DB Write:", currentUser?.uid);
    
    if (!currentUser) throw new Error("Auth state lost before DB write");

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

  } catch (firestoreError) {
    console.error("[Register] Profile Creation Failed - Rolling back...", firestoreError)
    
    // 4. ROLLBACK: Delete the Auth user to prevent Ghost Account
    try {
      await deleteUser(userCredential.user)
      console.log("[Register] Rollback successful: Auth user deleted")
    } catch (deleteError) {
      // Critical: If rollback fails, we have a major issue (Ghost Account).
      // Ideally, we'd report this to a monitoring service.
      console.error("[Register] CRITICAL: Rollback failed!", deleteError)
    }

    throw new Error("ระบบไม่สามารถสร้างข้อมูลผู้ใช้ได้ (กรุณาลองใหม่อีกครั้ง)")
  }
}

export const loginUser = async (email: string, password: string, remember: boolean = false) => {
  const auth = getFirebaseAuth()
  
  // Set persistence based on remember me preference
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
  
  const userCredential = await signInWithEmailAndPassword(auth, email, password)

  // 1. Verify Email
    if (!userCredential.user.emailVerified) {
      await firebaseSignOut(auth) // Force sign out if not verified
      throw new Error("กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ (Please verify your email)")
    }

    // 2. Strict Profile & Status Check (Firestore)
    const db = getFirebaseDb()
    const { getDoc, doc } = await import("firebase/firestore")
    const userDocRef = doc(db, "users", userCredential.user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      // 3. Ghost Account Detection
      // User exists in Auth but not in Firestore. Strict Rule: Block Access.
      // Auto-cleanup could be risky here without admin consent, safer to just block.
      await firebaseSignOut(auth)
      throw new Error("บัญชีของคุณไม่สมบูรณ์ หรือถูกลบ (Ghost Account) - กรุณาติดต่อผู้ดูแลระบบ")
    }

    const userData = userDoc.data()
    
    // 4. Status Check
    if (userData?.status === 'BANNED') {
       await firebaseSignOut(auth)
       throw new Error("บัญชีของคุณถูกระงับการใช้งาน (BANNED) - กรุณาติดต่อผู้ดูแลระบบ")
    }
    
    // (Optional) Update last login timestamp here if needed
    
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

// user param is kept for signature compatibility but not used directly here
export const deleteUserAccount = async (_user: User) => {
  const auth = getFirebaseAuth()
  const token = await auth.currentUser?.getIdToken()
  
  if (!token) throw new Error("Authentication required")

  const response = await fetch('/api/users/me/delete', {
      method: 'DELETE',
      headers: {
          'Authorization': `Bearer ${token}`
      }
  })

  if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to delete account")
  }
  
  // Sign out locally
  await firebaseSignOut(auth)
}
