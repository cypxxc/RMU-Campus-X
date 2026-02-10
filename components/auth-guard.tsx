"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Loader2 } from "lucide-react"
import { useI18n } from "@/components/language-provider"

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { user, loading, isAdmin } = useAuth()
  const { tt } = useI18n()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return

    if (!user) {
      // Redirect to login with return url
      router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}`)
      return
    }

    if (requireAdmin && !isAdmin) {
      router.replace("/dashboard") 
      return
    }
  }, [user, loading, isAdmin, requireAdmin, router, pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">{tt("กำลังตรวจสอบสิทธิ์...", "Checking permissions...")}</p>
        </div>
      </div>
    )
  }

  if (!user || (requireAdmin && !isAdmin)) {
    return null // Will redirect in useEffect
  }

  return <>{children}</>
}
