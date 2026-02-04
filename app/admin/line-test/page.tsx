"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { authFetchJson } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import type { LucideIcon } from "lucide-react"
import {
  Loader2,
  MessageSquare,
  Package,
  AlertTriangle,
  UserCheck,
  Bell,
  Send,
  Link2,
  RefreshCw,
  FileText,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { LineTestType } from "@/app/api/admin/line-test/route"

const TEST_BUTTONS: { type: LineTestType; label: string; icon: LucideIcon; group: string }[] = [
  { type: "exchange_request", label: "มีคนขอรับของ", icon: Package, group: "การแลกเปลี่ยน" },
  { type: "exchange_status", label: "อัปเดตสถานะการแลกเปลี่ยน", icon: RefreshCw, group: "การแลกเปลี่ยน" },
  { type: "exchange_completed", label: "แลกเปลี่ยนสำเร็จ", icon: UserCheck, group: "การแลกเปลี่ยน" },
  { type: "admin_report", label: "รายงานใหม่ (แอดมิน)", icon: AlertTriangle, group: "แจ้งเตือนแอดมิน" },
  { type: "admin_support_ticket", label: "Support Ticket ใหม่", icon: FileText, group: "แจ้งเตือนแอดมิน" },
  { type: "item_posted", label: "โพสต์สำเร็จ", icon: Package, group: "โพสต์" },
  { type: "item_updated", label: "แก้ไขโพสต์สำเร็จ", icon: Package, group: "โพสต์" },
  { type: "item_deleted", label: "ลบโพสต์สำเร็จ", icon: Package, group: "โพสต์" },
  { type: "chat_message", label: "ข้อความแชทใหม่", icon: MessageCircle, group: "แชท" },
  { type: "user_reported", label: "ผู้ใช้ถูกรายงาน", icon: AlertTriangle, group: "ผู้ใช้" },
  { type: "user_warning", label: "คำเตือนผู้ใช้", icon: Bell, group: "ผู้ใช้" },
  { type: "account_status", label: "อัปเดตสถานะบัญชี", icon: UserCheck, group: "ผู้ใช้" },
  { type: "item_edited_by_admin", label: "แอดมินแก้ไขโพส", icon: Send, group: "ผู้ใช้" },
  { type: "link_success", label: "เชื่อมบัญชี LINE สำเร็จ", icon: Link2, group: "บัญชี" },
]

export default function AdminLineTestPage() {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<{ lineUserId?: string } | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [sending, setSending] = useState<LineTestType | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    if (!isAdmin) {
      toast({
        title: "ไม่มีสิทธิ์เข้าถึง",
        description: "คุณไม่มีสิทธิ์ใช้งานหน้าผู้ดูแลระบบ",
        variant: "destructive",
      })
      router.push("/dashboard")
    }
  }, [authLoading, user, isAdmin, router, toast])

  useEffect(() => {
    if (!user || !isAdmin) return
    let cancelled = false
    setProfileLoading(true)
    authFetchJson<{ user?: Record<string, unknown> }>("/api/users/me", { method: "GET" })
      .then((res) => {
        if (cancelled) return
        const u = res.data?.user as { lineUserId?: string } | undefined
        setProfile(u ? { lineUserId: u.lineUserId as string | undefined } : null)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, isAdmin])

  const sendTest = async (type: LineTestType) => {
    setSending(type)
    try {
      const res = await authFetchJson<{ message?: string }>("/api/admin/line-test", {
        method: "POST",
        body: { type },
      })
      toast({
        title: "ส่งแล้ว",
        description: res.data?.message ?? "ข้อความทดสอบส่งไปที่ LINE ของคุณแล้ว",
      })
    } catch (e) {
      toast({
        title: "ส่งไม่สำเร็จ",
        description: e instanceof Error ? e.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setSending(null)
    }
  }

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const groups = Array.from(new Set(TEST_BUTTONS.map((b) => b.group)))

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-4xl mx-auto px-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            ห้องทดสอบ LINE Bot
          </h1>
          <p className="text-muted-foreground mt-1">
            ส่งข้อความทดสอบแจ้งเตือนไปที่ LINE ของแอดมินที่ล็อกอิน (บัญชีที่เชื่อมกับ LINE)
          </p>
        </div>

        {profileLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !profile?.lineUserId ? (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-5 w-5" />
                ยังไม่ได้เชื่อมบัญชี LINE
              </CardTitle>
              <CardDescription>
                เพื่อรับข้อความทดสอบ คุณต้องเชื่อมบัญชี LINE กับบัญชีแอดมินก่อน
                ไปที่หน้าโปรไฟล์ → เชื่อมบัญชี LINE (หรือสแกน QR / พิมพ์ &quot;เชื่อมบัญชี&quot; ในแชท LINE Official Account)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <a href="/profile">ไปที่โปรไฟล์</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>ประเภทการแจ้งเตือน</CardTitle>
              <CardDescription>
                กดปุ่มด้านล่างเพื่อส่งข้อความทดสอบไปที่ LINE ของคุณ (บัญชีที่เชื่อมแล้ว)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {groups.map((group) => (
                <div key={group}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {group}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {TEST_BUTTONS.filter((b) => b.group === group).map(({ type, label, icon: Icon }) => (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        disabled={!!sending}
                        onClick={() => sendTest(type)}
                      >
                        {sending === type ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Icon className="h-4 w-4 mr-2" />
                        )}
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
