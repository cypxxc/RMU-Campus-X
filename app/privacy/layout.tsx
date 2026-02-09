"use client"

import type React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

function PrivacyLayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const standalone = searchParams.get("standalone") === "1"
  const fromLanding = searchParams.get("from") === "landing"

  const backHref = standalone ? "/consent" : fromLanding ? "/" : "/dashboard"
  const backLabel = standalone ? "← กลับไปหน้ายอมรับ" : "← กลับหน้าหลัก"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
            {backLabel}
          </Link>
          <nav className="flex items-center gap-2 text-sm" aria-label="เมนูเอกสาร">
            <Link href="/guide" className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
              คู่มือการใช้งาน
            </Link>
            <Link href="/terms" className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
              ข้อกำหนด
            </Link>
            <Link href="/privacy" className="px-3 py-1.5 rounded-md bg-primary/10 text-primary font-medium">
              ความเป็นส่วนตัว
            </Link>
            <Link href="/guidelines" className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
              แนวทางชุมชน
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
            <div className="container mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
                ← กลับหน้าหลัก
              </Link>
              <nav className="flex items-center gap-2 text-sm" aria-label="เมนูเอกสาร">
                <Link href="/guide" className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                  คู่มือการใช้งาน
                </Link>
                <Link href="/terms" className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                  ข้อกำหนด
                </Link>
                <Link href="/privacy" className="px-3 py-1.5 rounded-md bg-primary/10 text-primary font-medium">
                  ความเป็นส่วนตัว
                </Link>
                <Link href="/guidelines" className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                  แนวทางชุมชน
                </Link>
              </nav>
            </div>
          </header>
          <main>{children}</main>
        </div>
      }
    >
      <PrivacyLayoutInner>{children}</PrivacyLayoutInner>
    </Suspense>
  )
}
