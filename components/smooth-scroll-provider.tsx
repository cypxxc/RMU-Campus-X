"use client"

import { useEffect, useRef } from "react"

/**
 * Lenis Smooth Scroll - เลื่อนหน้านุ่มนวลระดับพรีเมียม
 * โหลดแบบ dynamic เพื่อไม่บล็อก SSR
 */
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<import("lenis").default | null>(null)

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    const init = async () => {
      const Lenis = (await import("lenis")).default
      lenisRef.current = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
        touchMultiplier: 1.5,
        smoothWheel: true,
        autoRaf: true,
      })
    }

    init()
    return () => {
      lenisRef.current?.destroy()
      lenisRef.current = null
    }
  }, [])

  return <>{children}</>
}
