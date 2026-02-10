"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { checkIsAdmin } from "@/lib/services/client-firestore"
import { useAuth } from "@/components/auth-provider"
import { useI18n } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Package, Users, RefreshCw, MessageSquare, AlertTriangle, History, Database, Trash2, UserX } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AdminDataPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
  const [cleanupExchangesLoading, setCleanupExchangesLoading] = useState(false)
  const [cleanupOrphansLoading, setCleanupOrphansLoading] = useState(false)

  const { user, loading: authLoading } = useAuth()
  const { tt } = useI18n()
  const router = useRouter()
  const { toast } = useToast()
  const managementLinks = [
    {
      href: "/admin/items",
      label: tt("จัดการโพส", "Manage items"),
      icon: Package,
      desc: tt("ดู แก้ไข ลบโพส", "View, edit, and delete items"),
    },
    {
      href: "/admin/users",
      label: tt("จัดการผู้ใช้", "Manage users"),
      icon: Users,
      desc: tt("ดู ผู้ใช้ ออกคำเตือน ระงับ แบน ลบ", "Review users and apply admin actions"),
    },
    {
      href: "/admin/exchanges",
      label: tt("จัดการการแลกเปลี่ยน", "Manage exchanges"),
      icon: RefreshCw,
      desc: tt("ดู ลบรายการการแลกเปลี่ยน", "View and remove exchanges"),
    },
    {
      href: "/admin/reports",
      label: tt("รายงานความไม่เหมาะสม", "Reports"),
      icon: AlertTriangle,
      desc: tt("ตรวจสอบและดำเนินการรายงาน", "Review and process reports"),
    },
    {
      href: "/admin/support",
      label: tt("จัดการคำร้อง", "Manage support"),
      icon: MessageSquare,
      desc: tt("ตอบกลับและเปลี่ยนสถานะคำร้อง", "Reply and update support status"),
    },
    {
      href: "/admin/logs",
      label: tt("ประวัติกิจกรรม", "Activity logs"),
      icon: History,
      desc: tt("ดูบันทึกการดำเนินการของแอดมิน", "Review admin activity history"),
    },
  ]

  const checkAdmin = useCallback(async () => {
    if (!user) return
    try {
      const isAdmin = await checkIsAdmin(user.email ?? undefined)
      if (!isAdmin) {
        toast({ title: tt("ไม่มีสิทธิ์เข้าถึง", "Access denied"), variant: "destructive" })
        router.push("/dashboard")
        return
      }
      setIsAdmin(true)
    } catch {
      router.push("/dashboard")
    } finally {
      setChecking(false)
    }
  }, [router, toast, tt, user])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    checkAdmin()
  }, [authLoading, checkAdmin, router, user])

  const handleCleanupOldExchanges = async () => {
    if (!user || cleanupExchangesLoading) return
    setCleanupExchangesLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/admin/exchanges/cleanup-old-completed?olderThanDays=0", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error?.message || tt("ลบไม่สำเร็จ", "Deletion failed"))
      const deleted = json?.data?.deleted ?? 0
      toast({
        title: deleted > 0 ? tt("ลบข้อมูลเก่าแล้ว", "Cleanup completed") : tt("ไม่มีรายการที่ต้องลบ", "No records to clean"),
        description: deleted > 0 ? tt(`ลบการแลกเปลี่ยนที่สำเร็จแล้ว ${deleted} รายการ`, `Deleted ${deleted} completed exchange records`) : undefined,
      })
    } catch (e) {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: e instanceof Error ? e.message : tt("ลบไม่สำเร็จ", "Deletion failed"),
        variant: "destructive",
      })
    } finally {
      setCleanupExchangesLoading(false)
    }
  }

  const handleCleanupOrphans = async () => {
    if (!user || cleanupOrphansLoading) return
    setCleanupOrphansLoading(true)
    try {
      const token = await user.getIdToken()
      const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
      const res = await fetch(`${baseUrl}/api/admin/users/cleanup-orphans`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error?.message || tt("ลบไม่สำเร็จ", "Cleanup failed"))
      const deleted = json?.data?.deleted ?? 0
      if (deleted > 0) {
        toast({
          title: tt("อัปเดตรายชื่อผู้ใช้แล้ว", "User list updated"),
          description: tt(`ลบข้อมูลบัญชีที่ไม่มีในระบบแล้ว ${deleted} รายการ`, `Removed ${deleted} orphan user records`),
        })
      } else {
        toast({ title: tt("ไม่มีข้อมูลผีที่ต้องลบ", "No orphan users found") })
      }
    } catch (e) {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: e instanceof Error ? e.message : tt("ลบไม่สำเร็จ", "Cleanup failed"),
        variant: "destructive",
      })
    } finally {
      setCleanupOrphansLoading(false)
    }
  }

  if (checking || !isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-4xl mx-auto px-6 space-y-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8 text-primary" />
              {tt("จัดการข้อมูล", "Data management")}
            </h1>
            <p className="text-muted-foreground">
              {tt("จัดการข้อมูลทั้งหมดบนเว็บ ไม่ต้องเข้า Firestore โดยตรง", "Manage system data from web admin tools without opening Firestore directly.")}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tt("หน้าจัดการหลัก", "Main admin sections")}</CardTitle>
            <p className="text-sm text-muted-foreground">{tt("ไปยังหน้าจัดการแต่ละประเภท", "Go to each management area")}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {managementLinks.map(({ href, label, icon: Icon, desc }) => (
                <Link key={href} href={href}>
                  <Card className="border hover:bg-muted/50 transition-colors cursor-pointer h-full">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base">{tt("บำรุงรักษา", "Maintenance")}</CardTitle>
            <p className="text-sm text-muted-foreground">{tt("ลบข้อมูลเก่าหรือข้อมูลผีที่ค้างในระบบ", "Clean old records and orphan data")}</p>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleCleanupOldExchanges}
              disabled={cleanupExchangesLoading}
            >
              {cleanupExchangesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {tt("ลบการแลกเปลี่ยนที่สำเร็จแล้ว (ข้อมูลเก่า)", "Delete completed exchanges (old records)")}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleCleanupOrphans}
              disabled={cleanupOrphansLoading}
            >
              {cleanupOrphansLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
              {tt("ลบผู้ใช้ผี (ข้อมูล Firestore ที่ไม่มีใน Auth)", "Delete orphan users (Firestore records missing in Auth)")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
