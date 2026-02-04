"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { type User, onAuthStateChanged } from "firebase/auth"

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
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
  termsAccepted: false,
  logout: async () => {},
  refreshUserProfile: async () => {},
  markTermsAccepted: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const initAuth = async () => {
      try {
        const { getFirebaseAuth } = await import("@/lib/firebase")
        const auth = getFirebaseAuth()
        
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          setUser(user)
          
          if (user) {
            try {
              // โหลดโปรไฟล์ผ่าน API แทน Firestore เพื่อเลี่ยง Firestore SDK "Unexpected state" บน client
              const token = await user.getIdToken()
              const res = await fetch("/api/users/me", {
                headers: { Authorization: `Bearer ${token}` },
              })
              if (res.ok) {
                const json = await res.json()
                const u = json?.data?.user
                if (u) {
                  setIsAdmin(Boolean(u.isAdmin))
                  const accepted = u.termsAccepted === true
                  setTermsAccepted(accepted)
                  if (accepted && typeof sessionStorage !== "undefined") sessionStorage.setItem(TERMS_ACCEPTED_KEY, "1")
                  // Auto-unsuspend ทำฝั่ง server ใน GET /api/users/me แล้ว
                } else {
                  setIsAdmin(false)
                  setTermsAccepted(false)
                }
              } else {
                setIsAdmin(false)
                const fallback = typeof sessionStorage !== "undefined" && sessionStorage.getItem(TERMS_ACCEPTED_KEY) === "1"
                setTermsAccepted(fallback)
              }
            } catch (error) {
              console.error("Auth init error:", error)
              setIsAdmin(false)
              if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(TERMS_ACCEPTED_KEY) === "1") {
                setTermsAccepted(true)
              }
            }
          } else {
            setIsAdmin(false)
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

  const logout = async () => {
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase")
      const { signOut } = await import("firebase/auth")
      const auth = getFirebaseAuth()
      await signOut(auth)
    } catch {
      // Silent fail on logout error
    }
  }

  const refreshUserProfile = async () => {
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
        }
      }
    } catch (error) {
      console.error("Refresh user profile error:", error)
    }
  }

  const markTermsAccepted = () => {
    setTermsAccepted(true)
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(TERMS_ACCEPTED_KEY, "1")
  }

  const value = useMemo(
    () => ({ user, loading, isAdmin, termsAccepted, logout, refreshUserProfile, markTermsAccepted }),
    [user, loading, isAdmin, termsAccepted]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
