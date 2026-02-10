"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/components/language-provider"

/**
 * Hook to verify admin access via server-side API.
 * Replaces the client-side Firestore `checkIsAdmin` query.
 * Redirects non-admins to /dashboard with a toast message.
 */
export function useAdminGuard() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { tt } = useI18n()

  const verifyAdmin = useCallback(async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/admin/verify", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setIsAdmin(true)
      } else {
        toast({
          title: tt("ไม่มีสิทธิ์เข้าถึง", "Access denied"),
          description: tt("คุณไม่มีสิทธิ์ใช้งานหน้าผู้ดูแลระบบ", "You do not have permission to access admin pages."),
          variant: "destructive",
        })
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("[useAdminGuard] Error:", error)
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }, [user, router, toast, tt])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    verifyAdmin()
  }, [authLoading, user, router, verifyAdmin])

  return { isAdmin, loading: loading || authLoading }
}
