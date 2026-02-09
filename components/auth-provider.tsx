"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react"
import { type User, onAuthStateChanged } from "firebase/auth"

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  profilePhotoURL: string | null
  /** true only when user doc has termsAccepted === true */
  termsAccepted: boolean
  logout: () => Promise<void>
  /** Call after updating user doc (e.g. termsAccepted) to refresh context */
  refreshUserProfile: () => Promise<void>
  /** หลังยอมรับ terms บน consent page เรียกเพื่ออัปเดต context ทันที (ไม่ต้องรอ refresh) */
  markTermsAccepted: () => void
}

const TERMS_ACCEPTED_KEY = "rmu_terms_accepted"

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  profilePhotoURL: null,
  termsAccepted: false,
  logout: async () => {},
  refreshUserProfile: async () => {},
  markTermsAccepted: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profilePhotoURL, setProfilePhotoURL] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const initAuth = async () => {
      try {
        const { getFirebaseAuth } = await import("@/lib/firebase")
        // เปิด App Check ก่อนใช้ Auth/Firestore เพื่อป้องกัน Bot / การยิง API จากเว็บอื่น
        try {
          const { initializeFirebaseAppCheck } = await import("@/lib/app-check")
          initializeFirebaseAppCheck()
        } catch {
          // ไม่มี RECAPTCHA key หรือ dev ก็ข้ามได้
        }
        const auth = getFirebaseAuth()
        
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          setUser(user)
          
          if (user) {
            try {
              // โหลดโปรไฟล์ผ่าน API แทน Firestore เพื่อเลี่ยง Firestore SDK "Unexpected state" บน client
              const fetchProfile = async (token: string) =>
                fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })

              let token = await user.getIdToken()
              let res = await fetchProfile(token)

              // Handle race right after register/login: retry once with forced token refresh.
              if (res.status === 401) {
                await new Promise((resolve) => setTimeout(resolve, 350))
                token = await user.getIdToken(true)
                res = await fetchProfile(token)
              }

              if (res.ok) {
                const json = await res.json()
                const u = json?.data?.user
                if (u) {
                  setIsAdmin(Boolean(u.isAdmin))
                  setProfilePhotoURL(typeof u.photoURL === "string" && u.photoURL.trim() ? u.photoURL : null)
                  const accepted = u.termsAccepted === true
                  setTermsAccepted(accepted)
                  if (accepted && typeof sessionStorage !== "undefined") sessionStorage.setItem(TERMS_ACCEPTED_KEY, "1")
                  // Auto-unsuspend ทำฝั่ง server ใน GET /api/users/me แล้ว
                } else {
                  setIsAdmin(false)
                  setProfilePhotoURL(user.photoURL ?? null)
                  setTermsAccepted(false)
                }
              } else {
                setIsAdmin(false)
                setProfilePhotoURL(user.photoURL ?? null)
                const fallback = typeof sessionStorage !== "undefined" && sessionStorage.getItem(TERMS_ACCEPTED_KEY) === "1"
                setTermsAccepted(fallback)
                // 401 after retry: sign out only when this is not a freshly created account.
                if (res.status === 401) {
                  const createdAtMs = user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : 0
                  const isFreshAccount = Number.isFinite(createdAtMs) && Date.now() - createdAtMs < 2 * 60 * 1000
                  if (!isFreshAccount) {
                    const { signOut: firebaseSignOut } = await import("firebase/auth")
                    await firebaseSignOut(auth)
                  }
                }
              }
            } catch (error) {
              if (process.env.NODE_ENV === "development") console.warn("Auth profile fetch:", error)
              setIsAdmin(false)
              setProfilePhotoURL(user.photoURL ?? null)
              if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(TERMS_ACCEPTED_KEY) === "1") {
                setTermsAccepted(true)
              }
            }
          } else {
            setIsAdmin(false)
            setProfilePhotoURL(null)
            setTermsAccepted(false)
          }
          
          setLoading(false)
        })
      } catch {
        setLoading(false)
      }
    }

    initAuth()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase")
      const { signOut } = await import("firebase/auth")
      const auth = getFirebaseAuth()
      await signOut(auth)
    } catch {
      // Silent fail on logout error
    }
  }, [])

  const refreshUserProfile = useCallback(async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const json = await res.json()
        const u = json?.data?.user
        if (u) {
          setTermsAccepted(u.termsAccepted === true)
          setIsAdmin(Boolean(u.isAdmin))
          setProfilePhotoURL(typeof u.photoURL === "string" && u.photoURL.trim() ? u.photoURL : null)
        }
      }
    } catch (error) {
      console.error("Refresh user profile error:", error)
    }
  }, [user])

  const markTermsAccepted = useCallback(() => {
    setTermsAccepted(true)
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(TERMS_ACCEPTED_KEY, "1")
  }, [])

  const value = useMemo(
    () => ({ user, loading, isAdmin, profilePhotoURL, termsAccepted, logout, refreshUserProfile, markTermsAccepted }),
    [user, loading, isAdmin, profilePhotoURL, termsAccepted, logout, refreshUserProfile, markTermsAccepted]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
