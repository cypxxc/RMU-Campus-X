"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Cookie, X } from "lucide-react"
import { useI18n } from "@/components/language-provider"
import { Button } from "@/components/ui/button"

const CONSENT_KEY = "rmu-cookie-consent"

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(CONSENT_KEY)
      if (!stored) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [mounted])

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted")
      setVisible(false)
    } catch {
      setVisible(false)
    }
  }

  if (!mounted || !visible) return null

  return (
    <div
      role="dialog"
      aria-label={t("cookie.ariaLabel")}
      className="fixed bottom-0 left-0 right-0 z-[100] px-4 py-4 sm:px-6 sm:py-5 animate-slide-up"
    >
      <div className="mx-auto max-w-4xl rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl shadow-soft-lg shadow-black/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Cookie className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{t("cookie.title")}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {t("cookie.description")}{" "}
              <Link href="/privacy" className="text-primary hover:underline font-medium">
                {t("cookie.privacyLink")}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Button size="sm" onClick={handleAccept} className="h-9 px-4 font-medium shrink-0">
            {t("cookie.acceptAll")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleAccept}
            aria-label={t("cookie.close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
