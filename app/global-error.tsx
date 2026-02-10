"use client"

import { useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

type Locale = "th" | "en"

function getClientLocale(): Locale {
  if (typeof document === "undefined") return "th"
  const cookieLocale = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("rmu_locale="))
    ?.split("=")[1]
    ?.toLowerCase()
  return cookieLocale === "en" ? "en" : "th"
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Client-safe logging only (SystemLogger pulls in firebase-admin via firestore-sink → breaks browser bundle)
    console.error("[GlobalError]", error?.message, error?.digest, error)
  }, [error])

  const locale = useMemo(() => getClientLocale(), [])
  const tt = useMemo(
    () => (th: string, en: string) => (locale === "th" ? th : en),
    [locale]
  )

  return (
    <html lang={locale}>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center max-w-md mx-auto space-y-6">
            {/* Error Icon */}
            <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {tt("เกิดข้อผิดพลาด", "Something went wrong")}
              </h1>
              <p className="text-muted-foreground">
                {tt(
                  "ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง",
                  "An unexpected error occurred. Please try again."
                )}
              </p>
              {/* แสดง error digest สำหรับ support (ไม่แสดง stack) */}
              {error.digest && (
                <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded-md inline-block">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={reset} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {tt("ลองใหม่อีกครั้ง", "Try again")}
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
