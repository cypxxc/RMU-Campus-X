"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { resetPassword } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ArrowLeft } from "lucide-react"
import { Logo } from "@/components/logo"
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await resetPassword(email)
      setIsSubmitted(true)
      toast({
        title: "ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว",
        description: "กรุณาตรวจสอบอีเมลของคุณเพื่อตั้งรหัสผ่านใหม่",
      })
    } catch {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้ กรุณาตรวจสอบอีเมลอีกครั้ง",
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
            {/* Logo */}
            <div className="flex justify-center">
              <Logo size="lg" showIcon={true} href={undefined} />
            </div>
            
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">ลืมรหัสผ่าน</CardTitle>
              <CardDescription className="text-muted-foreground">
                กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    อีเมล
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
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    "ส่งลิงก์รีเซ็ตรหัสผ่าน"
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="bg-primary/10 text-primary rounded-lg p-4 text-sm">
                  เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปที่ <strong>{email}</strong> แล้ว
                  กรุณาตรวจสอบกล่องจดหมายของคุณ (รวมถึงโฟลเดอร์ขยะ)
                </div>
                <Button 
                  variant="outline" 
                  className="w-full h-11"
                  onClick={() => setIsSubmitted(false)}
                >
                  ลองใหม่อีกครั้ง
                </Button>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link 
                href="/login" 
                className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
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
