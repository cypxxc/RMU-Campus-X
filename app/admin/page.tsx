"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Loader2, LayoutDashboard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DashboardOverview } from "@/components/admin/dashboard-overview"
import { useAdminDashboardData } from "@/hooks/use-admin-dashboard"

function toDate(v: unknown): Date {
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate()
  }
  return v instanceof Date ? v : new Date()
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { items, tickets, totalUsersCount, isLoading } = useAdminDashboardData()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
  }, [items.length, tickets.length])

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

  const nowMs = now ?? 0
  const newItemsCount = useMemo(() => items.filter(item => {
    const postedAt = toDate(item.postedAt)
    const hoursAgo = (nowMs - postedAt.getTime()) / (1000 * 60 * 60)
    return hoursAgo <= 24 || item.status === "pending"
  }).length, [items, nowMs])

  const newTicketsCount = useMemo(() => tickets.filter(t => {
    if (t.status === "new") return true
    const createdAt = toDate(t.createdAt)
    const hoursAgo = (nowMs - createdAt.getTime()) / (1000 * 60 * 60)
    return hoursAgo <= 24
  }).length, [tickets, nowMs])

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
                ภาพรวม
              </h1>
              <p className="text-muted-foreground">ภาพรวมระบบและสถิติ</p>
            </div>
          </div>
        </div>

        <DashboardOverview
        items={items}
        tickets={tickets}
        totalUsersCount={totalUsersCount}
        newItemsCount={newItemsCount}
        newTicketsCount={newTicketsCount}
        onTabChange={handleTabChange}
        />
      </div>
    </div>
  )
}
