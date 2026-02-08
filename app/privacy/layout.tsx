"use client"

import type React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

function PrivacyLayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const standalone = searchParams.get("standalone") === "1"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95 sticky top-0 z-10">
        <div className="container flex h-14 items-center px-4">
          <Link
            href={standalone ? "/consent" : "/"}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {standalone ? "← กลับไปหน้ายอมรับ" : "← กลับหน้าหลัก"}
          </Link>
        </div>
      </header>
      {children}
    </div>
  )
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <header className="border-b bg-background/95 sticky top-0 z-10">
            <div className="container flex h-14 items-center px-4">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                ← กลับหน้าหลัก
              </Link>
            </div>
          </header>
          {children}
        </div>
      }
    >
      <PrivacyLayoutInner>{children}</PrivacyLayoutInner>
    </Suspense>
  )
}
