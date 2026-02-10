"use client"



import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { checkIsAdmin, getDocById } from "@/lib/services/client-firestore"
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
  Bell,
  Filter
} from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/components/language-provider"
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus"


const reportReasonLabels: Record<string, { th: string; en: string }> = {
  spam: { th: "สแปม / โฆษณา", en: "Spam / advertising" },
  inappropriate: { th: "เนื้อหาไม่เหมาะสม", en: "Inappropriate content" },
  harassment: { th: "การคุกคาม / รังแก", en: "Harassment / bullying" },
  scam: { th: "ฉ้อโกง / หลอกลวง", en: "Scam / fraud" },
  other: { th: "อื่นๆ", en: "Other" },
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

const statusLabels: Record<string, { th: string; en: string }> = {
  new: { th: "ใหม่", en: "New" },
  under_review: { th: "กำลังตรวจสอบ", en: "Under review" },
  waiting_user: { th: "รอข้อมูลเพิ่มเติม", en: "Waiting for user" },
  action_taken: { th: "ดำเนินการแล้ว", en: "Action taken" },
  resolved: { th: "แก้ไขแล้ว", en: "Resolved" },
  closed: { th: "ปิดเคส", en: "Closed" },
  rejected: { th: "ปฏิเสธ", en: "Rejected" },
}

// Report type labels (using reportType like item_report, user_report)
const reportTypeLabels: Record<string, { th: string; en: string }> = {
  item_report: { th: "โพส", en: "Post" },
  exchange_report: { th: "การแลกเปลี่ยน", en: "Exchange" },
  chat_report: { th: "แชท", en: "Chat" },
  user_report: { th: "ผู้ใช้", en: "User" },
}

// Target type labels (using targetType like item, user)
const targetTypeLabels: Record<string, { th: string; en: string }> = {
  item: { th: "โพส", en: "Post" },
  exchange: { th: "การแลกเปลี่ยน", en: "Exchange" },
  chat: { th: "แชท", en: "Chat" },
  user: { th: "ผู้ใช้", en: "User" },
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
  const [rejectionReason, setRejectionReason] = useState("")

  const [processing, setProcessing] = useState(false)
  const [notifyOwnerLoading, setNotifyOwnerLoading] = useState(false)
  
  const { user, loading: authLoading } = useAuth()
  const { locale, tt } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportedUserId = searchParams.get("reportedUserId")
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const reportsData = await getReports()
      
      // Fetch details for each report target (Logic อยู่ใน client-firestore)
      const reportsWithDetails = await Promise.all(reportsData.map(async (report: ReportWithDetails) => {
        try {
          const targetType = report.targetType || (
            report.reportType === 'user_report' ? 'user' :
            report.reportType === 'item_report' ? 'item' :
            report.reportType === 'exchange_report' ? 'exchange' :
            report.reportType === 'chat_report' ? 'exchange' :
            null
          )

          let targetData: Record<string, unknown> | null = null
          if (targetType === 'user') {
            targetData = await getDocById("users", report.targetId)
          } else if (targetType === 'item') {
            targetData = await getDocById("items", report.targetId)
          } else if (targetType === 'exchange' || targetType === 'chat') {
            const data = await getDocById("exchanges", report.targetId)
            if (data) {
              targetData = { ...data, title: (data.itemTitle as string) || tt("แชท/การแลกเปลี่ยน", "Chat/Exchange") }
            }
          }

          if (!targetData && report.targetTitle) {
            targetData = { title: report.targetTitle, email: report.targetTitle }
          }

          return { ...report, targetData }
        } catch (e) {
          console.error(`[AdminReports] Error fetching target for report ${report.id}:`, e)
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
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: tt("ไม่สามารถโหลดข้อมูลรายงานได้", "Unable to load reports"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, tt])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }

    const run = async () => {
      if (!user) return

      try {
        const isAdmin = await checkIsAdmin(user.email ?? undefined)
        if (!isAdmin) {
          toast({
            title: tt("ไม่มีสิทธิ์เข้าถึง", "Access denied"),
            description: tt("คุณไม่มีสิทธิ์ใช้งานหน้าผู้ดูแลระบบ", "You do not have permission to access admin pages."),
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
  }, [authLoading, loadData, router, toast, user, tt])

  useRefreshOnFocus(loadData, { enabled: isAdmin, minIntervalMs: 10_000 })

  const handleUpdateStatus = async (status: ReportStatus) => {
    if (!selectedReport || !user) return

    const note = status === "rejected" ? rejectionReason.trim() : undefined
    if (status === "rejected" && !note) {
      toast({
        title: tt("กรุณาระบุเหตุผลการปฏิเสธ", "Please provide a rejection reason"),
        description: tt("ระบบจะส่งเหตุผลนี้ไปยังผู้แจ้งรายงาน", "This reason will be sent to the reporter"),
        variant: "destructive",
      })
      return
    }

    setProcessing(true)
    try {
      await updateReportStatus(selectedReport.id, status, user.uid, user.email || "", note)
      toast({ title: tt("อัปเดตสถานะสำเร็จ", "Status updated") })
      setSelectedReport(null)
      setRejectionReason("")
      loadData()
    } catch (error: any) {
      toast({ title: tt("เกิดข้อผิดพลาด", "Error"), description: error.message, variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  const handleNotifyOwner = async () => {
    if (!selectedReport || !user) return
    const reportedUserId = (selectedReport as any).reportedUserId || selectedReport.targetData?.postedBy
    if (!reportedUserId) {
      toast({ title: tt("ไม่พบข้อมูลเจ้าของโพส", "Owner data not found"), variant: "destructive" })
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
      if (!res.ok) throw new Error(json?.error?.message || tt("แจ้งเตือนไม่สำเร็จ", "Notification failed"))
      toast({ title: tt("แจ้งเตือนเจ้าของโพสแล้ว", "Owner notified") })
    } catch (error: any) {
      toast({ title: tt("แจ้งเตือนไม่สำเร็จ", "Notification failed"), description: error.message, variant: "destructive" })
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

  const filteredBySearch = reports.filter(r => {
    const q = searchQuery.toLowerCase()
    if (!q) return true
    if (r.id.toLowerCase().includes(q) || 
        r.reporterEmail.toLowerCase().includes(q) || 
        r.reason.toLowerCase().includes(q) || 
        (r.description || "").toLowerCase().includes(q)) return true
    if (r.targetId.toLowerCase().includes(q)) return true
    if (r.targetData) {
      if (r.targetData.email && r.targetData.email.toLowerCase().includes(q)) return true
      if (r.targetData.title && r.targetData.title.toLowerCase().includes(q)) return true
    }
    return false
  })

  const filteredReports = reportedUserId
    ? filteredBySearch.filter(r => (r as Report & { reportedUserId?: string }).reportedUserId === reportedUserId)
    : filteredBySearch

  const reportedUserEmail = reportedUserId && reports.find(r => (r as Report & { reportedUserId?: string }).reportedUserId === reportedUserId)
    ? (reports.find(r => (r as Report & { reportedUserId?: string }).reportedUserId === reportedUserId) as Report & { reportedUserEmail?: string })?.reportedUserEmail || reportedUserId
    : reportedUserId

  // Update these to use filteredReports instead of reports
  const pendingReports = filteredReports.filter(r => ['new', 'under_review', 'waiting_user'].includes(r.status))
  const historyReports = filteredReports.filter(r => !['new', 'under_review', 'waiting_user'].includes(r.status))
  const selectedStatusLabel = selectedReport ? statusLabels[selectedReport.status] : undefined
  const selectedReasonLabel = selectedReport ? reportReasonLabels[selectedReport.reason] : undefined

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-7xl mx-auto px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Flag className="h-8 w-8 text-primary" />
              {tt("จัดการรายงาน", "Manage reports")}
            </h1>
            <p className="text-muted-foreground">{tt("ตรวจสอบและจัดการรายงานความไม่เหมาะสม", "Review and resolve inappropriate reports")}</p>
          </div>
        </div>
      </div>

      {/* กรองตามผู้ใช้ถูกรายงาน */}
      {reportedUserId && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-primary/5 border-primary/20 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">
              {tt("แสดงรายงานที่เกี่ยวกับผู้ใช้:", "Showing reports for user:")} <span className="font-mono text-primary">{reportedUserEmail || reportedUserId}</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/reports")}
            className="gap-2 shrink-0"
          >
            <X className="h-4 w-4" />
            {tt("ล้างตัวกรอง", "Clear filter")}
          </Button>
        </div>
      )}

      {/* สถิติรายงาน – 3 การ์ด: ทั้งหมด / รอตรวจสอบ / จบแล้ว */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg dark:bg-primary/20">
              <Flag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{reports.length}</div>
              <p className="text-xs text-muted-foreground">{tt("รายงานทั้งหมดในระบบ", "Total reports in system")}</p>
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
              <p className="text-xs text-muted-foreground">{tt("รอตรวจสอบ (ยังไม่จบ)", "Pending review (not completed)")}</p>
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
              <p className="text-xs text-muted-foreground">{tt("จบแล้ว (แก้ไข/ปิด/ปฏิเสธ)", "Completed (resolved/closed/rejected)")}</p>
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
              {tt("รายการที่ต้องจัดการ", "Reports to manage")}
              <Badge variant="secondary" className="ml-2 px-3 py-1">
                {tt(`${filteredReports.length} รายการ`, `${filteredReports.length} records`)}
              </Badge>
            </CardTitle>
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tt("ค้นหารายงาน...", "Search reports...")}
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
                   {tt("รอดำเนินการ", "Pending")}
                   <Badge variant="secondary" className="px-1.5 h-5 text-[10px] bg-muted-foreground/10 text-foreground">{pendingReports.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                   {tt("ประวัติ", "History")}
                   <Badge variant="secondary" className="px-1.5 h-5 text-[10px] bg-muted-foreground/10 text-foreground">{historyReports.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="pending" className="m-0">
               <ReportsTable 
                 key={`pending-${pendingReports.length}`}
                 data={pendingReports} 
                 onView={(r) => {
                   setSelectedReport(r)
                   setRejectionReason((r.adminNote as string) || "")
                 }} 
                 emptyMessage={tt("ไม่มีรายการที่รอดำเนินการ", "No pending reports")}
                 locale={locale}
               />
            </TabsContent>
            
            <TabsContent value="history" className="m-0">
               <ReportsTable 
                 key={`history-${historyReports.length}`}
                 data={historyReports} 
                 onView={(r) => {
                   setSelectedReport(r)
                   setRejectionReason((r.adminNote as string) || "")
                 }} 
                 emptyMessage={tt("ไม่มีประวัติการรายงาน", "No report history")}
                 locale={locale}
               />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Report Detail Modal */}
      <Dialog
        open={!!selectedReport}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedReport(null)
            setRejectionReason("")
          }
        }}
      >
        <DialogContent className="max-w-3xl p-0 overflow-hidden flex flex-col gap-0 max-h-[85vh]">
          <DialogHeader className="p-6 pb-4 pr-24 border-b bg-muted/10 shrink-0">
             <div className="flex items-start justify-between gap-4">
               <div className="space-y-1">
                 <div className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-destructive" />
                    <DialogTitle className="text-xl font-bold tracking-tight">{tt("รายละเอียดการรายงาน", "Report details")}</DialogTitle>
                 </div>
                 <div className="flex items-center gap-2 text-sm text-muted-foreground pl-7">
                    <span>ID: {selectedReport?.id}</span>
                    <span className="text-border">•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {selectedReport && ((selectedReport.createdAt as any)?.toDate?.() || new Date()).toLocaleString(locale === "th" ? "th-TH" : "en-US", { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                 </div>
               </div>
               {selectedReport && (
                 <Badge className={statusBadgeStyles[selectedReport.status]}>
                   {selectedStatusLabel ? tt(selectedStatusLabel.th, selectedStatusLabel.en) : selectedReport.status}
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
                          {tt("ข้อมูลการแจ้ง", "Report information")}
                       </h3>
                       <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-3 gap-2">
                             <span className="text-muted-foreground">{tt("หัวข้อ:", "Reason:")}</span>
                             <span className="col-span-2 font-medium">
                               {selectedReasonLabel ? tt(selectedReasonLabel.th, selectedReasonLabel.en) : selectedReport.reason}
                             </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                             <span className="text-muted-foreground">{tt("รายละเอียด:", "Description:")}</span>
                             <span className="col-span-2">{selectedReport.description || "-"}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                             <span className="text-muted-foreground">{tt("ผู้แจ้ง:", "Reporter:")}</span>
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
                          {tt("เป้าหมาย", "Target")} ({selectedReport.targetType === 'user' ? tt("ผู้ใช้", "User") : tt("โพส", "Post")})
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
                                      <span className="text-muted-foreground">{tt("อีเมล:", "Email:")}</span>
                                      <span className="col-span-2 font-medium">{selectedReport.targetData.email}</span>
                                   </div>
                                ) : (
                                   <>
                                      <div className="grid grid-cols-3 gap-2">
                                         <span className="text-muted-foreground">{tt("ชื่อ:", "Title:")}</span>
                                         <span className="col-span-2 font-medium">{selectedReport.targetData.title}</span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                         <span className="text-muted-foreground">{tt("ผู้ลง:", "Owner:")}</span>
                                         <span className="col-span-2">{selectedReport.targetData.postedByEmail}</span>
                                      </div>
                                   </>
                                )}
                             </>
                          ) : (
                             <div className="col-span-3 text-destructive italic">{tt("ไม่พบข้อมูล (อาจถูกลบไปแล้ว)", "Data not found (possibly deleted)")}</div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Evidence Image */}
              {selectedReport.evidenceUrls && selectedReport.evidenceUrls.length > 0 && (
                 <div>
                    <h3 className="text-sm font-semibold mb-2">{tt("หลักฐานรูปภาพ (คลิกเพื่อขยาย)", "Evidence images (click to enlarge)")}</h3>
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
                                alt={`${tt("หลักฐาน", "Evidence")} ${i + 1}`}
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
             <div className="w-full space-y-3">
                {selectedReport && ['new', 'under_review', 'waiting_user'].includes(selectedReport.status) && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {tt("เหตุผลการปฏิเสธ (จำเป็นเมื่อกดปฏิเสธ และจะแจ้งไปยังผู้แจ้งรายงาน)", "Rejection reason (required for reject and sent to reporter)")}
                    </p>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder={tt("ระบุเหตุผลที่ปฏิเสธรายงานนี้...", "Specify why this report is rejected...")}
                      rows={3}
                      disabled={processing}
                    />
                  </div>
                )}

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
                       {tt("แจ้งเตือนเจ้าของโพส", "Notify owner")}
                     </Button>
                  )}
                  {selectedReport && ['new', 'under_review', 'waiting_user'].includes(selectedReport.status) && (
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      onClick={() => handleUpdateStatus('rejected')}
                      disabled={processing || !rejectionReason.trim()}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {tt("ปฏิเสธ", "Reject")}
                    </Button>
                  )}
                </div>
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
              aria-label={tt("ปิด", "Close")}
            >
              <X className="w-5 h-5" />
            </Button>
            {enlargedImageUrl && (
              <Image
                src={enlargedImageUrl}
                alt={tt("หลักฐานขยาย", "Expanded evidence")}
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
  emptyMessage,
  locale,
}: { 
  data: ReportWithDetails[], 
  onView: (report: ReportWithDetails) => void, 
  emptyMessage: string,
  locale?: "th" | "en",
}) {
  const { tt } = useI18n()
  const activeLocale = locale ?? "th"
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
              <TableHead>{tt("วันที่แจ้ง", "Reported at")}</TableHead>
              <TableHead>{tt("ประเภท", "Type")}</TableHead>
              <TableHead>{tt("เป้าหมาย", "Target")}</TableHead>
              <TableHead>{tt("ข้อหา", "Reason")}</TableHead>
              <TableHead>{tt("ผู้แจ้ง", "Reporter")}</TableHead>
              <TableHead>{tt("สถานะ", "Status")}</TableHead>
              <TableHead className="text-right">{tt("จัดการ", "Actions")}</TableHead>
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
                (() => {
                  const reportTypeLabel = report.reportType ? reportTypeLabels[report.reportType] : undefined
                  const targetTypeLabel = report.targetType ? targetTypeLabels[report.targetType] : undefined
                  const reasonLabel = reportReasonLabels[report.reason]
                  const statusLabel = statusLabels[report.status]

                  return (
                    <TableRow key={report.id}>
                      <TableCell className="text-nowrap text-muted-foreground">
                        {((report.createdAt as any)?.toDate?.() || new Date()).toLocaleString(activeLocale === "th" ? "th-TH" : "en-US", { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {(reportTypeLabel && tt(reportTypeLabel.th, reportTypeLabel.en)) ||
                            (targetTypeLabel && tt(targetTypeLabel.th, targetTypeLabel.en)) ||
                            report.reportType ||
                            report.targetType ||
                            '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate font-medium">
                          {report.targetData
                            ? (report.targetType === 'user' ? report.targetData.email : report.targetData.title)
                            : <span className="text-muted-foreground italic">{tt("ไม่พบ ID:", "Unknown ID:")} {report.targetId}</span>
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-destructive">
                          {reasonLabel ? tt(reasonLabel.th, reasonLabel.en) : report.reason}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="truncate max-w-[150px] text-muted-foreground">
                          {report.reporterEmail}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadgeStyles[report.status]}>
                          {statusLabel ? tt(statusLabel.th, statusLabel.en) : report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => onView(report)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })()
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
            {tt("ก่อนหน้า", "Previous")}
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
            {tt("ถัดไป", "Next")}
          </Button>
        </div>
      )}
    </div>
  )
}
