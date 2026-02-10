"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { CursorReactiveBackground } from "@/components/cursor-reactive-background"
import { Logo } from "@/components/logo"
import { useI18n } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { loginUser } from "@/lib/auth"

const REMEMBER_KEY = "rmu-login-remember"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { tt } = useI18n()

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(REMEMBER_KEY)
      if (saved !== null) setRememberMe(saved === "true")
    } catch {
      // ignore
    }
  }, [])

  const handleRememberChange = (checked: boolean) => {
    setRememberMe(checked)
    try {
      localStorage.setItem(REMEMBER_KEY, String(checked))
    } catch {
      // ignore
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await loginUser(email, password, rememberMe)
      toast({
        title: tt("เข้าสู่ระบบสำเร็จ", "Signed in successfully"),
        description: tt("ยินดีต้อนรับ", "Welcome back"),
      })
      router.push("/dashboard")
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string }
      let title = tt("เข้าสู่ระบบไม่สำเร็จ", "Sign in failed")
      let description = tt("อีเมลหรือรหัสผ่านไม่ถูกต้อง", "Invalid email or password")

      switch (firebaseError.code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          description = tt("อีเมลหรือรหัสผ่านไม่ถูกต้อง", "Invalid email or password")
          break
        case "auth/too-many-requests":
          title = tt("ลองมากเกินไป", "Too many attempts")
          description = tt("กรุณารอสักครู่แล้วลองใหม่อีกครั้ง", "Please wait and try again")
          break
        case "auth/user-disabled":
          title = tt("บัญชีถูกระงับ", "Account disabled")
          description = tt(
            "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
            "This account is disabled. Please contact support."
          )
          break
        default:
          if (
            firebaseError.message?.includes("verify your email") ||
            firebaseError.message?.includes("กรุณายืนยันอีเมล")
          ) {
            title = tt("กรุณายืนยันอีเมล", "Please verify your email")
            description = tt(
              "เราได้ส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว",
              "A verification email has been sent to your address."
            )
          } else if (
            firebaseError.message?.includes("Ghost Account") ||
            firebaseError.message?.includes("BANNED")
          ) {
            title = tt("เข้าใช้งานไม่ได้", "Access denied")
            description =
              firebaseError.message ||
              tt("บัญชีนี้ถูกระงับการใช้งาน", "This account is not available")
          }
      }

      toast({
        title,
        description,
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
              <CardTitle className="text-2xl font-bold">
                {tt("ยินดีต้อนรับ", "Welcome")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {tt("เข้าสู่ระบบ RMU-Campus X", "Sign in to RMU-Campus X")}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <form
              onSubmit={handleSubmit}
              className="space-y-4 mt-4"
              autoComplete={rememberMe ? "on" : "off"}
            >
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {tt("อีเมล", "Email")}
                </Label>
                <Input
                  id="email"
                  name={rememberMe ? "email" : undefined}
                  type="email"
                  placeholder="email@rmu.ac.th"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                  autoComplete={rememberMe ? "email" : "off"}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    {tt("รหัสผ่าน", "Password")}
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {tt("ลืมรหัสผ่าน?", "Forgot password?")}
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name={rememberMe ? "password" : undefined}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                    autoComplete={rememberMe ? "current-password" : "off"}
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => handleRememberChange(checked === true)}
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {tt("จดจำฉัน", "Remember me")}
                </label>
              </div>

              <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tt("กำลังเข้าสู่ระบบ...", "Signing in...")}
                  </>
                ) : (
                  tt("เข้าสู่ระบบ", "Sign in")
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {tt("ยังไม่มีบัญชี?", "Don't have an account?")}{" "}
                <Link
                  href="/register"
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {tt("สมัครสมาชิก", "Register")}
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
