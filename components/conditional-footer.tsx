"use client"

import { usePathname } from "next/navigation"
import { SiteFooter } from "@/components/site-footer"

/**
 * แสดง footer เฉพาะหน้าสาธารณะ/ข้อมูล
 * ไม่แสดงในหน้า auth, แดชบอร์ด, แชท, แอดมิน, คำร้องของฉัน (/support) เพื่อไม่รบกวนการใช้งาน
 */
const FOOTER_PATHS: string[] = [
  "/",
  "/about",
  "/faq",
  "/terms",
  "/privacy",
  "/guidelines",
  "/api-docs",
]

function shouldShowFooter(pathname: string): boolean {
  if (pathname === "/") return true
  return FOOTER_PATHS.some((path) => path !== "/" && pathname.startsWith(path))
}

export function ConditionalFooter() {
  const pathname = usePathname()
  if (!pathname || !shouldShowFooter(pathname)) return null
  return <SiteFooter />
}
