"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { ExternalLink, Lightbulb, Loader2, Mail, RefreshCw } from "lucide-react"
import { useI18n } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  applyEmailVerificationCode,
  EMAIL_VERIFICATION_LINK_EXPIRY_DAYS,
  resendVerificationEmail,
} from "@/lib/auth"
import { getFirebaseAuth } from "@/lib/firebase"

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
  const { tt } = useI18n()

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
          title: tt("ยืนยันอีเมลสำเร็จ", "Email verified"),
          description: tt("กำลังนำคุณไปยังหน้าแรก", "Redirecting to dashboard"),
        })
        router.replace("/dashboard")
      })
      .catch((error: { code?: string; message?: string }) => {
        appliedRef.current = false
        const isExpired =
          error.code === "auth/invalid-action-code" || error.message?.toLowerCase().includes("expired")

        toast({
          title: isExpired ? tt("ลิงก์หมดอายุ", "Verification link expired") : tt("ยืนยันอีเมลไม่สำเร็จ", "Verification failed"),
          description: isExpired
            ? tt(
                `ลิงก์ยืนยันใช้ได้ ${EMAIL_VERIFICATION_LINK_EXPIRY_DAYS} วัน กรุณากดส่งอีเมลยืนยันอีกครั้ง`,
                `Verification links are valid for ${EMAIL_VERIFICATION_LINK_EXPIRY_DAYS} days. Please request a new one.`
              )
            : error.message || tt("กรุณาลองใหม่อีกครั้ง", "Please try again"),
          variant: "destructive",
        })
      })
      .finally(() => setApplying(false))
  }, [router, searchParams, toast, tt])

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
  }, [applying, router])

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
          title: tt("ส่งอีเมลสำเร็จ", "Verification email sent"),
          description: tt("กรุณาตรวจสอบอีเมลของคุณ", "Please check your inbox."),
        })
      }
    } catch (error: unknown) {
      const authError = error as { code?: string; message?: string }
      let errorTitle = tt("เกิดข้อผิดพลาด", "Error")
      let errorDesc = authError.message || tt("ไม่สามารถส่งอีเมลได้", "Unable to send email")

      if (authError.code === "auth/too-many-requests") {
        errorTitle = tt("ส่งคำขอมากเกินไป", "Too many requests")
        errorDesc = tt(
          "กรุณารอสักครู่แล้วลองใหม่อีกครั้ง (ประมาณ 1-2 นาที)",
          "Please wait about 1-2 minutes before trying again."
        )
      } else if (authError.code === "auth/user-not-found") {
        errorTitle = tt("ไม่พบผู้ใช้", "User not found")
        errorDesc = tt("กรุณาสมัครสมาชิกใหม่อีกครั้ง", "Please register again.")
      } else if (authError.code === "auth/network-request-failed") {
        errorTitle = tt("เครือข่ายขัดข้อง", "Network error")
        errorDesc = tt("กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต", "Please check your internet connection.")
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
            title: tt("ยืนยันอีเมลสำเร็จ", "Email verified"),
            description: tt("กำลังนำคุณไปยังหน้าแรก", "Redirecting to dashboard"),
          })
          router.push("/dashboard")
        } else {
          toast({
            title: tt("ยังไม่ได้ยืนยัน", "Not verified yet"),
            description: tt("กรุณายืนยันอีเมลก่อนเข้าใช้งาน", "Please verify your email first."),
            variant: "destructive",
          })
        }
      }
    } catch (error: unknown) {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: error instanceof Error ? error.message : tt("กรุณาลองใหม่อีกครั้ง", "Please try again"),
        variant: "destructive",
      })
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-primary/5 via-background to-background p-4 relative overflow-hidden">
      {show3D && <ThreeBackground />}

      <div>
        <Card className="w-full max-w-md relative z-10 shadow-soft border-border/60">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">{tt("ยืนยันอีเมล", "Verify email")}</CardTitle>
            <CardDescription>
              {tt("เราได้ส่งลิงก์ยืนยันไปยังอีเมลของคุณแล้ว", "We sent a verification link to your email.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {applying ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-center text-muted-foreground">
                  {tt("กำลังยืนยันอีเมล...", "Verifying email...")}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-center text-muted-foreground leading-relaxed">
                  {tt(
                    "กรุณาตรวจสอบอีเมลและคลิกลิงก์ยืนยันเพื่อเริ่มใช้งาน RMU-Campus X เมื่อกดลิงก์แล้วระบบจะยืนยันให้อัตโนมัติ",
                    "Please open your email and click the verification link to start using RMU-Campus X."
                  )}
                </p>
                <p className="text-xs text-center text-muted-foreground">
                  {tt("ลิงก์ยืนยันใช้ได้", "Verification link is valid for")}{" "}
                  <strong>
                    {EMAIL_VERIFICATION_LINK_EXPIRY_DAYS} {tt("วัน", "days")}
                  </strong>
                </p>

                <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                    {tt("แนะนำวิธียืนยัน", "Verification tips")}
                  </div>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>{tt("เปิดอีเมล @rmu.ac.th ที่ใช้สมัคร", "Open your @rmu.ac.th inbox")}</li>
                    <li>
                      {tt(
                        "หาอีเมลจาก RMU-Campus X (หรือตรวจในโฟลเดอร์ Spam)",
                        "Find an email from RMU-Campus X (check spam folder too)"
                      )}
                    </li>
                    <li>
                      {tt(
                        "กดคลิกลิงก์ในอีเมล แล้วระบบจะพาไปหน้าแรกอัตโนมัติ",
                        "Click the link; the app will verify and redirect automatically."
                      )}
                    </li>
                    <li>{tt("ถ้ายังไม่เห็นอีเมล ให้กดส่งใหม่ด้านล่าง", "If you don't see it, request another email below.")}</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <Button asChild variant="outline" className="w-full bg-transparent">
                    <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {tt("เปิด Gmail", "Open Gmail")}
                    </a>
                  </Button>
                  <Button onClick={handleCheckVerification} className="w-full" disabled={checking}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {checking
                      ? tt("กำลังตรวจสอบ...", "Checking...")
                      : tt("ตรวจสอบการยืนยัน", "Check verification")}
                  </Button>
                  <Button onClick={handleResend} variant="outline" className="w-full bg-transparent" disabled={loading}>
                    {loading
                      ? tt("กำลังส่ง...", "Sending...")
                      : tt("ส่งอีเมลยืนยันอีกครั้ง", "Resend verification email")}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
