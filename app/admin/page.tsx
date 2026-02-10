"use client"

import { useEffect, useMemo, useState, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { useI18n } from "@/components/language-provider"
import { Loader2, LayoutDashboard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAdminDashboardData } from "@/hooks/use-admin-dashboard"

const DashboardOverview = lazy(() =>
  import("@/components/admin/dashboard-overview").then((m) => ({ default: m.DashboardOverview }))
)

function toDate(v: unknown): Date {
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate()
  }
  if (v instanceof Date) return v
  if (typeof v === "string" || typeof v === "number") {
    const parsed = new Date(v)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  if (v && typeof v === "object") {
    const seconds = (v as { seconds?: number; _seconds?: number }).seconds
      ?? (v as { seconds?: number; _seconds?: number })._seconds
    if (typeof seconds === "number") return new Date(seconds * 1000)
  }
  return new Date()
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const { tt } = useI18n()
  const router = useRouter()
  const { toast } = useToast()
  const { items, tickets, totalUsersCount, isLoading } = useAdminDashboardData()
  const [nowMs, setNowMs] = useState(0)

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => setNowMs(Date.now()))
    return () => window.cancelAnimationFrame(rafId)
  }, [items.length, tickets.length])

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

  const newItemsCount = useMemo(() => {
    return items.filter((item) => {
      const postedAt = toDate(item.postedAt)
      const hoursAgo = (nowMs - postedAt.getTime()) / (1000 * 60 * 60)
      return hoursAgo <= 24 || item.status === "pending"
    }).length
  }, [items, nowMs])

  const newTicketsCount = useMemo(() => {
    return tickets.filter((t) => {
      if (t.status === "new") return true
      const createdAt = toDate(t.createdAt)
      const hoursAgo = (nowMs - createdAt.getTime()) / (1000 * 60 * 60)
      return hoursAgo <= 24
    }).length
  }, [tickets, nowMs])

  if (authLoading || (isAdmin && isLoading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const handleTabChange = (tab: string) => {
    switch (tab) {
      case "items":
        router.push("/admin/items")
        break
      case "users":
        router.push("/admin/users")
        break
      case "support":
        router.push("/admin/support")
        break
      case "reports":
        router.push("/admin/reports")
        break
      case "logs":
        router.push("/admin/logs")
        break
      default:
        break
    }
  }

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* Header – รูปแบบเดียวกับหน้าจัดการอื่นๆ */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <LayoutDashboard className="h-8 w-8 text-primary" />
                {tt("ภาพรวม", "Overview")}
              </h1>
              <p className="text-muted-foreground">{tt("ภาพรวมระบบและสถิติ", "System summary and statistics")}</p>
            </div>
          </div>
        </div>

        <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
          <DashboardOverview
            items={items}
            tickets={tickets}
            totalUsersCount={totalUsersCount}
            newItemsCount={newItemsCount}
            newTicketsCount={newTicketsCount}
            onTabChange={handleTabChange}
          />
        </Suspense>
      </div>
    </div>
  )
}
