"use client"



import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { getAdminLogs, type AdminLog, type AdminActionType } from "@/lib/firestore"
import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  FileWarning,
  Package,
  MessageSquare,
  ClipboardList,
  RefreshCw,
  ArrowLeft,
  Search
} from "lucide-react"

import { Input } from "@/components/ui/input"

import Link from "next/link"

const ACTION_TYPE_LABELS: Record<AdminActionType, { label: string; color: string; icon: any }> = {
  user_warning: { label: "ออกคำเตือน", color: "bg-amber-100 text-amber-800", icon: AlertTriangle },
  user_suspend: { label: "ระงับผู้ใช้", color: "bg-orange-100 text-orange-800", icon: ShieldAlert },
  user_ban: { label: "แบนผู้ใช้", color: "bg-red-100 text-red-800", icon: Ban },
  user_activate: { label: "ปลดล็อคผู้ใช้", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  report_status_change: { label: "เปลี่ยนสถานะรายงาน", color: "bg-blue-100 text-blue-800", icon: ClipboardList },
  report_resolve: { label: "แก้ไขรายงาน", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  item_delete: { label: "ลบสิ่งของ", color: "bg-red-100 text-red-800", icon: Package },
  item_status_change: { label: "เปลี่ยนสถานะสิ่งของ", color: "bg-blue-100 text-blue-800", icon: Package },
  ticket_reply: { label: "ตอบกลับ Ticket", color: "bg-purple-100 text-purple-800", icon: MessageSquare },
  ticket_status_change: { label: "เปลี่ยนสถานะ Ticket", color: "bg-blue-100 text-blue-800", icon: MessageSquare },
  other: { label: "อื่นๆ", color: "bg-gray-100 text-gray-800", icon: FileWarning },
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  user: "ผู้ใช้",
  item: "สิ่งของ",
  report: "รายงาน",
  ticket: "Ticket",
  exchange: "การแลกเปลี่ยน",
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [filterAction] = useState<string>("all")
  const [filterTarget] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("") // New state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const options: any = { limitCount: 100 }
      
      if (filterAction !== "all") {
        options.actionType = filterAction as AdminActionType
      }
      
      if (filterTarget !== "all") {
        options.targetType = filterTarget
      }
      
      const data = await getAdminLogs(options)
      setLogs(data)
    } catch (error) {
      console.error("[AdminLogs] Error loading logs:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูล logs ได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [filterAction, filterTarget, toast])

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
      loadLogs()
    } catch (error) {
      console.error("[AdminLogs] Error checking admin:", error)
      router.push("/dashboard")
    }
  }, [loadLogs, router, toast, user])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    checkAdmin()
  }, [authLoading, checkAdmin, router, user])


  useEffect(() => {
    if (isAdmin) {
      loadLogs()
    }
  }, [isAdmin, loadLogs])

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase()
    
    // Check main fields
    if ((log.description || "").toLowerCase().includes(q) ||
        (log.adminEmail || "").toLowerCase().includes(q)) {
      return true
    }
    
    // Check target ID and info
    if ((log.targetId || "").toLowerCase().includes(q) ||
        (log.targetInfo || "").toLowerCase().includes(q)) {
      return true
    }
    
    return false
  })

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {/* ... existing header content ... */}
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <ClipboardList className="h-8 w-8 text-primary" />
                บันทึกกิจกรรม Admin
              </h1>
              <p className="text-muted-foreground">ประวัติการดำเนินการของผู้ดูแลระบบ</p>
            </div>
          </div>
          <Button onClick={loadLogs} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            รีเฟรช
          </Button>
        </div>

        {/* Logs Table */}
        <Card className="overflow-hidden border shadow-sm">
          <CardHeader className="px-4 py-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-5 w-5 text-primary" />
                รายการกิจกรรม
                <Badge variant="secondary" className="ml-2 px-3 py-1">
                  {filteredLogs.length} รายการ
                </Badge>
              </CardTitle>
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาประวัติการทำงาน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background w-full md:w-[300px] h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-16 px-4 bg-card">
                <div className="p-4 rounded-full bg-muted w-fit mx-auto mb-4">
                  <ClipboardList className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {searchQuery ? "ไม่พบกิจกรรมที่ค้นหา" : "ยังไม่มีบันทึกกิจกรรม"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "ลองเปลี่ยนคำค้นหาใหม่" : "เมื่อผู้ดูแลดำเนินการใดๆ จะแสดงที่นี่"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="font-semibold">การกระทำ</TableHead>
                      <TableHead className="font-semibold">เป้าหมาย</TableHead>
                      <TableHead className="font-semibold">รายละเอียด</TableHead>
                      <TableHead className="font-semibold">ผู้ดำเนินการ</TableHead>
                      <TableHead className="font-semibold">เวลา</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((log) => {
                      const actionConfig = ACTION_TYPE_LABELS[log.actionType] || ACTION_TYPE_LABELS.other
                      const ActionIcon = actionConfig.icon
                      
                      return (
                        <TableRow 
                          key={log.id} 
                          className="hover:bg-muted transition-colors bg-card"
                        >
                          <TableCell>
                            <Badge className={`${actionConfig.color} gap-1.5 shadow-sm`}>
                              <ActionIcon className="h-3 w-3" />
                              {actionConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {TARGET_TYPE_LABELS[log.targetType] || log.targetType}
                              </Badge>
                              <p className="font-medium text-sm truncate max-w-[200px]">
                                {log.targetInfo || log.targetId}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-muted-foreground line-clamp-2 max-w-[300px]">
                              {log.description}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-medium text-primary">
                                  {log.adminEmail?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <p className="text-sm truncate max-w-[150px]">{log.adminEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {((log.createdAt as any)?.toDate?.() || new Date()).toLocaleString('th-TH', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit'
                            })}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Pagination */}
            {filteredLogs.length > itemsPerPage && (
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
                  {Array.from({ length: Math.ceil(filteredLogs.length / itemsPerPage) }, (_, i) => i + 1).slice(
                    Math.max(0, currentPage - 3),
                    Math.min(Math.ceil(filteredLogs.length / itemsPerPage), currentPage + 2)
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
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredLogs.length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(filteredLogs.length / itemsPerPage)}
                >
                  ถัดไป
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
