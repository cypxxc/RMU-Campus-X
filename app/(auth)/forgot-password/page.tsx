"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Logo } from "@/components/logo"
import { useI18n } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { resetPassword } from "@/lib/auth"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { toast } = useToast()
  const { tt } = useI18n()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await resetPassword(email)
      setIsSubmitted(true)
      toast({
        title: tt("ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว", "Password reset email sent"),
        description: tt(
          "กรุณาตรวจสอบอีเมลของคุณเพื่อตั้งรหัสผ่านใหม่",
          "Please check your email to set a new password."
        ),
      })
    } catch {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: tt(
          "ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้ กรุณาตรวจสอบอีเมลอีกครั้ง",
          "Unable to send reset email. Please verify your email and try again."
        ),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-primary/5 via-background to-background p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <Card className="shadow-soft border-border/60">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="flex justify-center">
              <Logo size="lg" showIcon href={undefined} />
            </div>

            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                {tt("ลืมรหัสผ่าน", "Forgot password")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {tt(
                  "กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่",
                  "Enter your email to receive a reset link."
                )}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    {tt("อีเมล", "Email")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@rmu.ac.th"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {tt("กำลังดำเนินการ...", "Processing...")}
                    </>
                  ) : (
                    tt("ส่งลิงก์รีเซ็ตรหัสผ่าน", "Send reset link")
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="bg-primary/10 text-primary rounded-lg p-4 text-sm">
                  {tt("เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปที่ ", "We sent a reset link to ")}
                  <strong>{email}</strong>{" "}
                  {tt(
                    "แล้ว กรุณาตรวจสอบกล่องจดหมายของคุณ (รวมถึงโฟลเดอร์ขยะ)",
                    ". Please check your inbox (including spam/junk folder)."
                  )}
                </div>
                <Button variant="outline" className="w-full h-11" onClick={() => setIsSubmitted(false)}>
                  {tt("ลองใหม่อีกครั้ง", "Try again")}
                </Button>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tt("กลับไปหน้าเข้าสู่ระบบ", "Back to sign in")}
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {tt("มหาวิทยาลัยราชภัฏมหาสารคาม", "Rajabhat Maha Sarakham University")}
        </p>
      </div>
    </div>
  )
}
