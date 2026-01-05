"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertCircle, RefreshCw, ArrowLeft, Home } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const isDev = process.env.NODE_ENV === 'development'

  useEffect(() => {
    // Log error for monitoring
    console.error("[RootError]", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="text-center max-w-lg mx-auto space-y-6 animate-fade-in">
        {/* Error Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shadow-lg">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>

        {/* Error Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            เกิดข้อผิดพลาด
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            ไม่สามารถโหลดหน้านี้ได้ กรุณาลองใหม่อีกครั้ง<br/>
            หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </div>

        {/* Development Error Details */}
        {isDev && (
          <Card className="p-4 bg-muted/50 border-destructive/20 text-left">
            <p className="text-xs font-mono text-destructive mb-2 font-semibold">
              🔍 Development Mode Error:
            </p>
            <p className="text-xs font-mono text-foreground/80 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-muted-foreground mt-2">
                Digest: {error.digest}
              </p>
            )}
          </Card>
        )}

        {!isDev && error.digest && (
          <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded-md inline-block">
            Error ID: {error.digest.slice(0, 12)}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button onClick={reset} size="default" className="gap-2 shadow-sm">
            <RefreshCw className="h-4 w-4" />
            ลองใหม่อีกครั้ง
          </Button>
          <Button 
            variant="outline" 
            size="default" 
            onClick={() => router.push('/dashboard')}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            กลับหน้าหลัก
          </Button>
          <Button 
            variant="ghost" 
            size="default" 
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            ย้อนกลับ
          </Button>
        </div>

        {/* Helpful tip */}
        <p className="text-xs text-muted-foreground/60 pt-4">
          💡 คุณสามารถลองรีเฟรชหน้านี้ หรือกลับไปหน้าหลักได้
        </p>
      </div>
    </div>
  )
}
