"use client"

import type React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useI18n } from "@/components/language-provider"

function GuidelinesLayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const { tt } = useI18n()
  const fromLanding = searchParams.get("from") === "landing"
  const backHref = fromLanding ? "/" : "/dashboard"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
            {tt("← กลับหน้าหลัก", "← Back to home")}
          </Link>
          <nav className="flex items-center gap-2 text-sm" aria-label={tt("เมนูเอกสาร", "Document menu")}>
            <Link href="/guide" className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
              {tt("คู่มือการใช้งาน", "Guide")}
            </Link>
            <Link href="/terms" className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
              {tt("ข้อกำหนด", "Terms")}
            </Link>
            <Link href="/privacy" className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
              {tt("ความเป็นส่วนตัว", "Privacy")}
            </Link>
            <Link href="/guidelines" className="px-3 py-1.5 rounded-md bg-primary/10 text-primary font-medium">
              {tt("แนวทางชุมชน", "Guidelines")}
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}

export default function GuidelinesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main>{children}</main>}>
      <GuidelinesLayoutInner>{children}</GuidelinesLayoutInner>
    </Suspense>
  )
}
