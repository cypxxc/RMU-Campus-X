"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import { useI18n } from "@/components/language-provider"
import { getLabelForPath, pathToHistoryEntries } from "@/lib/breadcrumb-labels"

export type HistoryEntry = { path: string; label: string }

type ContextValue = {
  history: HistoryEntry[]
  navigateToBreadcrumb: (index: number) => void
}

export const NavigationHistoryContext = createContext<ContextValue | null>(null)

export function useNavigationHistory(): ContextValue {
  const context = useContext(NavigationHistoryContext)
  if (!context) {
    throw new Error("useNavigationHistory must be used within NavigationHistoryProvider")
  }
  return context
}

export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { locale } = useI18n()

  const [history, setHistory] = useState<HistoryEntry[]>(() =>
    pathname
      ? pathToHistoryEntries(pathname, locale)
      : [{ path: "/", label: getLabelForPath("/", locale) }]
  )

  const fromBreadcrumbClick = useRef(false)

  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      setHistory((previousHistory) => {
        const path = previousHistory[index]?.path
        if (path != null) {
          fromBreadcrumbClick.current = true
          queueMicrotask(() => router.push(path))
          return previousHistory.slice(0, index + 1)
        }
        return previousHistory
      })
    },
    [router]
  )

  useEffect(() => {
    if (!pathname) return

    if (fromBreadcrumbClick.current) {
      fromBreadcrumbClick.current = false
      return
    }

    queueMicrotask(() => {
      setHistory((previousHistory) => {
        const last = previousHistory[previousHistory.length - 1]
        if (last?.path === pathname) return previousHistory

        const foundIndex = previousHistory.findIndex((entry) => entry.path === pathname)
        if (foundIndex >= 0) return previousHistory.slice(0, foundIndex + 1)

        return [...previousHistory, { path: pathname, label: getLabelForPath(pathname, locale) }]
      })
    })
  }, [locale, pathname])

  const value = useMemo<ContextValue>(
    () => ({ history, navigateToBreadcrumb }),
    [history, navigateToBreadcrumb]
  )

  return <NavigationHistoryContext.Provider value={value}>{children}</NavigationHistoryContext.Provider>
}
