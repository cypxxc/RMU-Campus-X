"use client"



import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { getReports, updateReportStatus } from "@/lib/firestore"
import type { Report, ReportStatus } from "@/types"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
  Flag, 
  CheckCircle2, 
  XCircle, 
  Pencil, 
  AlertTriangle,
  Package,
  Clock,
  Search,
  User as UserIcon,
  X,
  Bell
} from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"


const reportReasonLabels: Record<string, string> = {
  spam: "สแปม / โฆษณา",
  inappropriate: "เนื้อหาไม่เหมาะสม",
  harassment: "การคุกคาม / รังแก",
  scam: "ฉ้อโกง / หลอกลวง",
  other: "อื่นๆ",
}

const statusBadgeStyles: Record<string, string> = {
  new: "bg-yellow-100 text-yellow-800 border-yellow-200",
  under_review: "bg-blue-100 text-blue-800 border-blue-200",
  waiting_user: "bg-orange-100 text-orange-800 border-orange-200",
  action_taken: "bg-green-100 text-green-800 border-green-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
}

const statusLabels: Record<string, string> = {
  new: "ใหม่",
  under_review: "กำลังตรวจสอบ",
  waiting_user: "รอข้อมูลเพิ่มเติม",
  action_taken: "ดำเนินการแล้ว",
  resolved: "แก้ไขแล้ว",
  closed: "ปิดเคส",
  rejected: "ปฏิเสธ",
}

// Report type labels (using reportType like item_report, user_report)
const reportTypeLabels: Record<string, string> = {
  item_report: "โพส",
  exchange_report: "การแลกเปลี่ยน",
  chat_report: "แชท",
  user_report: "ผู้ใช้",
}

// Target type labels (using targetType like item, user)
const targetTypeLabels: Record<string, string> = {
  item: "โพส",
  exchange: "การแลกเปลี่ยน",
  chat: "แชท",
  user: "ผู้ใช้",
}

