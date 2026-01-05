"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { getAdminLogs, type AdminLog, type AdminActionType } from "@/lib/firestore"
import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  ArrowLeft
} from "lucide-react"

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
  const [filterAction, setFilterAction] = useState<string>("all")
  const [filterTarget, setFilterTarget] = useState<string>("all")

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
      loadLogs()
    } catch (error) {
      console.error("[AdminLogs] Error checking admin:", error)
      router.push("/dashboard")
    }
  }

  const loadLogs = async () => {
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
  }

  useEffect(() => {
    if (isAdmin) {
      loadLogs()
    }
  }, [filterAction, filterTarget, isAdmin])

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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
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

        {/* Filters */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-card via-card to-muted/30 border-t-4 border-t-primary/60 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">กรองผลลัพธ์</h3>
              <p className="text-xs text-muted-foreground">เลือกประเภทการกระทำหรือเป้าหมาย</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                ประเภทการกระทำ
              </label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="bg-background border-border/60 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="ประเภทการกระทำ" />
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-sm">
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {Object.entries(ACTION_TYPE_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <val.icon className="h-3 w-3" />
                        {val.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Package className="h-3 w-3" />
                ประเภทเป้าหมาย
              </label>
              <Select value={filterTarget} onValueChange={setFilterTarget}>
                <SelectTrigger className="bg-background border-border/60 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="ประเภทเป้าหมาย" />
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-sm">
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {Object.entries(TARGET_TYPE_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {(filterAction !== "all" || filterTarget !== "all") && (
              <div className="flex items-end md:col-span-2 lg:col-span-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { setFilterAction("all"); setFilterTarget("all"); }}
                  className="gap-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  รีเซ็ตตัวกรอง
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Logs Table */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                รายการกิจกรรม
              </span>
              <Badge variant="secondary" className="px-3 py-1">
                {logs.length} รายการ
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="text-center py-16 px-4 bg-gradient-to-b from-transparent to-muted/20">
                <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                  <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">ยังไม่มีบันทึกกิจกรรม</h3>
                <p className="text-sm text-muted-foreground">เมื่อผู้ดูแลดำเนินการใดๆ จะแสดงที่นี่</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/40">
                      <TableHead className="font-semibold">การกระทำ</TableHead>
                      <TableHead className="font-semibold">เป้าหมาย</TableHead>
                      <TableHead className="font-semibold">รายละเอียด</TableHead>
                      <TableHead className="font-semibold">ผู้ดำเนินการ</TableHead>
                      <TableHead className="font-semibold">เวลา</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log, index) => {
                      const actionConfig = ACTION_TYPE_LABELS[log.actionType] || ACTION_TYPE_LABELS.other
                      const ActionIcon = actionConfig.icon
                      
                      return (
                        <TableRow 
                          key={log.id} 
                          className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
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
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
