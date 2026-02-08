"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

/**
 * แถบโหลดสั้นๆ ด้านบนเมื่อเปลี่ยน route (Micro-interaction)
 * แสดงแค่ช่วงสั้นๆ แล้วหายไป ให้รู้สึกว่า "กำลังโหลด"
 */
export function TopLoadingBar() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (pathname === prevPathname.current) return
    prevPathname.current = pathname
    setLoading(true)
    const t1 = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(t1)
  }, [pathname])

  if (!loading) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-primary overflow-hidden"
      role="progressbar"
      aria-valuenow={90}
      aria-label="กำลังโหลด"
    >
      <div className="h-full w-0 bg-primary/90 rounded-r-full animate-top-loading" />
    </div>
  )
}
