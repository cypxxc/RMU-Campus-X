"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authFetchJson } from "@/lib/api-client"
import { getReports, updateUserStatus, issueWarning, getUserWarnings, deleteUserAndData } from "@/lib/firestore"
import type { Report, User, UserStatus, UserWarning } from "@/types"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, 
  AlertTriangle, 
  Ban, 
  ShieldAlert, 
  CheckCircle2, 
  Pencil, 
  User as UserIcon, 
  Search
} from "lucide-react"
import { UserDetailModal } from "@/components/admin/admin-modals"
import { ActionDialog, type SuspendDuration } from "@/components/admin/action-dialog"
import { Input } from "@/components/ui/input"

interface UserWithReportsRow extends User {
  reportsReceived: number
  reportsFiled: number
  lastReportDate?: Date
}

export default function AdminReportedUsersPage() {
  const [users, setUsers] = useState<UserWithReportsRow[]>([])
  const [, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithReportsRow | null>(null)
  const [userWarnings, setUserWarnings] = useState<UserWarning[]>([])
  const [userDetail, setUserDetail] = useState<{
    displayName?: string
    createdAt?: string
    itemsPosted?: number
    exchangesCompleted?: number
    reportsReceived?: number
    suspendedUntil?: string | null
    bannedReason?: string | null
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState("") // New state
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'warn' | 'suspend' | 'ban' | 'activate' | 'delete' | null
  }>({ open: false, type: null })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // State for actions moved to ActionDialog component to prevent re-renders

  const { user, loading: authLoading, isAdmin: isAdminFromAuth } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    if (!isAdminFromAuth) {
      toast({
        title: "ไม่มีสิทธิ์เข้าถึง",
        description: "คุณไม่มีสิทธิ์ใช้งานหน้าผู้ดูแลระบบ",
        variant: "destructive",
      })
      router.push("/dashboard")
    } else {
      setIsAdmin(true)
    }
  }, [authLoading, user, isAdminFromAuth, router, toast])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const allReports = await getReports()
      setReports(allReports)

      const usersRes = await authFetchJson<{ users?: User[] }>("/api/admin/users?limit=500", { method: "GET" })
      const usersList = usersRes?.data?.users ?? []
      const firestoreUsersMap = new Map<string, User>()
      usersList.forEach((u: any) => {
        const id = u.uid ?? u.id
        if (id) firestoreUsersMap.set(id, { ...u, uid: id } as User)
      })
      
      // Map to track report stats
      const userStatsMap = new Map<string, { received: number; filed: number; lastDate?: Date; email?: string }>()
      
      // Process stats and collect emails for ghosts
      allReports.forEach((report: Report) => {
        const reportDate = (report.createdAt as any)?.toDate?.() || new Date()

        // 1. Reported User (User being reported)
        if (report.reportedUserId) {
          const current = userStatsMap.get(report.reportedUserId) || { received: 0, filed: 0 }
          userStatsMap.set(report.reportedUserId, {
            ...current,
            received: current.received + 1,
            lastDate: !current.lastDate || reportDate > current.lastDate ? reportDate : current.lastDate,
            email: report.reportedUserEmail || current.email
          })
        }
        
        // 2. Reporter (User filing the report)
        if (report.reporterId) {
          const current = userStatsMap.get(report.reporterId) || { received: 0, filed: 0 }
          userStatsMap.set(report.reporterId, {
            ...current,
            filed: current.filed + 1,
            email: report.reporterEmail || current.email
          })
        }
      })
      
      // Combine Firestore users and Ghost users (from reports)
      const allUserIds = new Set([...Array.from(firestoreUsersMap.keys()), ...Array.from(userStatsMap.keys())])
      
      const finalUsers: UserWithReportsRow[] = Array.from(allUserIds).map(uid => {
        const firestoreUser = firestoreUsersMap.get(uid)
        const stats = userStatsMap.get(uid) || { received: 0, filed: 0 }
        
        // Synthesize user if missing from Firestore
        const baseUser: User = firestoreUser || {
          uid,
          email: stats.email || "Unknown Email",
          status: 'ACTIVE',
          warningCount: 0,
          createdAt: { toDate: () => new Date() } as any // Mock timestamp
        }

        return {
          ...baseUser,
          reportsReceived: stats.received,
          reportsFiled: stats.filed,
          lastReportDate: stats.lastDate
        }
      })
      
      // Sort: Most reported first, then most active reporters
      const sortedUsers = finalUsers.sort((a, b) => {
        if (b.reportsReceived !== a.reportsReceived) return b.reportsReceived - a.reportsReceived
        return b.reportsFiled - a.reportsFiled
      })
      
      setUsers(sortedUsers)
    } catch (error) {
      console.error("[AdminReportedUsers] Error loading data:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const runCleanupOrphans = useCallback(
    async (_options?: { silent?: boolean }) => {
      if (!user) return 0
      try {
        const token = await user.getIdToken()
        const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
        const res = await fetch(`${baseUrl}/api/admin/users/cleanup-orphans`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error?.message || "ลบข้อมูลไม่สำเร็จ")
        }
        const data = await res.json()
        const deleted = data?.data?.deleted ?? 0
        if (deleted > 0) {
          toast({
            title: "อัปเดตรายชื่อผู้ใช้แล้ว",
            description: `ลบข้อมูลบัญชีที่ไม่มีในระบบแล้ว ${deleted} รายการ`,
          })
        }
        return deleted
      } catch {
        return 0
      }
    },
    [user, toast]
  )

  useEffect(() => {
    if (!isAdmin) return
    runCleanupOrphans({ silent: true }).then(() => {
      loadData()
    })
  }, [isAdmin, runCleanupOrphans, loadData])

  // อัปเดตอัตโนมัติทุก 30 วินาที เฉพาะเมื่อแท็บเปิดอยู่
  useEffect(() => {
    if (!isAdmin) return
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      loadData()
    }, 30_000)
    return () => clearInterval(interval)
  }, [isAdmin, loadData])

  const handleViewUser = async (userRow: UserWithReportsRow) => {
    setSelectedUser(userRow)
    setUserDetail(null)
    setUserWarnings([])
    try {
      const [warningsRes, detailRes] = await Promise.all([
        getUserWarnings(userRow.uid),
        (async () => {
          try {
            const token = await user?.getIdToken()
            if (!token) return null
            const r = await fetch(`/api/admin/users/${userRow.uid}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (!r.ok) return null
            const json = await r.json()
            return json?.data ?? null
          } catch {
            return null
          }
        })(),
      ])
      setUserWarnings(warningsRes)
      if (detailRes?.user || detailRes?.stats) {
        const u = detailRes.user ?? {}
        const toDateStr = (v: unknown): string | undefined => {
          if (!v) return undefined
          if (typeof v === "string") return v
          if (typeof v === "object" && v !== null && "toDate" in (v as { toDate?: () => Date }) && typeof (v as { toDate: () => Date }).toDate === "function") return (v as { toDate: () => Date }).toDate().toISOString()
          if (typeof v === "object" && v !== null && "_seconds" in (v as { _seconds?: number })) return new Date(((v as { _seconds: number })._seconds) * 1000).toISOString()
          return undefined
        }
        setUserDetail({
          displayName: (u.displayName as string) ?? undefined,
          createdAt: toDateStr(u.createdAt),
          itemsPosted: detailRes.stats?.itemsPosted ?? 0,
          exchangesCompleted: detailRes.stats?.exchangesCompleted ?? 0,
          reportsReceived: detailRes.stats?.reportsReceived ?? 0,
          suspendedUntil: u.suspendedUntil != null ? toDateStr(u.suspendedUntil) ?? null : null,
          bannedReason: (u.bannedReason as string) ?? null,
        })
      }
    } catch (error) {
      console.error("[AdminReportedUsers] Error loading user detail:", error)
    }
  }

  const handleAction = async (reason: string, suspendDuration?: SuspendDuration) => {
    if (!selectedUser || !user || !actionDialog.type) return

    try {
      const { type } = actionDialog

      if (type === 'warn') {
        await issueWarning(
          selectedUser.uid,
          selectedUser.email,
          reason || "พฤติกรรมไม่เหมาะสมในการใช้งานระบบ",
          user.uid,
          user.email || "",
          undefined,
          undefined
        )
        toast({ title: "ออกคำเตือนสำเร็จ" })
      } else if (type === 'suspend') {
        const d = suspendDuration ?? { value: 7, unit: "day" as const }
        const suspendDays = d.unit === "day" ? d.value : undefined
        const suspendMinutes =
          d.unit === "minute" ? d.value : d.unit === "hour" ? d.value * 60 : undefined
        await updateUserStatus(
          selectedUser.uid,
          'SUSPENDED',
          user.uid,
          user.email || "",
          reason || "ระงับการใช้งานชั่วคราว",
          suspendDays,
          suspendMinutes
        )
        const desc =
          d.unit === "day"
            ? `ระงับ ${d.value} วัน`
            : d.unit === "hour"
              ? `ระงับ ${d.value} ชั่วโมง`
              : `ระงับ ${d.value} นาที`
        toast({ title: "ระงับผู้ใช้สำเร็จ", description: desc })
      } else if (type === 'ban') {
        await updateUserStatus(
          selectedUser.uid,
          'BANNED',
          user.uid,
          user.email || "",
          reason || "แบนถาวรเนื่องจากการละเมิดกฎอย่างร้ายแรง"
        )
        toast({ title: "แบนผู้ใช้สำเร็จ" })
      } else if (type === 'activate') {
        await updateUserStatus(
          selectedUser.uid,
          'ACTIVE',
          user.uid,
          user.email || "",
          reason || "ปลดล็อคบัญชี"
        )
        toast({ title: "ปลดล็อคผู้ใช้สำเร็จ" })
      } else if (type === 'delete') {
        await deleteUserAndData(selectedUser.uid)
        toast({ title: "ลบผู้ใช้และข้อมูลสำเร็จ" })
      }

      setActionDialog({ open: false, type: null })
      setSelectedUser(null)
      loadData()
    } catch (error: any) {
      console.error("[AdminReportedUsers] Error performing action:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (userItem: UserWithReportsRow) => {
    const status = userItem.status || 'ACTIVE'
    const configs = {
      ACTIVE: { label: "ใช้งานปกติ", className: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
      WARNING: { label: "คำเตือน", className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertTriangle },
      SUSPENDED: { label: "ระงับ", className: "bg-orange-100 text-orange-800 border-orange-200", icon: ShieldAlert },
      BANNED: { label: "แบน", className: "bg-red-100 text-red-800 border-red-200", icon: Ban },
    }
    
    // Check specific conditions
    if (status === 'SUSPENDED' && userItem.suspendedUntil) {
       const until = (userItem.suspendedUntil as any)?.toDate?.() || new Date(userItem.suspendedUntil as any)
       const isExpired = until < new Date()
       
       if (isExpired) {
          return (
             <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1 hover:bg-yellow-100">
                <CheckCircle2 className="h-3 w-3" />
                ระงับ (รอปลด)
             </Badge>
          )
       }
       
       // Show remaining
       return (
          <Badge className={`${configs.SUSPENDED.className} gap-1`}>
             <ShieldAlert className="h-3 w-3" />
             ถึง {until.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
          </Badge>
       )
    }

    const config = configs[status as UserStatus] || configs.ACTIVE
    const Icon = config.icon
    
    return (
      <Badge className={`${config.className} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.status || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <UserIcon className="h-8 w-8 text-primary" />
                จัดการผู้ใช้
              </h1>
              <p className="text-muted-foreground">รายชื่อผู้ใช้ทั้งหมดในระบบและสถานะการถูกรายงาน</p>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <Card className="overflow-hidden border shadow-sm">
          <CardHeader className="border-b px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                รายชื่อผู้ใช้
                <Badge variant="secondary" className="ml-2 px-3 py-1">
                  {filteredUsers.length} คน
                </Badge>
              </CardTitle>
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาผู้ใช้ด้วยอีเมล, ID, หรือสถานะ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background w-full md:w-[300px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/40">
                  <TableHead className="font-semibold">อีเมล</TableHead>
                  <TableHead className="font-semibold">สถานะ</TableHead>
                  <TableHead className="text-center font-semibold">ถูกรายงาน (ครั้ง)</TableHead>
                  <TableHead className="text-center font-semibold">แจ้งรายงาน (ครั้ง)</TableHead>
                  <TableHead className="text-center font-semibold">คำเตือนสะสม</TableHead>
                  <TableHead className="font-semibold">รายงานล่าสุดเมื่อ</TableHead>
                  <TableHead className="text-right font-semibold">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48">
                      <div className="flex flex-col items-center justify-center text-center py-8">
                        <div className="p-4 rounded-full bg-muted/50 w-fit mb-4">
                          <UserIcon className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {searchQuery ? "ไม่พบผู้ใช้ที่ค้นหา" : "ไม่พบข้อมูลผู้ใช้"}
                        </h3>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((u, index) => (
                    <TableRow
                      key={u.uid}
                      className={`hover:bg-muted/50 transition-colors cursor-pointer ${index % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
                      onClick={() => handleViewUser(u)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {u.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                             <div className="text-sm font-medium">{u.email}</div>
                             {!u.createdAt && <Badge variant="secondary" className="text-[9px] h-4 px-1">ไม่มีในระบบ</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(u)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={u.reportsReceived > 0 ? "destructive" : "outline"} className="min-w-[30px] justify-center">
                          {u.reportsReceived}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-muted-foreground text-sm font-medium">{u.reportsFiled}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={u.warningCount > 0 ? "secondary" : "outline"} className="min-w-[30px] justify-center">{u.warningCount || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.lastReportDate 
                          ? u.lastReportDate.toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                          onClick={() => handleViewUser(u)}
                          title="ดูข้อมูล"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {filteredUsers.length > itemsPerPage && (
              <div className="flex items-center justify-center gap-2 p-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ก่อนหน้า
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(filteredUsers.length / itemsPerPage) }, (_, i) => i + 1).slice(
                    Math.max(0, currentPage - 3),
                    Math.min(Math.ceil(filteredUsers.length / itemsPerPage), currentPage + 2)
                  ).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      size="sm"
                      className="w-8 h-8"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredUsers.length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(filteredUsers.length / itemsPerPage)}
                >
                  ถัดไป
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Management Dialog */}
      {selectedUser && (
        <UserDetailModal
          open={!!selectedUser}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedUser(null)
              setUserDetail(null)
            }
          }}
          email={selectedUser.email}
          user={selectedUser}
          userDetail={userDetail}
          stats={{
            status: selectedUser.status || "ACTIVE",
            warningCount: selectedUser.warningCount || 0,
            reportsReceived: selectedUser.reportsReceived,
            reportsFiled: selectedUser.reportsFiled,
          }}
          warnings={userWarnings.map((w) => ({
            id: w.id,
            reason: w.reason,
            action: w.action,
            issuedByEmail: w.issuedByEmail,
            issuedAt: (w.issuedAt as any)?.toDate?.() || new Date()
          }))}
          onAction={(type) => {
            const validTypes = ["suspend", "ban", "warn", "activate", "delete"]
            if (validTypes.includes(type)) {
              setActionDialog({ open: true, type: type as any })
            }
          }}
          getStatusBadge={getStatusBadge}
          formatDate={(date) => date.toLocaleString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        />
      )}

      {/* Action Confirmation Dialog - Refactored for performance */}
      <ActionDialog
        open={actionDialog.open}
        type={actionDialog.type}
        user={selectedUser}
        onOpenChange={(open) => !open && setActionDialog({ open: false, type: null })}
        onConfirm={handleAction}
      />
    </div>
  )
}
