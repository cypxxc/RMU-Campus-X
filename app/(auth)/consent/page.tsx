"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { acceptTerms } from "@/lib/db/users-profile"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ShieldCheck, FileText } from "lucide-react"
import { Logo } from "@/components/logo"
import dynamic from "next/dynamic"

const ThreeBackground = dynamic(
  () => import("@/components/three-background").then((mod) => mod.ThreeBackground),
  { ssr: false, loading: () => null }
)

export default function ConsentPage() {
  const { user, loading: authLoading, termsAccepted, refreshUserProfile, markTermsAccepted } = useAuth()
  const [acceptTermsCheck, setAcceptTermsCheck] = useState(false)
  const [acceptPrivacyCheck, setAcceptPrivacyCheck] = useState(false)
  const [loading, setLoading] = useState(false)
  const [show3D, setShow3D] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const timer = setTimeout(() => setShow3D(true), 800)
    return () => clearTimeout(timer)
  }, [])

  // Already accepted → go to dashboard
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    if (termsAccepted) {
      router.push("/dashboard")
    }
  }, [user, authLoading, termsAccepted, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptTermsCheck || !acceptPrivacyCheck) {
      toast({
        title: "กรุณายอมรับทั้งสองข้อ",
        description: "ต้องยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวก่อนใช้งาน",
        variant: "destructive",
      })
      return
    }
    if (!user) return
    setLoading(true)
    try {
      await acceptTerms(user.uid)
      markTermsAccepted()
      refreshUserProfile().catch(() => {})
      toast({
        title: "ยอมรับเรียบร้อย",
        description: "คุณสามารถใช้งานแพลตฟอร์มได้แล้ว",
      })
      router.replace("/dashboard")
    } catch (error) {
      console.error("Accept terms error:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการยอมรับได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user || termsAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-primary/5 via-background to-background p-4 relative overflow-hidden">
      {show3D && <ThreeBackground />}
      <div className="w-full max-w-lg relative z-10">
        <Card className="shadow-soft border-border/60">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="flex justify-center">
              <Logo size="lg" showIcon={true} href={undefined} />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <ShieldCheck className="h-7 w-7 text-primary" />
                ยอมรับข้อกำหนดและนโยบาย
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                ก่อนใช้งาน กรุณาอ่านและยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-start gap-3 rounded-lg border border-border/60 p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                  <Checkbox
                    checked={acceptTermsCheck}
                    onCheckedChange={(v) => setAcceptTermsCheck(!!v)}
                    className="mt-0.5"
                  />
                  <span className="text-sm leading-relaxed">
                    ข้าพเจ้ายอมรับ{" "}
                    <Link href="/terms?standalone=1" target="_blank" className="font-medium text-primary hover:underline">
                      ข้อกำหนดและเงื่อนไขการใช้งาน
                    </Link>{" "}
                    ของ RMU-Campus X
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-lg border border-border/60 p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                  <Checkbox
                    checked={acceptPrivacyCheck}
                    onCheckedChange={(v) => setAcceptPrivacyCheck(!!v)}
                    className="mt-0.5"
                  />
                  <span className="text-sm leading-relaxed">
                    ข้าพเจ้ายอมรับ{" "}
                    <Link href="/privacy?standalone=1" target="_blank" className="font-medium text-primary hover:underline">
                      นโยบายความเป็นส่วนตัว
                    </Link>{" "}
                    และการเก็บรวบรวมข้อมูลตามที่ระบุ
                  </span>
                </label>
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <FileText className="h-4 w-4 shrink-0" />
                <span>
                  อ่านฉบับเต็มได้ที่ หน้า{" "}
                  <Link href="/terms?standalone=1" target="_blank" className="text-primary hover:underline">ข้อกำหนดการใช้งาน</Link>
                  {" "}และ{" "}
                  <Link href="/privacy?standalone=1" target="_blank" className="text-primary hover:underline">นโยบายความเป็นส่วนตัว</Link>
                </span>
              </div>
              <Button
                type="submit"
                className="w-full h-11 font-medium"
                disabled={loading || !acceptTermsCheck || !acceptPrivacyCheck}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ยอมรับและใช้งาน"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          มหาวิทยาลัยราชภัฏมหาสารคาม
        </p>
      </div>
    </div>
  )
}
