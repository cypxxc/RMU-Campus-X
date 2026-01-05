"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, where } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { getReports, updateUserStatus, issueWarning, getUserWarnings, deleteUserAndData } from "@/lib/firestore"
import type { Report, User, UserStatus, UserWarning } from "@/types"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { Loader2, AlertTriangle, Ban, ShieldAlert, CheckCircle2, Eye } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import { UserDetailModal } from "@/components/admin/admin-modals"
import { ActionDialog } from "@/components/admin/action-dialog"

interface UserWithReports extends User {
  reportsReceived: number
  reportsFiled: number
  lastReportDate?: Date
}

export default function AdminReportedUsersPage() {
  const [users, setUsers] = useState<UserWithReports[]>([])
  const [_reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithReports | null>(null)
  const [userWarnings, setUserWarnings] = useState<UserWarning[]>([])
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'warn' | 'suspend' | 'ban' | 'activate' | 'delete' | null
  }>({ open: false, type: null })
  
  // State for actions moved to ActionDialog component to prevent re-renders

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    checkAdmin()
  }, [user, authLoading])

  const checkAdmin = async () => {
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
      loadData()
    } catch (error) {
      console.error("[AdminReportedUsers] Error checking admin:", error)
      router.push("/dashboard")
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const db = getFirebaseDb()
      
      // Get all reports
      const allReports = await getReports()
      setReports(allReports)
      
      // Get all users from Firestore
      const usersSnapshot = await getDocs(collection(db, "users"))
      const firestoreUsersMap = new Map<string, User>()
      usersSnapshot.docs.forEach(doc => {
        firestoreUsersMap.set(doc.id, { ...doc.data() } as User)
      })
      
      // Map to track report stats
      const userStatsMap = new Map<string, { received: number; filed: number; lastDate?: Date; email?: string }>()
      
      // Process stats and collect emails for ghosts
      allReports.forEach(report => {
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
      
      const finalUsers: UserWithReports[] = Array.from(allUserIds).map(uid => {
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
  }

  const handleViewUser = async (user: UserWithReports) => {
    setSelectedUser(user)
    try {
      const warnings = await getUserWarnings(user.uid)
      setUserWarnings(warnings)
    } catch (error) {
      console.error("[AdminReportedUsers] Error loading warnings:", error)
    }
  }

  const handleAction = async (reason: string, suspendDays?: number) => {
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
        await updateUserStatus(
          selectedUser.uid,
          'SUSPENDED',
          user.uid,
          user.email || "",
          reason || "ระงับการใช้งานชั่วคราว",
          suspendDays || 7
        )
        toast({ title: "ระงับผู้ใช้สำเร็จ", description: `ระงับ ${suspendDays} วัน` })
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

  const getStatusBadge = (userItem: UserWithReports) => {
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
       
       // SHow remaining
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

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">จัดการผู้ใช้</h1>
          <p className="text-muted-foreground">รายชื่อผู้ใช้ทั้งหมดในระบบและสถานะการถูกรายงาน</p>
        </div>

        <Card>
          <CardContent className="pt-6 contain-paint">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">ถูกรายงาน (ครั้ง)</TableHead>
                  <TableHead className="text-center">แจ้งรายงาน (ครั้ง)</TableHead>
                  <TableHead className="text-center">คำเตือนสะสม</TableHead>
                  <TableHead>รายงานล่าสุดเมื่อ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูลผู้ใช้
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.uid}>
                      <TableCell className="font-medium">
                        {u.email}
                        {!u.createdAt && <Badge variant="secondary" className="ml-2 text-[10px]">Ghost</Badge>}
                      </TableCell>
                      <TableCell>{getStatusBadge(u)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={u.reportsReceived > 0 ? "destructive" : "outline"}>
                          {u.reportsReceived}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-muted-foreground text-sm">{u.reportsFiled}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={u.warningCount > 0 ? "secondary" : "outline"}>{u.warningCount || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.lastReportDate 
                          ? formatDistanceToNow(u.lastReportDate, { addSuffix: true, locale: th })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUser(u)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          จัดการ
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* User Management Dialog */}
      {selectedUser && (
        <UserDetailModal
          open={!!selectedUser}
          onOpenChange={(open) => !open && setSelectedUser(null)}
          email={selectedUser.email}
          user={selectedUser}
          stats={{
            status: selectedUser.status || 'ACTIVE',
            warningCount: selectedUser.warningCount || 0,
            reportsReceived: selectedUser.reportsReceived,
            reportsFiled: selectedUser.reportsFiled
          }}
          warnings={userWarnings.map(w => ({
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
          formatDate={(date) => formatDistanceToNow(date, { addSuffix: true, locale: th })}
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
