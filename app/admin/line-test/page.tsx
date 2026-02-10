"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { useI18n } from "@/components/language-provider"
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

const TEST_BUTTONS: {
  type: LineTestType
  label: { th: string; en: string }
  icon: LucideIcon
  group: { th: string; en: string }
}[] = [
  { type: "exchange_request", label: { th: "มีคนขอรับของ", en: "New exchange request" }, icon: Package, group: { th: "การแลกเปลี่ยน", en: "Exchange" } },
  { type: "exchange_status", label: { th: "อัปเดตสถานะการแลกเปลี่ยน", en: "Exchange status update" }, icon: RefreshCw, group: { th: "การแลกเปลี่ยน", en: "Exchange" } },
  { type: "exchange_completed", label: { th: "แลกเปลี่ยนสำเร็จ", en: "Exchange completed" }, icon: UserCheck, group: { th: "การแลกเปลี่ยน", en: "Exchange" } },
  { type: "admin_report", label: { th: "รายงานใหม่ (แอดมิน)", en: "New report (admin)" }, icon: AlertTriangle, group: { th: "แจ้งเตือนแอดมิน", en: "Admin alerts" } },
  { type: "admin_support_ticket", label: { th: "Support Ticket ใหม่", en: "New support ticket" }, icon: FileText, group: { th: "แจ้งเตือนแอดมิน", en: "Admin alerts" } },
  { type: "item_posted", label: { th: "โพสต์สำเร็จ", en: "Item posted" }, icon: Package, group: { th: "โพสต์", en: "Items" } },
  { type: "item_updated", label: { th: "แก้ไขโพสต์สำเร็จ", en: "Item updated" }, icon: Package, group: { th: "โพสต์", en: "Items" } },
  { type: "item_deleted", label: { th: "ลบโพสต์สำเร็จ", en: "Item deleted" }, icon: Package, group: { th: "โพสต์", en: "Items" } },
  { type: "chat_message", label: { th: "ข้อความแชทใหม่", en: "New chat message" }, icon: MessageCircle, group: { th: "แชท", en: "Chat" } },
  { type: "user_reported", label: { th: "ผู้ใช้ถูกรายงาน", en: "User reported" }, icon: AlertTriangle, group: { th: "ผู้ใช้", en: "Users" } },
  { type: "user_warning", label: { th: "คำเตือนผู้ใช้", en: "User warning" }, icon: Bell, group: { th: "ผู้ใช้", en: "Users" } },
  { type: "account_status", label: { th: "อัปเดตสถานะบัญชี", en: "Account status update" }, icon: UserCheck, group: { th: "ผู้ใช้", en: "Users" } },
  { type: "item_edited_by_admin", label: { th: "แอดมินแก้ไขโพส", en: "Admin edited item" }, icon: Send, group: { th: "ผู้ใช้", en: "Users" } },
  { type: "link_success", label: { th: "เชื่อมบัญชี LINE สำเร็จ", en: "LINE linked successfully" }, icon: Link2, group: { th: "บัญชี", en: "Account" } },
]

export default function AdminLineTestPage() {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const { locale, tt } = useI18n()
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
        title: tt("ไม่มีสิทธิ์เข้าถึง", "Access denied"),
        description: tt("คุณไม่มีสิทธิ์ใช้งานหน้าผู้ดูแลระบบ", "You do not have permission to access admin pages."),
        variant: "destructive",
      })
      router.push("/dashboard")
    }
  }, [authLoading, user, isAdmin, router, toast, tt])

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
        title: tt("ส่งแล้ว", "Sent"),
        description: res.data?.message ?? tt("ข้อความทดสอบส่งไปที่ LINE ของคุณแล้ว", "A test message was sent to your LINE."),
      })
    } catch (e) {
      toast({
        title: tt("ส่งไม่สำเร็จ", "Send failed"),
        description: e instanceof Error ? e.message : tt("เกิดข้อผิดพลาด", "Error"),
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

  const groups = Array.from(new Set(TEST_BUTTONS.map((b) => (locale === "th" ? b.group.th : b.group.en))))

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-4xl mx-auto px-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            {tt("ห้องทดสอบ LINE Bot", "LINE Bot test center")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {tt("ส่งข้อความทดสอบแจ้งเตือนไปที่ LINE ของแอดมินที่ล็อกอิน (บัญชีที่เชื่อมกับ LINE)", "Send test notifications to the logged-in admin's linked LINE account.")}
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
                {tt("ยังไม่ได้เชื่อมบัญชี LINE", "LINE account not linked")}
              </CardTitle>
              <CardDescription>
                {tt(
                  "เพื่อรับข้อความทดสอบ คุณต้องเชื่อมบัญชี LINE กับบัญชีแอดมินก่อน ไปที่หน้าโปรไฟล์ → เชื่อมบัญชี LINE (หรือสแกน QR / พิมพ์ \"เชื่อมบัญชี\" ในแชท LINE Official Account)",
                  "To receive test messages, link your LINE account first via Profile → LINE settings (or scan QR / type \"link\" in LINE OA chat)."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/profile">{tt("ไปที่โปรไฟล์", "Go to profile")}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{tt("ประเภทการแจ้งเตือน", "Notification types")}</CardTitle>
              <CardDescription>
                {tt("กดปุ่มด้านล่างเพื่อส่งข้อความทดสอบไปที่ LINE ของคุณ (บัญชีที่เชื่อมแล้ว)", "Use the buttons below to send test messages to your linked LINE account.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {groups.map((group) => (
                <div key={group}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {group}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {TEST_BUTTONS
                      .filter((b) => (locale === "th" ? b.group.th : b.group.en) === group)
                      .map(({ type, label, icon: Icon }) => (
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
                        {locale === "th" ? label.th : label.en}
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
