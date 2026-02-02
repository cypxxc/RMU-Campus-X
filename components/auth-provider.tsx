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
              const { getFirebaseDb } = await import("@/lib/firebase")
              const { doc, getDoc, setDoc, serverTimestamp } = await import("firebase/firestore")
              const db = getFirebaseDb()
              
              // Parallel Fetch: Check admin status AND user document
              const [adminDoc, userDocSnap] = await Promise.all([
                getDoc(doc(db, "admins", user.uid)),
                getDoc(doc(db, "users", user.uid))
              ])
              
              setIsAdmin(adminDoc.exists())
              
              // Auto-create user document if not exists (critical for posting)
              if (!userDocSnap.exists()) {
                await setDoc(doc(db, "users", user.uid), {
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName || user.email?.split("@")[0] || "",
                  photoURL: user.photoURL || "",
                  status: "ACTIVE",
                  warningCount: 0,
                  restrictions: {
                    canPost: true,
                    canExchange: true,
                    canChat: true,
                  },
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  // termsAccepted left false/undefined so user must accept on consent page
                })
                setTermsAccepted(false)
              } else {
                const userData = userDocSnap.data()
                setTermsAccepted(userData?.termsAccepted === true)
                // Check for auto-unsuspend efficiently
                if (userData?.status === 'SUSPENDED') {
                  const { checkAndAutoUnsuspend } = await import("@/lib/firestore")
                  await checkAndAutoUnsuspend(user.uid, userData)
                }
              }
            } catch (error) {
              console.error("Auth init error:", error)
              setIsAdmin(false)
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
      const { getFirebaseDb } = await import("@/lib/firebase")
      const { doc, getDocFromServer } = await import("firebase/firestore")
      const db = getFirebaseDb()
      const userDocSnap = await getDocFromServer(doc(db, "users", user.uid))
      if (userDocSnap.exists()) {
        setTermsAccepted(userDocSnap.data()?.termsAccepted === true)
      }
    } catch (error) {
      console.error("Refresh user profile error:", error)
    }
  }

  const markTermsAccepted = () => setTermsAccepted(true)

  const value = useMemo(
    () => ({ user, loading, isAdmin, termsAccepted, logout, refreshUserProfile, markTermsAccepted }),
    [user, loading, isAdmin, termsAccepted]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
