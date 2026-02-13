"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Info, Loader2 } from "lucide-react"
import { CursorReactiveBackground } from "@/components/cursor-reactive-background"
import { Logo } from "@/components/logo"
import { useI18n } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { registerUser } from "@/lib/auth"
import { registrationSchema } from "@/lib/schemas"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { tt } = useI18n()

  useEffect(() => {
    router.prefetch("/verify-email")
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = registrationSchema.safeParse({ email, password, confirmPassword })

    if (!validation.success) {
      toast({
        title: tt("ข้อมูลไม่ถูกต้อง", "Invalid input"),
        description: validation.error.errors[0]?.message || tt("ข้อมูลไม่ถูกต้อง", "Invalid input"),
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await registerUser(email, password)
      toast({
        title: tt("สมัครสมาชิกสำเร็จ", "Registration successful"),
        description: tt(
          "กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี",
          "Please check your email to verify your account."
        ),
      })
      router.push("/verify-email")
    } catch (error: unknown) {
      const authError = error as { code?: string; message?: string }
      let errorTitle = tt("เกิดข้อผิดพลาด", "Error")
      let errorDesc = authError.message || tt("ไม่สามารถสมัครสมาชิกได้", "Unable to register")

      if (authError.code === "auth/email-already-in-use") {
        errorTitle = tt("อีเมลซ้ำ", "Email already in use")
        errorDesc = tt(
          "อีเมลนี้ได้ถูกใช้แล้ว โปรดใช้อีเมลอื่นหรือเข้าสู่ระบบ",
          "This email is already used. Please use another email or sign in."
        )
      } else if (authError.code === "auth/invalid-email") {
        errorTitle = tt("อีเมลไม่ถูกต้อง", "Invalid email")
        errorDesc = tt("กรุณาตรวจสอบรูปแบบอีเมล", "Please check your email format.")
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <CursorReactiveBackground />
      <div className="w-full max-w-md relative z-10">
        <Card className="shadow-soft border-border/60">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="flex justify-center">
              <Logo size="lg" showIcon href={undefined} />
            </div>

            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">{tt("สมัครสมาชิก", "Register")}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {tt("สร้างบัญชีใหม่สำหรับ RMU-Campus X", "Create a new RMU-Campus X account")}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {tt("อีเมล RMU", "RMU email")}
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
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    {tt(
                      "ใช้ได้เฉพาะอีเมล @rmu.ac.th (นักศึกษาหรืออาจารย์)",
                      "Only @rmu.ac.th emails are allowed (students or staff)."
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {tt("รหัสผ่าน", "Password")}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-11 w-11 min-h-11 min-w-11 sm:h-11 sm:w-11 sm:min-h-11 sm:min-w-11 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">
                      {showPassword
                        ? tt("ซ่อนรหัสผ่าน", "Hide password")
                        : tt("แสดงรหัสผ่าน", "Show password")}
                    </span>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  {tt("ยืนยันรหัสผ่าน", "Confirm password")}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-11 w-11 min-h-11 min-w-11 sm:h-11 sm:w-11 sm:min-h-11 sm:min-w-11 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">
                      {showConfirmPassword
                        ? tt("ซ่อนรหัสผ่าน", "Hide password")
                        : tt("แสดงรหัสผ่าน", "Show password")}
                    </span>
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tt("กำลังสมัคร...", "Registering...")}
                  </>
                ) : (
                  tt("สมัครสมาชิก", "Register")
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {tt("มีบัญชีอยู่แล้ว?", "Already have an account?")}{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {tt("เข้าสู่ระบบ", "Sign in")}
                </Link>
              </p>
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
