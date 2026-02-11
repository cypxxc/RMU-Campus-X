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
  const { user, loading, termsAccepted, termsResolved } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const currentPath = pathname ?? ""
  const allowRenderWhileAuthLoading =
    isConsentAllowed(currentPath) ||
    currentPath === "/dashboard" || currentPath.startsWith("/dashboard/")

  useEffect(() => {
    if (loading) return
    if (!termsResolved) return
    if (!user) return
    if (termsAccepted) return
    if (isConsentAllowed(currentPath)) return
    router.replace("/consent")
  }, [loading, termsResolved, user, termsAccepted, currentPath, router])

  const needsConsent = !loading && termsResolved && !!user && !termsAccepted && !isConsentAllowed(currentPath)
  const shouldWaitForTermsResolution = !loading && !!user && !termsResolved && !isConsentAllowed(currentPath)
  const shouldBlockOnAuthLoading = loading && !allowRenderWhileAuthLoading

  if (shouldBlockOnAuthLoading || shouldWaitForTermsResolution || needsConsent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  return <>{children}</>
}
