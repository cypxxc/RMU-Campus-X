"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Loader2 } from "lucide-react"

const CONSENT_ALLOWED_PATHS = [
  "/consent",
  "/terms",
  "/privacy",
  "/guidelines",
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
]

function isConsentAllowed(path: string) {
  return CONSENT_ALLOWED_PATHS.some((p) => path === p || path.startsWith(p + "/"))
}

export function ConsentGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, termsAccepted } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) return
    if (termsAccepted) return
    if (isConsentAllowed(pathname ?? "")) return
    router.replace("/consent")
  }, [loading, user, termsAccepted, pathname, router])

  // ลด flash: แสดง loading แทนเนื้อหาเมื่อต้อง redirect ไป consent
  const needsConsent = !!user && !termsAccepted && !isConsentAllowed(pathname ?? "")
  if (loading || needsConsent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  return <>{children}</>
}
