import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  applyActionCode,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  sendPasswordResetEmail,
  updatePassword,
  deleteUser,
  type User,
} from "firebase/auth"
import type { ActionCodeSettings } from "firebase/auth"

/** ลิงก์ยืนยันอีเมลของ Firebase ใช้ได้ 3 วัน (ค่าเริ่มต้นของ Firebase ไม่สามารถปรับใน SDK ได้) */
export const EMAIL_VERIFICATION_LINK_EXPIRY_DAYS = 3
import { doc, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore"
import { getFirebaseAuth, getFirebaseDb } from "./firebase"

import { registrationSchema } from "./schemas"

import { z } from "zod"

function getVerificationContinueUrl(): string {
  if (typeof window !== "undefined") return `${window.location.origin}/verify-email`
  return `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/verify-email`
}

function getEmailVerificationActionCodeSettings(): ActionCodeSettings {
  return { url: getVerificationContinueUrl(), handleCodeInApp: false }
}

/** รองรับทั้งอีเมลนักศึกษา (รหัส 12 หลัก) และอาจารย์/บุคลากร (ตัวอักษร) @rmu.ac.th */
const RMU_EMAIL_REGEX = /^[a-zA-Z0-9._+-]{1,64}@rmu\.ac\.th$/i

export const validateRMUEmail = (email: string): boolean => {
  const emailSchema = z.string().regex(RMU_EMAIL_REGEX)
  const result = emailSchema.safeParse(email.trim().toLowerCase())
  return result.success
}

export const registerUser = async (rawEmail: string, password: string) => {
  // Normalize email
  const email = rawEmail.trim().toLowerCase()

  // 1. Strict Validation using Zod
  const validation = registrationSchema.safeParse({ email, password, confirmPassword: password })
  if (!validation.success) {
    const errorMessage = validation.error.errors[0]?.message || "ข้อมูลไม่ถูกต้อง"
    throw new Error(errorMessage)
  }

  const auth = getFirebaseAuth()
  let userCredential

  try {
    // 2. Create Auth User
    userCredential = await createUserWithEmailAndPassword(auth, email, password)
  } catch (authError: unknown) {
    // Expected errors (e.g. email-already-in-use) are handled by the register page; avoid noisy console
    const code = (authError as { code?: string })?.code
    if (code !== "auth/email-already-in-use" && code !== "auth/invalid-email" && code !== "auth/weak-password") {
      console.error("[Register] Auth Error:", authError)
    }
    throw authError
  }

  // 3. Atomic Profile Creation
  try {
    const db = getFirebaseDb()
    const userDocRef = doc(db, "users", userCredential.user.uid)

    // Run independent operations in parallel to reduce register latency.
    // NOTE: If sendEmailVerification succeeds but setDoc fails, the rollback
    // deletes the auth user but the verification email was already sent.
    // This is acceptable — the email link will simply be invalid.
    await Promise.all([
      sendEmailVerification(userCredential.user, getEmailVerificationActionCodeSettings()),
      setDoc(userDocRef, {
      uid: userCredential.user.uid,
      email: email,
      displayName: email.split("@")[0], // Use email prefix as default name
      status: "ACTIVE",
      warningCount: 0,
      suspensionCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      restrictions: {
        canPost: true,
        canExchange: true,
        canChat: true,
      },
      }),
    ])

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
    // Best-effort cleanup for user doc when partial success happened during parallel operations.
    try {
      const db = getFirebaseDb()
      await deleteDoc(doc(db, "users", userCredential.user.uid))
    } catch {
      // ignore cleanup failure
    }

    const errorMessage = firestoreError instanceof Error ? firestoreError.message : String(firestoreError)
    throw new Error(`ระบบไม่สามารถสร้างข้อมูลผู้ใช้ได้: ${errorMessage} (กรุณาลองใหม่อีกครั้ง)`)
  }
}

/** ล้าง auth ที่ Firebase เก็บใน localStorage + IndexedDB (เมื่อไม่ติ๊กจดจำฉัน ให้เหลือแค่ sessionStorage — ปิดแท็บแล้วออกจริง) */
function clearPersistentAuthStorage() {
  if (typeof window === "undefined") return
  try {
    // 1) localStorage — Firebase ใช้ key ขึ้นต้น firebase:authUser:
    if (window.localStorage) {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("firebase:authUser:")) keysToRemove.push(key)
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k))
    }
    // 2) IndexedDB — Firebase ใช้ firebaseLocalStorageDb สำหรับ LOCAL persistence
    if (window.indexedDB && indexedDB.deleteDatabase) {
      indexedDB.deleteDatabase("firebaseLocalStorageDb")
    }
  } catch {
    // ignore
  }
}

export const loginUser = async (email: string, password: string, remember: boolean = false) => {
  const auth = getFirebaseAuth()

  // Set persistence based on remember me preference
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)

  const userCredential = await signInWithEmailAndPassword(auth, email, password)

  // เมื่อไม่ติ๊กจดจำฉัน ล้าง localStorage + IndexedDB ของ Firebase ให้เหลือแค่ sessionStorage (ปิดแท็บแล้วออกจริง)
  if (!remember) clearPersistentAuthStorage()

  // 1. Verify Email
  if (!userCredential.user.emailVerified) {
    await firebaseSignOut(auth) // Force sign out if not verified
    throw new Error("กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ (Please verify your email)")
  }
  // Profile/status policy checks are handled by /api/users/me in AuthProvider.

  return userCredential.user
}

export const signOut = async () => {
  const auth = getFirebaseAuth()
  await firebaseSignOut(auth)
}

export const resendVerificationEmail = async (user: User) => {
  await sendEmailVerification(user, getEmailVerificationActionCodeSettings())
}

/** ใช้เมื่อผู้ใช้กดลิงก์ยืนยันอีเมล (จาก query oobCode) — ยืนยันอีเมลอัตโนมัติ */
export const applyEmailVerificationCode = async (oobCode: string): Promise<void> => {
  const auth = getFirebaseAuth()
  await applyActionCode(auth, oobCode)
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
