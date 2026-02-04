"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import { pathToHistoryEntries, getLabelForPath } from "@/lib/breadcrumb-labels"

export type HistoryEntry = { path: string; label: string }

type ContextValue = {
  history: HistoryEntry[]
  navigateToBreadcrumb: (index: number) => void
}

export const NavigationHistoryContext = createContext<ContextValue | null>(null)

export function useNavigationHistory(): ContextValue {
  const ctx = useContext(NavigationHistoryContext)
  if (!ctx) throw new Error("useNavigationHistory must be used within NavigationHistoryProvider")
  return ctx
}

export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [history, setHistory] = useState<HistoryEntry[]>(() =>
    pathname ? pathToHistoryEntries(pathname) : [{ path: "/", label: "หน้าแรก" }]
  )
  const fromBreadcrumbClick = useRef(false)

  const navigateToBreadcrumb = useCallback(
    (index: number) => {
      setHistory((prev) => {
        const path = prev[index]?.path
        if (path != null) {
          fromBreadcrumbClick.current = true
          queueMicrotask(() => router.push(path))
          return prev.slice(0, index + 1)
        }
        return prev
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
      setHistory((prev) => {
        const last = prev[prev.length - 1]
        if (last?.path === pathname) return prev

        const found = prev.findIndex((e) => e.path === pathname)
        if (found >= 0) return prev.slice(0, found + 1)

        return [...prev, { path: pathname, label: getLabelForPath(pathname) }]
      })
    })
  }, [pathname])

  const value: ContextValue = { history, navigateToBreadcrumb }

  return (
    <NavigationHistoryContext.Provider value={value}>
      {children}
    </NavigationHistoryContext.Provider>
  )
}
