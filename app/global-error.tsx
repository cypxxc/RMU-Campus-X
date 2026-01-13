"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

import { SystemLogger } from "@/lib/services/logger"
// ...
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error using SystemLogger
    SystemLogger.logError(error, 'GlobalError', 'CRITICAL')
  }, [error])

  return (
    <html lang="th">
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
                เกิดข้อผิดพลาด
              </h1>
              <p className="text-muted-foreground">
                ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
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
                ลองใหม่อีกครั้ง
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <Link href="/dashboard">
                  <Home className="h-4 w-4" />
                  กลับหน้าหลัก
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
