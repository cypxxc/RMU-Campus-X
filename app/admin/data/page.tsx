"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { collection, query, where, getDocs } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft, Package, Users, RefreshCw, MessageSquare, AlertTriangle, History, Database, Trash2, UserX } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const MANAGEMENT_LINKS = [
  { href: "/admin/items", label: "จัดการโพส", icon: Package, desc: "ดู แก้ไข ลบโพส" },
  { href: "/admin/users", label: "จัดการผู้ใช้", icon: Users, desc: "ดู ผู้ใช้ ออกคำเตือน ระงับ แบน ลบ" },
  { href: "/admin/exchanges", label: "จัดการการแลกเปลี่ยน", icon: RefreshCw, desc: "ดู ลบรายการการแลกเปลี่ยน" },
  { href: "/admin/reports", label: "รายงานความไม่เหมาะสม", icon: AlertTriangle, desc: "ตรวจสอบและดำเนินการรายงาน" },
  { href: "/admin/support", label: "จัดการคำร้อง", icon: MessageSquare, desc: "ตอบกลับและเปลี่ยนสถานะคำร้อง" },
  { href: "/admin/logs", label: "ประวัติกิจกรรม", icon: History, desc: "ดูบันทึกการดำเนินการของแอดมิน" },
]

export default function AdminDataPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
  const [cleanupExchangesLoading, setCleanupExchangesLoading] = useState(false)
  const [cleanupOrphansLoading, setCleanupOrphansLoading] = useState(false)

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const checkAdmin = useCallback(async () => {
    if (!user) return
    try {
      const db = getFirebaseDb()
      const snapshot = await getDocs(
        query(collection(db, "admins"), where("email", "==", user.email))
      )
      if (snapshot.empty) {
        toast({ title: "ไม่มีสิทธิ์เข้าถึง", variant: "destructive" })
        router.push("/dashboard")
        return
      }
      setIsAdmin(true)
    } catch {
      router.push("/dashboard")
    } finally {
      setChecking(false)
    }
  }, [router, toast, user])

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
      if (!res.ok) throw new Error(json?.error?.message || "ลบไม่สำเร็จ")
      const deleted = json?.data?.deleted ?? 0
      toast({
        title: deleted > 0 ? "ลบข้อมูลเก่าแล้ว" : "ไม่มีรายการที่ต้องลบ",
        description: deleted > 0 ? `ลบการแลกเปลี่ยนที่สำเร็จแล้ว ${deleted} รายการ` : undefined,
      })
    } catch (e) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: e instanceof Error ? e.message : "ลบไม่สำเร็จ",
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
      if (!res.ok) throw new Error(json?.error?.message || "ลบไม่สำเร็จ")
      const deleted = json?.data?.deleted ?? 0
      if (deleted > 0) {
        toast({
          title: "อัปเดตรายชื่อผู้ใช้แล้ว",
          description: `ลบข้อมูลบัญชีที่ไม่มีในระบบแล้ว ${deleted} รายการ`,
        })
      } else {
        toast({ title: "ไม่มีข้อมูลผีที่ต้องลบ" })
      }
    } catch (e) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: e instanceof Error ? e.message : "ลบไม่สำเร็จ",
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
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => router.push("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8 text-primary" />
              จัดการข้อมูล
            </h1>
            <p className="text-muted-foreground">
              จัดการข้อมูลทั้งหมดบนเว็บ ไม่ต้องเข้า Firestore โดยตรง
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">หน้าจัดการหลัก</CardTitle>
            <p className="text-sm text-muted-foreground">ไปยังหน้าจัดการแต่ละประเภท</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MANAGEMENT_LINKS.map(({ href, label, icon: Icon, desc }) => (
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
            <CardTitle className="text-base">บำรุงรักษา</CardTitle>
            <p className="text-sm text-muted-foreground">ลบข้อมูลเก่าหรือข้อมูลผีที่ค้างในระบบ</p>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleCleanupOldExchanges}
              disabled={cleanupExchangesLoading}
            >
              {cleanupExchangesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              ลบการแลกเปลี่ยนที่สำเร็จแล้ว (ข้อมูลเก่า)
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleCleanupOrphans}
              disabled={cleanupOrphansLoading}
            >
              {cleanupOrphansLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
              ลบผู้ใช้ผี (ข้อมูล Firestore ที่ไม่มีใน Auth)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
