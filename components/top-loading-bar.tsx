"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useI18n } from "@/components/language-provider"

/**
 * แถบโหลดสั้นๆ ด้านบนเมื่อเปลี่ยน route (Micro-interaction)
 * แสดงแค่ช่วงสั้นๆ แล้วหายไป ให้รู้สึกว่า "กำลังโหลด"
 */
export function TopLoadingBar() {
  const pathname = usePathname()
  const { tt } = useI18n()
  const [loading, setLoading] = useState(false)
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (pathname === prevPathname.current) return
    prevPathname.current = pathname
    const rafId = window.requestAnimationFrame(() => setLoading(true))
    const t1 = setTimeout(() => setLoading(false), 400)
    return () => {
      window.cancelAnimationFrame(rafId)
      clearTimeout(t1)
    }
  }, [pathname])

  if (!loading) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-primary overflow-hidden"
      role="progressbar"
      aria-valuenow={90}
      aria-label={tt("กำลังโหลด", "Loading")}
    >
      <div className="h-full w-0 bg-primary/90 rounded-r-full animate-top-loading" />
    </div>
  )
}
