"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { type User, onAuthStateChanged } from "firebase/auth"

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

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
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                })
              } else {
                // Check for auto-unsuspend efficiently
                const userData = userDocSnap.data()
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

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({ user, loading, isAdmin, logout }), [user, loading, isAdmin])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
