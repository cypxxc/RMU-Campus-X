"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
  requireEmailVerified?: boolean
  fallbackUrl?: string
}

/**
 * Component สำหรับป้องกัน route ที่ต้อง login
 * ใช้ครอบ page ที่ต้องการ protect
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  requireAdmin = false,
  requireEmailVerified = false,
  fallbackUrl = "/login",
}: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    // ต้อง login แต่ยังไม่ได้ login
    if (requireAuth && !user) {
      router.push(fallbackUrl)
      return
    }

    // ต้องเป็น admin แต่ไม่ใช่
    if (requireAdmin && !isAdmin) {
      router.push("/dashboard")
      return
    }

    // ต้อง verify email แต่ยังไม่ได้ verify
    if (requireEmailVerified && user && !user.emailVerified) {
      router.push("/verify-email")
      return
    }
  }, [user, loading, isAdmin, requireAuth, requireAdmin, requireEmailVerified, router, fallbackUrl])

  // กำลังโหลด
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // ไม่ผ่านเงื่อนไข
  if (requireAuth && !user) return null
  if (requireAdmin && !isAdmin) return null
  if (requireEmailVerified && user && !user.emailVerified) return null

  return <>{children}</>
}

/**
 * HOC สำหรับ protect page
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, "children">
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}
