'use client'

// React import not needed in Next.js 13+
import { useEffect } from "react"
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  useEffect(() => {
    const storageKey = props.storageKey ?? "theme"
    const savedTheme = window.localStorage.getItem(storageKey)
    if (savedTheme === "system") {
      window.localStorage.setItem(storageKey, "light")
    }
  }, [props.storageKey])

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
