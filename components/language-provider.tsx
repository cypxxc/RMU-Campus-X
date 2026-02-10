"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_MAX_AGE_SECONDS,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "@/lib/i18n/config"
import { type TranslationValues, translate } from "@/lib/i18n/translate"

type LanguageContextValue = {
  locale: Locale
  setLocale: (nextLocale: Locale) => void
  t: (key: string, values?: TranslationValues) => string
  tt: (th: string, en: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function persistLocale(locale: Locale) {
  if (typeof document !== "undefined") {
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${LOCALE_MAX_AGE_SECONDS}; samesite=lax`
    document.documentElement.lang = locale
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      // ignore storage errors
    }
  }
}

export function LanguageProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode
  initialLocale?: Locale
}) {
  const router = useRouter()
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  useEffect(() => {
    persistLocale(locale)
  }, [locale])

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      setLocaleState((currentLocale) => {
        if (currentLocale === nextLocale) return currentLocale
        persistLocale(nextLocale)
        router.refresh()
        return nextLocale
      })
    },
    [router]
  )

  const t = useCallback(
    (key: string, values?: TranslationValues) => translate(locale, key, values),
    [locale]
  )

  const tt = useCallback(
    (th: string, en: string) => (locale === "th" ? th : en),
    [locale]
  )

  const value = useMemo(() => ({ locale, setLocale, t, tt }), [locale, setLocale, t, tt])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useI18n must be used within LanguageProvider")
  }
  return context
}
