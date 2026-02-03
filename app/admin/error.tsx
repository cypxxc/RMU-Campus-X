"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ShieldAlert, RefreshCw, Home , AlertTriangle} from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const isDev = process.env.NODE_ENV === 'development'

  useEffect(() => {
    // Log admin panel errors
    console.error("[AdminError]", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: new Date().toISOString(),
    })
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Admin Error Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
          <ShieldAlert className="h-10 w-10 text-amber-600" />
        </div>

        {/* Error Message */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            เกิดข้อผิดพลาดในหน้าจัดการ
          </h2>
          <p className="text-muted-foreground">
            ไม่สามารถโหลดหน้าจัดการนี้ได้ กรุณาลองใหม่อีกครั้ง
          </p>
        </div>

        {/* Development Error Details */}
        {isDev && (
          <Card className="p-4 bg-amber-500/5 border-amber-500/20 text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-500 mb-2">
                  รายละเอียดข้อผิดพลาด (โหมดพัฒนา):
                </p>
                <pre className="text-xs font-mono text-foreground/80 overflow-x-auto break-all whitespace-pre-wrap">
                  {error.message}
                </pre>
                {error.stack && (
                  <details className="mt-3">
                    <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                      รายละเอียดเทคนิค
                    </summary>
                    <pre className="text-[10px] font-mono text-muted-foreground mt-2 p-2 bg-muted/50 rounded overflow-x-auto">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </Card>
        )}

        {!isDev && error.digest && (
          <Card className="p-3 bg-muted/30 border-muted">
            <p className="text-xs text-muted-foreground">
              รหัสอ้างอิง: <span className="font-mono font-semibold">{error.digest.slice(0, 16)}</span>
            </p>
          </Card>
        )}

        {/* Admin Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button 
            onClick={reset} 
            size="default" 
            variant="default"
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            <RefreshCw className="h-4 w-4" />
            รีเฟรชหน้านี้
          </Button>
          <Button 
            variant="outline" 
            size="default" 
            onClick={() => router.push('/admin')}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            กลับหน้าภาพรวม
          </Button>
        </div>

        {/* Admin Tip */}
        <div className="bg-muted/30 border border-muted rounded-lg p-4 text-left">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">💡 เคล็ดลับ:</span> หากปัญหายังคงอยู่ ลองตรวจสอบ:
          </p>
          <ul className="text-xs text-muted-foreground mt-2 ml-6 space-y-1 list-disc">
            <li>สิทธิ์การเข้าถึงข้อมูลในฐานข้อมูล</li>
            <li>การเชื่อมต่อระบบ</li>
            <li>เครื่องมือ Developer (Console) สำหรับข้อความแจ้งเตือนเพิ่มเติม</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
