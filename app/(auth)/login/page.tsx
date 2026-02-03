"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { loginUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { Logo } from "@/components/logo"
import { BounceWrapper } from "@/components/ui/bounce-wrapper"
import dynamic from "next/dynamic"

// Dynamic import for Three.js - loads only when needed
const ThreeBackground = dynamic(
  () => import("@/components/three-background").then((mod) => mod.ThreeBackground),
  { ssr: false, loading: () => null }
)

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const REMEMBER_KEY = "rmu-login-remember"
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [show3D, setShow3D] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // โหลดค่า "จดจำฉัน" จาก localStorage หลัง mount บน client (ครั้งเดียว) — ไม่ใช้ effect ที่เขียน localStorage ตอน mount เพื่อกันเขียน "false" ทับ
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(REMEMBER_KEY)
      if (saved !== null) setRememberMe(saved === "true")
    } catch {
      // ignore
    }
  }, [])

  // บันทึกค่าจดจำเมื่อผู้ใช้เปลี่ยนติ๊กเท่านั้น (ไม่เขียนตอนโหลด)
  const handleRememberChange = (checked: boolean) => {
    setRememberMe(checked)
    try {
      localStorage.setItem(REMEMBER_KEY, String(checked))
    } catch {
      // ignore
    }
  }

  // Lazy load 3D background
  useEffect(() => {
    const timer = setTimeout(() => setShow3D(true), 800)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await loginUser(email, password, rememberMe)
      toast({
        title: "เข้าสู่ระบบสำเร็จ",
        description: "ยินดีต้อนรับ",
      })
      router.push("/dashboard")
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string }
      const variant: "default" | "destructive" = "destructive"
      let title = "เข้าสู่ระบบไม่สำเร็จ"
      let description = "อีเมลหรือรหัสผ่านไม่ถูกต้อง"

      // Handle specific errors - prioritize error codes over message matching
      switch (firebaseError.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          description = "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          break
        case 'auth/too-many-requests':
          title = "ลองมากเกินไป"
          description = "กรุณารอสักครู่แล้วลองใหม่อีกครั้ง"
          break
        case 'auth/user-disabled':
          title = "บัญชีถูกระงับ"
          description = "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
          break
        default:
          // Fallback to message matching for custom backend errors
          if (firebaseError.message?.includes("verify your email") || firebaseError.message?.includes("กรุณายืนยันอีเมล")) {
            title = "กรุณายืนยันอีเมล"
            description = "เราได้ส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว"
          } else if (firebaseError.message?.includes("Ghost Account") || firebaseError.message?.includes("BANNED")) {
            title = "เข้าใช้งานไม่ได้"
            description = firebaseError.message || "บัญชีนี้ถูกระงับการใช้งาน"
          }
      }

      toast({
        title,
        description,
        variant,
      })
      
      // Only redirect for specific cases if needed, otherwise let them retry.
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-primary/5 via-background to-background p-4 relative overflow-hidden">
      {/* 3D Background - lazy loaded */}
      {show3D && <ThreeBackground />}
      
      <BounceWrapper variant="bounce-in" className="w-full max-w-md relative z-10">
        <Card className="shadow-soft border-border/60">
          <CardHeader className="text-center space-y-4 pb-2">
            {/* Logo */}
            <div className="flex justify-center">
              <Logo size="lg" showIcon={true} href={undefined} />
            </div>
            
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">ยินดีต้อนรับ</CardTitle>
              <CardDescription className="text-muted-foreground">
                เข้าสู่ระบบ RMU-Campus X
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
              autoComplete={rememberMe ? "on" : "off"}
            >
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  อีเมล
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
                    รหัสผ่าน
                  </Label>
                  <Link 
                    href="/forgot-password" 
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    ลืมรหัสผ่าน?
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
                    className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
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
                  จดจำฉัน
                </label>
              </div>

              <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  "เข้าสู่ระบบ"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                ยังไม่มีบัญชี?{" "}
                <Link 
                  href="/register" 
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  สมัครสมาชิก
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer text */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          มหาวิทยาลัยราชภัฏมหาสารคาม
        </p>
      </BounceWrapper>
    </div>
  )
}
