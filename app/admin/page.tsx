"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, where } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { useAuth } from "@/components/auth-provider"
import { Loader2, LayoutDashboard, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { DashboardOverview } from "@/components/admin/dashboard-overview"
import { useAdminDashboardData } from "@/hooks/use-admin-dashboard"

export default function AdminDashboardPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  // ✅ NEW: React Query replaces real-time listeners
  const { items, tickets, totalUsersCount, isLoading } = useAdminDashboardData()

  const checkAdmin = useCallback(async () => {
    if (!user) return

    try {
      const db = getFirebaseDb()
      const adminsRef = collection(db, "admins")
      const q = query(adminsRef, where("email", "==", user.email))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        toast({
          title: "ไม่มีสิทธิ์เข้าถึง",
          description: "คุณไม่มีสิทธิ์ใช้งานหน้าผู้ดูแลระบบ",
          variant: "destructive",
        })
        router.push("/dashboard")
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error("[AdminDashboard] Error checking admin:", error)
      router.push("/dashboard")
    } finally {
      setCheckingAdmin(false)
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

  // ✅ Real-time listeners removed - now using React Query with polling
  // See hooks/use-admin-dashboard.ts for optimized implementation

  if (checkingAdmin || (isAdmin && isLoading)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  // Calculate counts
  const newItemsCount = items.filter(item => {
    const postedAt = (item.postedAt as any)?.toDate?.() || new Date()
    const hoursAgo = (Date.now() - postedAt.getTime()) / (1000 * 60 * 60)
    return hoursAgo <= 24 || item.status === 'pending'
  }).length

  const newTicketsCount = tickets.filter(t => {
    if (t.status === 'new') return true
    const createdAt = (t.createdAt as any)?.toDate?.() || new Date()
    const hoursAgo = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
    return hoursAgo <= 24
  }).length

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
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => router.push("/admin")} aria-label="กลับ">
              <ArrowLeft className="h-4 w-4" />
            </Button>
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
