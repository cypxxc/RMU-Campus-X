"use client"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/language-provider"
import { cn } from "@/lib/utils"

interface LanguageSwitcherProps {
  className?: string
  compact?: boolean
}

export function LanguageSwitcher({ className, compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n()

  return (
    <div
      role="group"
      aria-label={t("common.language.label")}
      className={cn("inline-flex items-center rounded-md border border-border/70 p-0.5", className)}
    >
      <Button
        type="button"
        size="sm"
        variant={locale === "th" ? "secondary" : "ghost"}
        className={cn("h-8 px-2.5 text-xs font-semibold", compact && "h-7 px-2")}
        onClick={() => setLocale("th")}
      >
        TH
      </Button>
      <Button
        type="button"
        size="sm"
        variant={locale === "en" ? "secondary" : "ghost"}
        className={cn("h-8 px-2.5 text-xs font-semibold", compact && "h-7 px-2")}
        onClick={() => setLocale("en")}
      >
        EN
      </Button>
    </div>
  )
}
