"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "@/components/logo"
import { SUPPORT_MAILTO } from "@/lib/constants"

export function SiteFooter() {
  const currentYear = new Date().getFullYear()
  const pathname = usePathname()
  const fromLanding = pathname === "/"

  const footerLinks = [
    { href: "/guide", label: "คู่มือการใช้งาน", fromLanding: true },
    { href: "/terms", label: "ข้อกำหนดการใช้งาน", fromLanding: false },
    { href: "/privacy", label: "นโยบายความเป็นส่วนตัว", fromLanding: false },
    { href: "/guidelines", label: "แนวทางชุมชน", fromLanding: false },
  ]

  return (
    <footer className="border-t bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-14">
        {/* เนื้อหาหลัก: แบรนด์ + ลิงก์ */}
        <div className="flex flex-col items-center text-center gap-10 sm:gap-12">
          <div className="space-y-4 max-w-md">
            <Logo size="lg" className="inline-block" />
            <p className="text-muted-foreground text-sm leading-relaxed">
              แพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษาและบุคลากร
              มหาวิทยาลัยราชภัฏมหาสารคาม
            </p>
            <p className="text-muted-foreground text-sm">
              ติดต่อทีมสนับสนุน:{" "}
              <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
                Support
              </a>
            </p>
          </div>

          <nav aria-label="นโยบายและความปลอดภัย" className="space-y-2">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
              {footerLinks.map(({ href, label, fromLanding: useFromLanding }) => (
                <li key={href}>
                  <Link
                    href={fromLanding && useFromLanding ? `${href}?from=landing` : href}
                    className="text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* ลิเนียร์ + ลิขสิทธิ์ */}
        <div className="mt-10 sm:mt-12 pt-8 border-t border-border/80">
          <p className="text-center text-xs text-muted-foreground">
            © {currentYear} RMU-Campus X · มหาวิทยาลัยราชภัฏมหาสารคาม
          </p>
        </div>
      </div>
    </footer>
  )
}
