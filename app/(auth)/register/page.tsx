"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { registerUser } from "@/lib/auth"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Info, Eye, EyeOff } from "lucide-react"
import { Logo } from "@/components/logo"
import { CursorReactiveBackground } from "@/components/cursor-reactive-background"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use strict schema validation
    const { registrationSchema } = await import("@/lib/schemas")
    const validation = registrationSchema.safeParse({ email, password, confirmPassword })

    if (!validation.success) {
      toast({
        title: "ข้อมูลไม่ถูกต้อง",
        description: validation.error.errors[0]?.message || "ข้อมูลไม่ถูกต้อง",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await registerUser(email, password)
      toast({
        title: "สมัครสมาชิกสำเร็จ",
        description: "กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี",
      })
      router.push("/verify-email")
    } catch (error: any) {
      // Handle specific Firebase auth errors
      let errorTitle = "เกิดข้อผิดพลาด";
      let errorDesc = error.message;
      if (error.code === "auth/email-already-in-use") {
        errorTitle = "อีเมลซ้ำ";
        errorDesc = "อีเมลนี้ได้ถูกใช้แล้ว โปรดใช้อีเมลอื่นหรือเข้าสู่ระบบ";
      } else if (error.code === "auth/invalid-email") {
        errorTitle = "อีเมลไม่ถูกต้อง";
        errorDesc = "กรุณาตรวจสอบรูปแบบอีเมล";
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
            {/* Logo */}
            <div className="flex justify-center">
              <Logo size="lg" showIcon={true} href={undefined} />
            </div>
            
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">สมัครสมาชิก</CardTitle>
              <CardDescription className="text-muted-foreground">
                สร้างบัญชีใหม่สำหรับ RMU-Campus X
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  อีเมล RMU
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
                  <span>ใช้ได้เฉพาะอีเมล @rmu.ac.th (นักศึกษาหรือบุคลากร)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  รหัสผ่าน
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  ยืนยันรหัสผ่าน
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
                    className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showConfirmPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังสมัคร...
                  </>
                ) : (
                  "สมัครสมาชิก"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                มีบัญชีอยู่แล้ว?{" "}
                <Link 
                  href="/login" 
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  เข้าสู่ระบบ
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer text */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          มหาวิทยาลัยราชภัฏมหาสารคาม
        </p>
      </div>
    </div>
  )
}
