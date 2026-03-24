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

/** รองรับทั้งอีเมลนักศึกษา (รหัส 12 หลัก) และอาจารย์ (ตัวอักษร) @rmu.ac.th */
const RMU_EMAIL_REGEX = /^[a-zA-Z0-9._+-]{1,64}@rmu\.ac\.th$/i

class AuthService {
  validateRMUEmail(email: string): boolean {
    const emailSchema = z.string().regex(RMU_EMAIL_REGEX)
    const result = emailSchema.safeParse(email.trim().toLowerCase())
    return result.success
  }

  async registerUser(rawEmail: string, password: string) {
    const email = rawEmail.trim().toLowerCase()
    const validation = registrationSchema.safeParse({ email, password, confirmPassword: password })
    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || "ข้อมูลไม่ถูกต้อง"
      throw new Error(errorMessage)
    }

    const auth = getFirebaseAuth()
    let userCredential

    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password)
    } catch (authError: unknown) {
      const code = (authError as { code?: string })?.code
      if (code !== "auth/email-already-in-use" && code !== "auth/invalid-email" && code !== "auth/weak-password") {
        console.error("[Register] Auth Error:", authError)
      }
      throw authError
    }

    try {
      const db = getFirebaseDb()
      const userDocRef = doc(db, "users", userCredential.user.uid)

      await Promise.all([
        sendEmailVerification(userCredential.user, getEmailVerificationActionCodeSettings()),
        setDoc(userDocRef, {
          uid: userCredential.user.uid,
          email: email,
          displayName: email.split("@")[0],
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

      try {
        await deleteUser(userCredential.user)
        console.log("[Register] Rollback successful: Auth user deleted")
      } catch (deleteError) {
        console.error("[Register] CRITICAL: Rollback failed!", deleteError)
      }
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

  clearPersistentAuthStorage() {
    if (typeof window === "undefined") return
    try {
      if (window.localStorage) {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("firebase:authUser:")) keysToRemove.push(key)
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k))
      }
      if (window.indexedDB && indexedDB.deleteDatabase) {
        indexedDB.deleteDatabase("firebaseLocalStorageDb")
      }
    } catch {
      // ignore
    }
  }

  async loginUser(email: string, password: string, remember: boolean = false) {
    const auth = getFirebaseAuth()
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
    const userCredential = await signInWithEmailAndPassword(auth, email, password)

    if (!remember) this.clearPersistentAuthStorage()

    if (!userCredential.user.emailVerified) {
      await firebaseSignOut(auth)
      throw new Error("กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ (Please verify your email)")
    }
    return userCredential.user
  }

  async signOut() {
    const auth = getFirebaseAuth()
    await firebaseSignOut(auth)
  }

  async resendVerificationEmail(user: User) {
    await sendEmailVerification(user, getEmailVerificationActionCodeSettings())
  }

  async applyEmailVerificationCode(oobCode: string): Promise<void> {
    const auth = getFirebaseAuth()
    await applyActionCode(auth, oobCode)
  }

  async resetPassword(email: string) {
    const auth = getFirebaseAuth()
    await sendPasswordResetEmail(auth, email)
  }

  async updateUserPassword(user: User, newPassword: string) {
    await updatePassword(user, newPassword)
  }

  async deleteUserAccount(_user: User) {
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

    await firebaseSignOut(auth)
  }
}

const authService = new AuthService()

export const validateRMUEmail = (email: string): boolean => {
  return authService.validateRMUEmail(email)
}

export const registerUser = async (rawEmail: string, password: string) => {
  return authService.registerUser(rawEmail, password)
}

export const loginUser = async (email: string, password: string, remember: boolean = false) => {
  return authService.loginUser(email, password, remember)
}

export const signOut = async () => {
  return authService.signOut()
}

export const resendVerificationEmail = async (user: User) => {
  return authService.resendVerificationEmail(user)
}

/** ใช้เมื่อผู้ใช้กดลิงก์ยืนยันอีเมล (จาก query oobCode) — ยืนยันอีเมลอัตโนมัติ */
export const applyEmailVerificationCode = async (oobCode: string): Promise<void> => {
  return authService.applyEmailVerificationCode(oobCode)
}

export const resetPassword = async (email: string) => {
  return authService.resetPassword(email)
}

export const updateUserPassword = async (user: User, newPassword: string) => {
  return authService.updateUserPassword(user, newPassword)
}

// user param is kept for signature compatibility but not used directly here
export const deleteUserAccount = async (_user: User) => {
  return authService.deleteUserAccount(_user)
}
