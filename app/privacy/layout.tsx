"use client"

import type React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { BreadcrumbBar } from "@/components/breadcrumb-bar"

function PrivacyLayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const standalone = searchParams.get("standalone") === "1"

  if (standalone) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b bg-background/95 sticky top-0 z-10">
          <div className="container flex h-14 items-center px-4">
            <Link
              href="/consent"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← กลับไปหน้ายอมรับ
            </Link>
          </div>
        </header>
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <BreadcrumbBar />
      {children}
    </div>
  )
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <Navbar />
        <BreadcrumbBar />
        {children}
      </div>
    }>
      <PrivacyLayoutInner>{children}</PrivacyLayoutInner>
    </Suspense>
  )
}
