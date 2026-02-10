"use client"

import { useEffect, useRef } from "react"

interface UseRefreshOnFocusOptions {
  enabled?: boolean
  minIntervalMs?: number
  runOnMount?: boolean
}

/**
 * Refresh data when the admin returns to this tab/window instead of polling.
 */
export function useRefreshOnFocus(
  refresh: () => void | Promise<void>,
  options: UseRefreshOnFocusOptions = {}
) {
  const {
    enabled = true,
    minIntervalMs = 5_000,
    runOnMount = false,
  } = options

  const lastRefreshAtRef = useRef(0)

  useEffect(() => {
    if (!enabled) return
    if (typeof window === "undefined" || typeof document === "undefined") return

    const invokeRefresh = () => {
      if (document.visibilityState !== "visible") return

      const now = Date.now()
      if (now - lastRefreshAtRef.current < minIntervalMs) return
      lastRefreshAtRef.current = now

      void refresh()
    }

    if (runOnMount) invokeRefresh()

    const onFocus = () => invokeRefresh()
    const onVisibilityChange = () => invokeRefresh()

    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [enabled, minIntervalMs, refresh, runOnMount])
}
