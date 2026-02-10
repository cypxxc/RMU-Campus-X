"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, Loader2, ShieldCheck } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useI18n } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { acceptTerms } from "@/lib/db/users-profile"

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
  const { tt } = useI18n()

  useEffect(() => {
    const timer = setTimeout(() => setShow3D(true), 800)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    if (termsAccepted) {
      router.push("/dashboard")
    }
  }, [authLoading, router, termsAccepted, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptTermsCheck || !acceptPrivacyCheck) {
      toast({
        title: tt("กรุณายอมรับทั้งสองข้อ", "Please accept both policies"),
        description: tt(
          "ต้องยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวก่อนใช้งาน",
          "You must accept the terms and privacy policy before using the platform."
        ),
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
        title: tt("ยอมรับเรียบร้อย", "Accepted"),
        description: tt("คุณสามารถใช้งานแพลตฟอร์มได้แล้ว", "You can now use the platform."),
      })
      router.replace("/dashboard")
    } catch {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: tt(
          "ไม่สามารถบันทึกการยอมรับได้ กรุณาลองใหม่อีกครั้ง",
          "Unable to save your consent. Please try again."
        ),
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
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <ShieldCheck className="h-7 w-7 text-primary" />
                {tt("ยอมรับข้อกำหนดและนโยบาย", "Terms and privacy consent")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {tt(
                  "ก่อนใช้งาน กรุณาอ่านและยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว",
                  "Please review and accept the terms and privacy policy before continuing."
                )}
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
                    {tt("ข้าพเจ้ายอมรับ ", "I accept the ")}
                    <Link
                      href="/terms?standalone=1"
                      target="_blank"
                      className="font-medium text-primary hover:underline"
                    >
                      {tt("ข้อกำหนดและเงื่อนไขการใช้งาน", "terms of use")}
                    </Link>{" "}
                    {tt("ของ RMU-Campus X", "for RMU-Campus X")}
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-lg border border-border/60 p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                  <Checkbox
                    checked={acceptPrivacyCheck}
                    onCheckedChange={(v) => setAcceptPrivacyCheck(!!v)}
                    className="mt-0.5"
                  />
                  <span className="text-sm leading-relaxed">
                    {tt("ข้าพเจ้ายอมรับ ", "I accept the ")}
                    <Link
                      href="/privacy?standalone=1"
                      target="_blank"
                      className="font-medium text-primary hover:underline"
                    >
                      {tt("นโยบายความเป็นส่วนตัว", "privacy policy")}
                    </Link>{" "}
                    {tt("และการเก็บรวบรวมข้อมูลตามที่ระบุ", "and related data processing terms.")}
                  </span>
                </label>
              </div>

              <div className="flex gap-2 text-xs text-muted-foreground">
                <FileText className="h-4 w-4 shrink-0" />
                <span>
                  {tt("อ่านฉบับเต็มได้ที่หน้า ", "Read full documents at ")}
                  <Link href="/terms?standalone=1" target="_blank" className="text-primary hover:underline">
                    {tt("ข้อกำหนดการใช้งาน", "Terms")}
                  </Link>{" "}
                  {tt("และ", "and")}{" "}
                  <Link href="/privacy?standalone=1" target="_blank" className="text-primary hover:underline">
                    {tt("นโยบายความเป็นส่วนตัว", "Privacy")}
                  </Link>
                </span>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-medium"
                disabled={loading || !acceptTermsCheck || !acceptPrivacyCheck}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tt("ยอมรับและใช้งาน", "Accept and continue")}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {tt("มหาวิทยาลัยราชภัฏมหาสารคาม", "Rajabhat Maha Sarakham University")}
        </p>
      </div>
    </div>
  )
}
