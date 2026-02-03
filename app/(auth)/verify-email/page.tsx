"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getFirebaseAuth } from "@/lib/firebase"
import { resendVerificationEmail, applyEmailVerificationCode, EMAIL_VERIFICATION_LINK_EXPIRY_DAYS } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Mail, RefreshCw, Loader2, Lightbulb } from "lucide-react"
import { BounceWrapper } from "@/components/ui/bounce-wrapper"
import dynamic from "next/dynamic"

// Dynamic import for Three.js - loads only when needed
const ThreeBackground = dynamic(
  () => import("@/components/three-background").then((mod) => mod.ThreeBackground),
  { ssr: false, loading: () => null }
)

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [applying, setApplying] = useState(false)
  const [show3D, setShow3D] = useState(false)
  const appliedRef = useRef(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Auto verification เมื่อกดลิงก์จากอีเมล (มี oobCode ใน URL)
  useEffect(() => {
    const mode = searchParams.get("mode")
    const oobCode = searchParams.get("oobCode")
    if (mode !== "verifyEmail" || !oobCode || appliedRef.current) return

    appliedRef.current = true
    setApplying(true)

    applyEmailVerificationCode(oobCode)
      .then(async () => {
        const auth = getFirebaseAuth()
        if (auth.currentUser) await auth.currentUser.reload()
        toast({
          title: "ยืนยันอีเมลสำเร็จ",
          description: "กำลังนำคุณไปยังหน้าแรก",
        })
        router.replace("/dashboard")
      })
      .catch((error: { code?: string; message?: string }) => {
        appliedRef.current = false
        const isExpired = error.code === "auth/invalid-action-code" || error.message?.toLowerCase().includes("expired")
        toast({
          title: isExpired ? "ลิงก์หมดอายุ" : "ยืนยันอีเมลไม่สำเร็จ",
          description: isExpired
            ? `ลิงก์ยืนยันใช้ได้ ${EMAIL_VERIFICATION_LINK_EXPIRY_DAYS} วัน กรุณากดส่งอีเมลยืนยันอีกครั้ง`
            : error.message || "กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        })
      })
      .finally(() => setApplying(false))
  }, [searchParams, router, toast])

  useEffect(() => {
    if (applying) return
    const auth = getFirebaseAuth()
    const user = auth.currentUser
    if (!user) {
      router.push("/register")
      return
    }

    if (user.emailVerified) {
      router.push("/dashboard")
    }
  }, [router, applying])

  // Lazy load 3D background
  useEffect(() => {
    const timer = setTimeout(() => setShow3D(true), 800)
    return () => clearTimeout(timer)
  }, [])

  const handleResend = async () => {
    setLoading(true)
    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (user) {
        await resendVerificationEmail(user)
        toast({
          title: "ส่งอีเมลสำเร็จ",
          description: "กรุณาตรวจสอบอีเมลของคุณ",
        })
      }
    } catch (error: any) {
      // Handle specific Firebase errors
      let errorTitle = "เกิดข้อผิดพลาด"
      let errorDesc = error.message
      
      if (error.code === "auth/too-many-requests") {
        errorTitle = "ส่งคำขอมากเกินไป"
        errorDesc = "กรุณารอสักครู่แล้วลองใหม่อีกครั้ง (ประมาณ 1-2 นาที)"
      } else if (error.code === "auth/user-not-found") {
        errorTitle = "ไม่พบผู้ใช้"
        errorDesc = "กรุณาสมัครสมาชิกใหม่อีกครั้ง"
      } else if (error.code === "auth/network-request-failed") {
        errorTitle = "เครือข่ายขัดข้อง"
        errorDesc = "กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต"
      }
      
      toast({
        title: errorTitle,
        description: errorDesc,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }


  const handleCheckVerification = async () => {
    setChecking(true)
    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (user) {
        await user.reload()
        if (user.emailVerified) {
          toast({
            title: "ยืนยันอีเมลสำเร็จ",
            description: "กำลังนำคุณไปยังหน้าแรก",
          })
          router.push("/dashboard")
        } else {
          toast({
            title: "ยังไม่ได้ยืนยัน",
            description: "กรุณายืนยันอีเมลก่อนเข้าใช้งาน",
            variant: "destructive",
          })
        }
      }
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-primary/5 via-background to-background p-4 relative overflow-hidden">
      {/* 3D Background - lazy loaded */}
      {show3D && <ThreeBackground />}
      
      <BounceWrapper variant="bounce-in">
        <Card className="w-full max-w-md relative z-10 shadow-soft border-border/60">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">ยืนยันอีเมล</CardTitle>
            <CardDescription>เราได้ส่งลิงก์ยืนยันไปยังอีเมลของคุณแล้ว</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {applying ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-center text-muted-foreground">กำลังยืนยันอีเมล...</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-center text-muted-foreground leading-relaxed">
                  กรุณาตรวจสอบอีเมลและคลิกลิงก์ยืนยันเพื่อเริ่มใช้งาน RMU-Campus X เมื่อกดลิงก์แล้วระบบจะยืนยันให้อัตโนมัติ
                </p>
                <p className="text-xs text-center text-muted-foreground">
                  ลิงก์ยืนยันใช้ได้ <strong>{EMAIL_VERIFICATION_LINK_EXPIRY_DAYS} วัน</strong>
                </p>

                {/* แนะนำขั้นตอน */}
                <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                    แนะนำวิธียืนยัน
                  </div>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>เปิดอีเมล @rmu.ac.th ที่ใช้สมัคร</li>
                    <li>หาอีเมลจาก RMU-Campus X (หรือตรวจในโฟลเดอร์ Spam)</li>
                    <li>กดคลิกลิงก์ในอีเมล — ระบบจะยืนยันให้อัตโนมัติแล้วพาไปหน้าแรก</li>
                    <li>ถ้ายังไม่เห็นอีเมล กดปุ่ม &quot;ส่งอีเมลยืนยันอีกครั้ง&quot; ด้านล่าง</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <Button onClick={handleCheckVerification} className="w-full" disabled={checking}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {checking ? "กำลังตรวจสอบ..." : "ตรวจสอบการยืนยัน"}
                  </Button>
                  <Button onClick={handleResend} variant="outline" className="w-full bg-transparent" disabled={loading}>
                    {loading ? "กำลังส่ง..." : "ส่งอีเมลยืนยันอีกครั้ง"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </BounceWrapper>
    </div>
  )
}
