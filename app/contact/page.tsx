"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, MapPin, MessageSquare, Clock, Globe, ChevronLeft, Send, Loader2, LogIn } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

export default function ContactPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  })

  // Pre-fill email if logged in (for display) - actual submission uses auth user
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        description: "คุณต้องเข้าสู่ระบบก่อนส่งข้อความติดต่อ",
        variant: "destructive"
      })
      router.push("/login?redirect=/contact")
      return
    }

    if (!formData.subject.trim() || !formData.message.trim()) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกหัวข้อและรายละเอียดให้ครบถ้วน",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: formData.subject.trim(),
          category: "general", // Default category for contact form
          description: formData.message.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "ไม่สามารถส่งข้อความได้")
      }

      toast({
        title: "ส่งข้อความเรียบร้อยแล้ว",
        description: "ทีมงานได้รับเรื่องของคุณแล้ว และจะติดต่อกลับโดยเร็วที่สุด",
      })

      setFormData({ subject: "", message: "" })
      // Optional: Redirect to support tickets list
      // router.push("/support")
    } catch (error) {
      console.error("Error submitting contact form:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Navigation */}
        <div>
          <Link href="/">
            <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all">
              <ChevronLeft className="h-4 w-4" />
              กลับสู่หน้าหลัก
            </Button>
          </Link>
        </div>

        {/* Main Content */}
        <Card className="border-none shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
          <div className="grid md:grid-cols-2 h-full">
            
            {/* Left Column: Contact Info */}
            <div className="bg-primary/5 dark:bg-primary/10 p-8 md:p-10 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-6 text-primary">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-bold bg-linear-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-2">
                  ติดต่อเรา
                </h2>
                <p className="text-muted-foreground mb-8">
                  มีคำถาม ข้อเสนอแนะ หรือพบปัญหาการใช้งาน? <br/>
                  ทีมงานพร้อมดูแลและช่วยเหลือคุณ
                </p>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div className="text-sm">
                      <strong className="block font-medium mb-1">ที่อยู่</strong>
                      <span className="text-muted-foreground">
                        มหาวิทยาลัยราชภัฏมหาสารคาม <br/>
                        80 ถนนนครสวรรค์ ตำบลตลาด <br/>
                        อำเภอเมือง จังหวัดมหาสารคาม 44000
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div className="text-sm">
                      <strong className="block font-medium mb-1">อีเมล</strong>
                      <a href="mailto:contact@rmu.ac.th" className="text-muted-foreground hover:text-primary transition-colors">
                        contact@rmu.ac.th
                      </a>
                    </div>
                  </div>

                   <div className="flex items-start gap-4">
                    <Globe className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div className="text-sm">
                      <strong className="block font-medium mb-1">เว็บไซต์</strong>
                      <a href="https://rmu.ac.th" target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                        www.rmu.ac.th
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Clock className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div className="text-sm">
                      <strong className="block font-medium mb-1">เวลาทำการ</strong>
                      <span className="text-muted-foreground">
                        จันทร์ - ศุกร์: 08:30 - 16:30 น.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 text-xs text-muted-foreground/60">
                &copy; 2026 RMU-Campus X.
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <div className="p-8 md:p-10 bg-card">
                <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2">ส่งข้อความถึงเรา</h3>
                    <p className="text-sm text-muted-foreground">เราจะรีบตอบกลับให้เร็วที่สุด</p>
                </div>
                
                {authLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : user ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="name">ชื่อ-สกุล</Label>
                          <Input id="name" value={user.displayName || "ผู้ใช้งาน"} disabled className="bg-muted/50" />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="email">อีเมล</Label>
                          <Input id="email" type="email" value={user.email || ""} disabled className="bg-muted/50" />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="subject">หัวข้อ <span className="text-red-500">*</span></Label>
                          <Input 
                            id="subject" 
                            placeholder="ระบุเรื่องที่ต้องการติดต่อ" 
                            value={formData.subject}
                            onChange={(e) => setFormData({...formData, subject: e.target.value})}
                            required
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="message">ข้อความ <span className="text-red-500">*</span></Label>
                          <Textarea 
                            id="message" 
                            placeholder="รายละเอียดปัญหา หรือข้อเสนอแนะ..." 
                            className="min-h-[120px]" 
                            value={formData.message}
                            onChange={(e) => setFormData({...formData, message: e.target.value})}
                            required
                          />
                      </div>
                      <Button type="submit" className="w-full gap-2 group" disabled={loading}>
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                          ส่งข้อความ
                      </Button>
                  </form>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                    <div className="p-4 bg-muted rounded-full">
                      <LogIn className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">กรุณาเข้าสู่ระบบ</h4>
                      <p className="text-sm text-muted-foreground max-w-[200px]">
                        คุณต้องเข้าสู่ระบบก่อนส่งข้อความถึงทีมงาน
                      </p>
                    </div>
                    <Link href="/login?redirect=/contact" className="w-full">
                      <Button variant="default" className="w-full">
                        เข้าสู่ระบบ
                      </Button>
                    </Link>
                  </div>
                )}
            </div>

          </div>
        </Card>
      </div>
    </div>
  )
}
