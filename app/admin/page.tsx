"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, where } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { useAuth } from "@/components/auth-provider"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DashboardOverview } from "@/components/admin/dashboard-overview"
import { useAdminDashboardData } from "@/hooks/use-admin-dashboard"

export default function AdminDashboardPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  // ✅ NEW: React Query replaces real-time listeners
  const { items, users, tickets, isLoading } = useAdminDashboardData()

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

  const flaggedUsersCount = users.filter(u => {
    if (u.status !== 'ACTIVE') return true
    if (u.lastReportDate) {
      const hoursAgo = (Date.now() - u.lastReportDate.getTime()) / (1000 * 60 * 60)
      return hoursAgo <= 24
    }
    return false
  }).length

  const newTicketsCount = tickets.filter(t => {
    if (t.status === 'new') return true
    const createdAt = (t.createdAt as any)?.toDate?.() || new Date()
    const hoursAgo = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
    return hoursAgo <= 24
  }).length

  const handleTabChange = (tab: string) => {
    // Navigate to the appropriate admin sub-page
    switch (tab) {
      case 'items':
        router.push('/admin/items')
        break
      case 'users':
        router.push('/admin/users')
        break
      case 'support':
        router.push('/admin/support')
        break
      case 'reports':
        router.push('/admin/reports')
        break
      default:
        break
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground text-sm">ภาพรวมระบบและสถิติ</p>
      </div>

      <DashboardOverview
        items={items}
        users={users}
        tickets={tickets}
        newItemsCount={newItemsCount}
        flaggedUsersCount={flaggedUsersCount}
        newTicketsCount={newTicketsCount}
        onTabChange={handleTabChange}
      />
    </div>
  )
}