interface ReportWithDetails extends Report {
  targetData?: any
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null)
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const [processing, setProcessing] = useState(false)
  const [notifyOwnerLoading, setNotifyOwnerLoading] = useState(false)
  
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const reportsData = await getReports()
      
      // Fetch details for each report target
      const reportsWithDetails = await Promise.all(reportsData.map(async (report: ReportWithDetails) => {
        try {
          const db = getFirebaseDb()
          let targetData = null
          
          // Determine collection from targetType or reportType
          const targetType = report.targetType || (
            report.reportType === 'user_report' ? 'user' :
            report.reportType === 'item_report' ? 'item' :
            report.reportType === 'exchange_report' ? 'exchange' :
            report.reportType === 'chat_report' ? 'exchange' : // chat uses exchange collection
            null
          )
          
          if (targetType === 'user') {
            const userDoc = await getDoc(doc(db, "users", report.targetId))
            if (userDoc.exists()) targetData = userDoc.data()
          } else if (targetType === 'item') {
            const itemDoc = await getDoc(doc(db, "items", report.targetId))
            if (itemDoc.exists()) targetData = itemDoc.data()
          } else if (targetType === 'exchange' || targetType === 'chat') {
            const exchangeDoc = await getDoc(doc(db, "exchanges", report.targetId))
            if (exchangeDoc.exists()) {
              const data = exchangeDoc.data()
              // Use itemTitle as title for exchanges
              targetData = { ...data, title: data.itemTitle || 'แชท/การแลกเปลี่ยน' }
            }
          }
          
          // If still no targetData but we have targetTitle from report, use it
          if (!targetData && report.targetTitle) {
            targetData = { title: report.targetTitle, email: report.targetTitle }
          }
          
          return { ...report, targetData }
        } catch (e) {
          console.error(`[AdminReports] Error fetching target for report ${report.id}:`, e)
          // Use targetTitle as fallback
          if (report.targetTitle) {
            return { ...report, targetData: { title: report.targetTitle, email: report.targetTitle } }
          }
          return report
        }
      }))
      
      setReports(reportsWithDetails)
    } catch (error) {
      console.error("[AdminReports] Error loading data:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลรายงานได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }

    const run = async () => {
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
        console.error("[AdminReports] Error checking admin:", error)
        router.push("/dashboard")
      }
    }

    run()
  }, [authLoading, loadData, router, toast, user])

  // อัปเดตอัตโนมัติทุก 30 วินาที เฉพาะเมื่อแท็บเปิดอยู่
  useEffect(() => {
    if (!isAdmin) return
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      loadData()
    }, 30_000)
    return () => clearInterval(interval)
  }, [isAdmin, loadData])

  const handleUpdateStatus = async (status: ReportStatus) => {
    if (!selectedReport || !user) return

    setProcessing(true)
    try {
      await updateReportStatus(
        selectedReport.id,
        status,
        user.uid,
        user.email || ""
      )
      
      toast({ title: "อัปเดตสถานะสำเร็จ" })
      setSelectedReport(null)
      loadData()
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  const handleNotifyOwner = async () => {
    if (!selectedReport || !user) return
    const reportedUserId = (selectedReport as any).reportedUserId || selectedReport.targetData?.postedBy
    if (!reportedUserId) {
      toast({ title: "ไม่พบข้อมูลเจ้าของโพส", variant: "destructive" })
      return
    }

    setNotifyOwnerLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/admin/reports/${selectedReport.id}/notify-owner`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error?.message || "แจ้งเตือนไม่สำเร็จ")
      toast({ title: "แจ้งเตือนเจ้าของโพสแล้ว" })
    } catch (error: any) {
      toast({ title: "แจ้งเตือนไม่สำเร็จ", description: error.message, variant: "destructive" })
    } finally {
      setNotifyOwnerLoading(false)
    }
  }

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const filteredReports = reports.filter(r => {
    const q = searchQuery.toLowerCase()
    
    // Check main report fields
    if (r.id.toLowerCase().includes(q) || 
        r.reporterEmail.toLowerCase().includes(q) || 
        r.reason.toLowerCase().includes(q) || 
        (r.description || "").toLowerCase().includes(q)) {
      return true
    }
    
    // Check target data
    if (r.targetId.toLowerCase().includes(q)) return true
    
    if (r.targetData) {
      if (r.targetData.email && r.targetData.email.toLowerCase().includes(q)) return true
      if (r.targetData.title && r.targetData.title.toLowerCase().includes(q)) return true
    }
    
    return false
  })

  // Update these to use filteredReports instead of reports
  const pendingReports = filteredReports.filter(r => ['new', 'under_review', 'waiting_user'].includes(r.status))
  const historyReports = filteredReports.filter(r => !['new', 'under_review', 'waiting_user'].includes(r.status))

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-7xl mx-auto px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Flag className="h-8 w-8 text-primary" />
              จัดการรายงาน
            </h1>
            <p className="text-muted-foreground">ตรวจสอบและจัดการรายงานความไม่เหมาะสม</p>
          </div>
        </div>
      </div>

      {/* สถิติรายงาน – 3 การ์ด: ทั้งหมด / รอตรวจสอบ / จบแล้ว */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg dark:bg-primary/20">
              <Flag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{reports.length}</div>
              <p className="text-xs text-muted-foreground">รายงานทั้งหมดในระบบ</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {reports.filter(r => ['new', 'under_review', 'waiting_user'].includes(r.status)).length}
              </div>
              <p className="text-xs text-muted-foreground">รอตรวจสอบ (ยังไม่จบ)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-green-100 dark:bg-green-950/50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {reports.filter(r => ['resolved', 'action_taken', 'rejected', 'closed'].includes(r.status)).length}
              </div>
              <p className="text-xs text-muted-foreground">จบแล้ว (แก้ไข/ปิด/ปฏิเสธ)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="border-b px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              รายการที่ต้องจัดการ
              <Badge variant="secondary" className="ml-2 px-3 py-1">
                {filteredReports.length} รายการ
              </Badge>
            </CardTitle>
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหารายงาน..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background w-full md:w-[300px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="pending" className="w-full">
            <div className="px-6 py-3 border-b bg-muted/30">
              <TabsList className="bg-muted/50 p-1">
                <TabsTrigger value="pending" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                   รอดำเนินการ 
                   <Badge variant="secondary" className="px-1.5 h-5 text-[10px] bg-muted-foreground/10 text-foreground">{pendingReports.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                   ประวัติ
                   <Badge variant="secondary" className="px-1.5 h-5 text-[10px] bg-muted-foreground/10 text-foreground">{historyReports.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="pending" className="m-0">
               <ReportsTable 
                 key={`pending-${pendingReports.length}`}
                 data={pendingReports} 
                 onView={(r) => setSelectedReport(r)} 
                 emptyMessage="ไม่มีรายการที่รอดำเนินการ"
               />
            </TabsContent>
            
            <TabsContent value="history" className="m-0">
               <ReportsTable 
                 key={`history-${historyReports.length}`}
                 data={historyReports} 
                 onView={(r) => setSelectedReport(r)} 
                 emptyMessage="ไม่มีประวัติการรายงาน"
               />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Report Detail Modal */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden flex flex-col gap-0 max-h-[85vh]">
          <DialogHeader className="p-6 pb-4 pr-24 border-b bg-muted/10 shrink-0">
             <div className="flex items-start justify-between gap-4">
               <div className="space-y-1">
                 <div className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-destructive" />
                    <DialogTitle className="text-xl font-bold tracking-tight">รายละเอียดการรายงาน</DialogTitle>
                 </div>
                 <div className="flex items-center gap-2 text-sm text-muted-foreground pl-7">
                    <span>ID: {selectedReport?.id}</span>
                    <span className="text-border">•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {selectedReport && ((selectedReport.createdAt as any)?.toDate?.() || new Date()).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                 </div>
               </div>
               {selectedReport && (
                 <Badge className={statusBadgeStyles[selectedReport.status]}>
                   {statusLabels[selectedReport.status]}
                 </Badge>
               )}
             </div>
          </DialogHeader>
          
          {selectedReport && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Type and Target Info */}
              <div className="grid md:grid-cols-2 gap-6">
                 {/* Report Info */}
                 <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/30 border">
                       <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ข้อมูลการแจ้ง
                       </h3>
                       <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-3 gap-2">
                             <span className="text-muted-foreground">หัวข้อ:</span>
                             <span className="col-span-2 font-medium">{reportReasonLabels[selectedReport.reason] || selectedReport.reason}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                             <span className="text-muted-foreground">รายละเอียด:</span>
                             <span className="col-span-2">{selectedReport.description || "-"}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                             <span className="text-muted-foreground">ผู้แจ้ง:</span>
                             <span className="col-span-2">{selectedReport.reporterEmail}</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Target Info */}
                 <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/30 border h-full">
                       <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          {selectedReport.targetType === 'user' ? (
                             <UserIcon className="h-4 w-4 text-blue-500" />
                          ) : (
                             <Package className="h-4 w-4 text-blue-500" />
                          )}
                          เป้าหมาย ({selectedReport.targetType === 'user' ? 'ผู้ใช้' : 'โพส'})
                       </h3>
                       <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-3 gap-2">
                             <span className="text-muted-foreground">ID:</span>
                             <span className="col-span-2 font-mono text-xs">{selectedReport.targetId}</span>
                          </div>
                          {selectedReport.targetData ? (
                             <>
                                {selectedReport.targetType === 'user' ? (
                                   <div className="grid grid-cols-3 gap-2">
                                      <span className="text-muted-foreground">อีเมล:</span>
                                      <span className="col-span-2 font-medium">{selectedReport.targetData.email}</span>
                                   </div>
                                ) : (
                                   <>
                                      <div className="grid grid-cols-3 gap-2">
                                         <span className="text-muted-foreground">ชื่อ:</span>
                                         <span className="col-span-2 font-medium">{selectedReport.targetData.title}</span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                         <span className="text-muted-foreground">ผู้ลง:</span>
                                         <span className="col-span-2">{selectedReport.targetData.postedByEmail}</span>
                                      </div>
                                   </>
                                )}
                             </>
                          ) : (
                             <div className="col-span-3 text-destructive italic">ไม่พบข้อมูล (อาจถูกลบไปแล้ว)</div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Evidence Image */}
              {selectedReport.evidenceUrls && selectedReport.evidenceUrls.length > 0 && (
                 <div>
                    <h3 className="text-sm font-semibold mb-2">หลักฐานรูปภาพ (คลิกเพื่อขยาย)</h3>
                    <div className="flex flex-wrap gap-3">
                       {selectedReport.evidenceUrls.map((url, i) => (
                          <button
                             key={url}
                             type="button"
                             onClick={() => setEnlargedImageUrl(url)}
                             className="relative aspect-video w-full max-w-[280px] rounded-lg overflow-hidden border bg-muted cursor-pointer hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                             <Image
                                src={url}
                                alt={`หลักฐาน ${i + 1}`}
                                fill
                                className="object-contain"
                                unoptimized
                             />
                          </button>
                       ))}
                    </div>
                 </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <DialogFooter className="p-4 border-t bg-muted/10 shrink-0 gap-2 sm:gap-0">
             <div className="flex gap-2 w-full justify-end flex-wrap">
                {selectedReport && ((selectedReport as any).reportedUserId || selectedReport.targetData?.postedBy) && (
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={handleNotifyOwner}
                     disabled={notifyOwnerLoading || processing}
                     className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
                   >
                     {notifyOwnerLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
                     แจ้งเตือนเจ้าของโพส
                   </Button>
                )}
                {selectedReport && ['new', 'under_review', 'waiting_user'].includes(selectedReport.status) && (
                   <>
                      <Button 
                         variant="outline" 
                         className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                         onClick={() => handleUpdateStatus('rejected')}
                         disabled={processing}
                      >
                         <XCircle className="h-4 w-4 mr-2" />
                         ปฏิเสธ
                      </Button>
                      <Button 
                         variant="default"
                         className="bg-green-600 hover:bg-green-700"
                         onClick={() => handleUpdateStatus('resolved')}
                         disabled={processing}
                      >
                         <CheckCircle2 className="h-4 w-4 mr-2" />
                         ดำเนินการแล้ว
                      </Button>
                   </>
                )}
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox สำหรับขยายรูปหลักฐาน */}
      <Dialog open={!!enlargedImageUrl} onOpenChange={(open) => !open && setEnlargedImageUrl(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden" showCloseButton={false}>
          <div className="relative w-full min-h-[50vh] flex items-center justify-center p-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={() => setEnlargedImageUrl(null)}
              aria-label="ปิด"
            >
              <X className="w-5 h-5" />
            </Button>
            {enlargedImageUrl && (
              <Image
                src={enlargedImageUrl}
                alt="หลักฐานขยาย"
                width={1200}
                height={800}
                className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
                unoptimized
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}

function ReportsTable({ 
  data, 
  onView, 
  emptyMessage 
}: { 
  data: ReportWithDetails[], 
  onView: (report: ReportWithDetails) => void, 
  emptyMessage: string 
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.ceil(data.length / itemsPerPage)
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่แจ้ง</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>เป้าหมาย</TableHead>
              <TableHead>ข้อหา</TableHead>
              <TableHead>ผู้แจ้ง</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Flag className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>{emptyMessage}</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="text-nowrap text-muted-foreground">
                    {((report.createdAt as any)?.toDate?.() || new Date()).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {(report.reportType && reportTypeLabels[report.reportType]) || 
                       (report.targetType && targetTypeLabels[report.targetType]) || 
                       report.reportType || report.targetType || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="truncate font-medium">
                      {report.targetData 
                        ? (report.targetType === 'user' ? report.targetData.email : report.targetData.title)
                        : <span className="text-muted-foreground italic">Unknown ID: {report.targetId}</span>
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-destructive">
                      {reportReasonLabels[report.reason] || report.reason}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="truncate max-w-[150px] text-muted-foreground">
                      {report.reporterEmail}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadgeStyles[report.status]}>
                      {statusLabels[report.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => onView(report)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {data.length > itemsPerPage && (
        <div className="flex items-center justify-center gap-2 p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ก่อนหน้า
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
              Math.max(0, currentPage - 3),
              Math.min(totalPages, currentPage + 2)
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
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            ถัดไป
          </Button>
        </div>
      )}
    </div>
  )
}
