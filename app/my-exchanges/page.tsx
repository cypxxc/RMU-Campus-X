"use client"

import { useEffect, useState, useCallback, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { authFetchJson } from "@/lib/api-client"
import { cancelExchange, hideExchange, createNotification, respondToExchange } from "@/lib/firestore"
import type { Exchange } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageCircle, X, Trash2, AlertTriangle, RefreshCw, CheckCheck, XCircle } from "lucide-react"
import { format, isToday, isYesterday } from "date-fns"
import { th, enUS } from "date-fns/locale"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
const ReportModal = lazy(() => import("@/components/report-modal").then((m) => ({ default: m.ReportModal })))
import { CancelExchangeDialog, DeleteExchangeDialog } from "@/components/exchange/exchange-action-dialogs"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import { Package } from "lucide-react"
import { useI18n } from "@/components/language-provider"

export default function MyExchangesPage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [exchangeToCancel, setExchangeToCancel] = useState<Exchange | null>(null)
  
  // cancelReason moved to CancelExchangeDialog to prevent page re-renders
  
  const [exchangeToDelete, setExchangeToDelete] = useState<Exchange | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportExchangeId, setReportExchangeId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { locale, tt } = useI18n()
  const statusLabels = {
    pending: tt("รอเจ้าของตอบรับ", "Waiting for owner response"),
    accepted: tt("กำลังดำเนินการ", "In progress"),
    in_progress: tt("กำลังดำเนินการ", "In progress"),
    completed: tt("เสร็จสิ้น", "Completed"),
    cancelled: tt("ยกเลิกแล้ว", "Cancelled"),
    rejected: tt("ปฏิเสธแล้ว", "Rejected"),
  } as const

  const loadExchanges = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) return
    const silent = options?.silent ?? false
    if (!silent) setLoading(true)
    try {
      const res = await authFetchJson<{ exchanges?: Exchange[] }>("/api/exchanges", { method: "GET" })
      const list = res.data?.exchanges ?? []
      setExchanges(list as Exchange[])
    } catch (error: unknown) {
      if (!silent) {
        toast({
          title: tt("เกิดข้อผิดพลาด", "Error"),
          description: error instanceof Error ? error.message : tt("ไม่สามารถโหลดการแลกเปลี่ยนได้", "Unable to load exchanges"),
          variant: "destructive",
        })
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [user, toast, tt])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    } else if (!authLoading && user) {
      loadExchanges()
    }
  }, [user, authLoading, router, loadExchanges])

  // อัปเดตอัตโนมัติเมื่อเปิดแท็บอยู่ (ไม่ต้องกดรีเฟรช)
  useEffect(() => {
    if (!user || typeof document === "undefined") return
    const POLL_INTERVAL_MS = 25_000 // 25 วินาที
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") loadExchanges({ silent: true })
    }, POLL_INTERVAL_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") loadExchanges({ silent: true })
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [user, loadExchanges])

  const handleCancelExchange = async (reason: string) => {
    if (!exchangeToCancel || !user) return

    setCancellingId(exchangeToCancel.id)
    try {
      await cancelExchange(
        exchangeToCancel.id,
        exchangeToCancel.itemId,
        user.uid,
        reason.trim() || undefined,
      )

      toast({
        title: tt("ยกเลิกสำเร็จ", "Cancelled"),
        description: tt("การแลกเปลี่ยนถูกยกเลิกแล้ว", "This exchange has been cancelled."),
      })

      // Notify the other party
      const recipientId = user.uid === exchangeToCancel.ownerId ? exchangeToCancel.requesterId : exchangeToCancel.ownerId
      
      const reasonText = reason.trim() ? tt(`. เหตุผล: ${reason.trim()}`, `. Reason: ${reason.trim()}`) : ""
      await createNotification({
        userId: recipientId,
        title: tt("การแลกเปลี่ยนถูกยกเลิก", "Exchange cancelled"),
        message: tt(
          `การแลกเปลี่ยน "${exchangeToCancel.itemTitle}" ถูกยกเลิกโดยอีกฝ่าย${reasonText}`,
          `Exchange "${exchangeToCancel.itemTitle}" was cancelled by the other party${reasonText}`
        ),
        type: "exchange",
        relatedId: exchangeToCancel.id,
        senderId: user.uid,
      })

      // Send LINE notification to the other party (async, don't block)
      try {
        user.getIdToken().then((token) => {
          fetch("/api/line/notify-chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              type: "status_change",
              recipientUserId: recipientId,
              itemTitle: exchangeToCancel.itemTitle,
              status: "cancelled",
              exchangeId: exchangeToCancel.id,
            }),
          }).catch((err) => console.log("[LINE] Notify cancel error:", err))
        })
      } catch (lineError) {
        console.log('[LINE] Notify cancel error:', lineError)
      }

      // Reload exchanges
      await loadExchanges()
    } catch (error: unknown) {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: error instanceof Error ? error.message : tt("ไม่สามารถยกเลิกการแลกเปลี่ยนได้", "Unable to cancel exchange"),
        variant: "destructive",
      })
    } finally {
      setCancellingId(null)
      setExchangeToCancel(null)
    }
  }

  // Check if user can cancel this exchange
  const canCancel = (exchange: Exchange, isRequester: boolean) => {
    const cancellableStatuses = ["pending", "accepted", "in_progress"]

    if (isRequester) {
      return cancellableStatuses.includes(exchange.status)
    } else {
      // Owner can cancel any non-completed status
      return cancellableStatuses.includes(exchange.status) || exchange.status === "rejected"
    }
  }

  // เจ้าของโพสเท่านั้น ตอบรับ/ปฏิเสธได้ เมื่อสถานะรอการตอบรับ
  const canRespond = (exchange: Exchange, isRequester: boolean) => {
    return !isRequester && exchange.status === "pending"
  }

  const handleRespond = async (exchangeId: string, action: "accept" | "reject") => {
    if (!user) return
    setRespondingId(exchangeId)
    try {
      await respondToExchange(exchangeId, action, user.uid)
      toast({
        title: action === "accept" ? tt("ตอบรับแล้ว", "Accepted") : tt("ปฏิเสธแล้ว", "Rejected"),
        description: action === "accept"
          ? tt("เข้าสู่ขั้นตอนกำลังดำเนินการแล้ว สามารถเปิดแชทเพื่อนัดหมายได้", "Exchange is now in progress. You can open chat to arrange pickup.")
          : tt("คำขอถูกปฏิเสธแล้ว", "The request has been rejected."),
      })
      await loadExchanges()
    } catch (error: unknown) {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: error instanceof Error ? error.message : tt("ไม่สามารถดำเนินการได้", "Unable to proceed"),
        variant: "destructive",
      })
    } finally {
      setRespondingId(null)
    }
  }

  // Check if exchange can be deleted
  const canDelete = (exchange: Exchange) => {
    return ["cancelled", "completed", "rejected"].includes(exchange.status)
  }

  const handleDeleteExchange = async () => {
    if (!exchangeToDelete) return

    setDeleting(true)
    try {
      await hideExchange(exchangeToDelete.id)

      toast({
        title: tt("ซ่อนจากรายการแล้ว", "Removed from list"),
        description: tt("แชทจะหายจากรายการของคุณ แต่อีกฝ่ายยังเห็นได้", "This chat is hidden from your list, but still visible to the other party."),
      })

      await loadExchanges()
    } catch (error: unknown) {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: error instanceof Error ? error.message : tt("ไม่สามารถลบการแลกเปลี่ยนได้", "Unable to remove exchange"),
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setExchangeToDelete(null)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      pending: "badge-warning",
      accepted: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      in_progress: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      completed: "bg-primary/10 text-primary border-primary/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
      rejected: "bg-muted text-muted-foreground border-border",
    }
    return classes[status] || "bg-muted text-muted-foreground border-border"
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">{tt("การแลกเปลี่ยนของฉัน", "My exchanges")}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {tt(`ตรวจสอบรายการแลกเปลี่ยนทั้งหมด (${exchanges.length} รายการ)`, `Review all exchanges (${exchanges.length} items)`)}
            </p>
          </div>
        </div>

        {loading ? (
          /* Loading Skeleton */
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-border/60 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-1/2 mb-4" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </Card>
            ))}
          </div>
        ) : exchanges.length === 0 ? (
          <Empty className="py-16 bg-muted/10 border border-dashed rounded-2xl">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="rounded-2xl size-14 [&_svg]:size-8">
                <RefreshCw className="text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>{tt("ยังไม่มีการแลกเปลี่ยน", "No exchanges yet")}</EmptyTitle>
              <EmptyDescription>
                {tt("เริ่มการแลกเปลี่ยนโดยการขอรับสิ่งของจากหน้าหลัก", "Start an exchange by requesting an item from the dashboard.")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild>
                  <Link href="/dashboard">
                    <Package className="mr-2 h-4 w-4" />
                    {tt("ไปที่หน้าหลัก", "Go to dashboard")}
                  </Link>
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        ) : (
          /* Exchange List */
          <>
            <div className="space-y-4 content-auto block">
              {exchanges
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((exchange) => {
                const createdDate = typeof exchange.createdAt === "string" ? new Date(exchange.createdAt) : (exchange.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() || new Date()
                const isRequester = user?.uid === exchange.requesterId

                return (
                    <Card 
                      key={exchange.id}
                      className="border-border/60 hover:border-border transition-colors"
                    >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg truncate">
                            {exchange.itemTitle}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {isRequester ? tt(`กับ ${exchange.ownerEmail}`, `with ${exchange.ownerEmail}`) : tt(`กับ ${exchange.requesterEmail}`, `with ${exchange.requesterEmail}`)}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`shrink-0 ${getStatusBadgeClass(exchange.status)}`}
                        >
                          {statusLabels[exchange.status as keyof typeof statusLabels] ?? exchange.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-xs text-muted-foreground">
                          {isToday(createdDate)
                            ? format(createdDate, "HH:mm", { locale: locale === "th" ? th : enUS })
                            : isYesterday(createdDate)
                              ? tt(
                                  `เมื่อวาน ${format(createdDate, "HH:mm", { locale: th })}`,
                                  `Yesterday ${format(createdDate, "HH:mm", { locale: enUS })}`
                                )
                              : createdDate.getFullYear() === new Date().getFullYear()
                                ? format(createdDate, "d MMM HH:mm", { locale: locale === "th" ? th : enUS })
                                : format(createdDate, "d MMM yyyy HH:mm", { locale: locale === "th" ? th : enUS })}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {/* เจ้าของโพส: ตอบรับ / ปฏิเสธ เมื่อสถานะรอการตอบรับ */}
                          {canRespond(exchange, isRequester) && (
                            <>
                              <Button
                                size="sm"
                                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                                disabled={respondingId === exchange.id}
                                onClick={() => handleRespond(exchange.id, "accept")}
                              >
                                {respondingId === exchange.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCheck className="h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">{tt("ตอบรับ", "Accept")}</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-destructive border-destructive/50 hover:bg-destructive/10"
                                disabled={respondingId === exchange.id}
                                onClick={() => handleRespond(exchange.id, "reject")}
                              >
                                <XCircle className="h-4 w-4" />
                                <span className="hidden sm:inline">{tt("ปฏิเสธ", "Reject")}</span>
                              </Button>
                            </>
                          )}

                          {/* Chat Button - ไม่แสดงเมื่อยกเลิกหรือปฏิเสธแล้ว */}
                          {exchange.status !== "cancelled" && exchange.status !== "rejected" && (
                            <Button asChild size="sm" className="gap-1.5">
                              <Link href={`/chat/${exchange.id}`}>
                                <MessageCircle className="h-4 w-4" />
                                <span className="hidden sm:inline">{tt("เปิดแชท", "Open chat")}</span>
                              </Link>
                            </Button>
                          )}

                          {/* Cancel Button */}
                          {canCancel(exchange, isRequester) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExchangeToCancel(exchange)
                              }}
                              disabled={cancellingId === exchange.id}
                              className="gap-1.5"
                            >
                              <X className="h-4 w-4" />
                              <span className="hidden sm:inline">{tt("ยกเลิก", "Cancel")}</span>
                            </Button>
                          )}

                          {/* Report Button */}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setReportExchangeId(exchange.id)
                              setShowReportModal(true)
                            }}
                            className="gap-1.5"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            <span className="hidden sm:inline">{tt("รายงาน", "Report")}</span>
                          </Button>

                          {/* Delete Button */}
                          {canDelete(exchange) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setExchangeToDelete(exchange)}
                              disabled={deleting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            
            {/* Pagination */}
            {exchanges.length > itemsPerPage && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {tt("ก่อนหน้า", "Previous")}
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(exchanges.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
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
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(exchanges.length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(exchanges.length / itemsPerPage)}
                >
                  {tt("ถัดไป", "Next")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cancel Dialog */}
      <CancelExchangeDialog
        exchange={exchangeToCancel}
        open={!!exchangeToCancel}
        onOpenChange={(open) => !open && setExchangeToCancel(null)}
        onConfirm={handleCancelExchange}
        isRequester={user?.uid === exchangeToCancel?.requesterId}
      />

      {/* Delete Dialog */}
      <DeleteExchangeDialog
        exchange={exchangeToDelete}
        open={!!exchangeToDelete}
        onOpenChange={(open) => !open && setExchangeToDelete(null)}
        onConfirm={handleDeleteExchange}
        deleting={deleting}
      />

      {/* Report Modal */}
      {reportExchangeId && (
        <Suspense fallback={null}>
          <ReportModal
            open={showReportModal}
            onOpenChange={setShowReportModal}
            reportType="exchange_report"
            targetId={reportExchangeId}
            targetTitle={exchanges.find(e => e.id === reportExchangeId)?.itemTitle}
          />
        </Suspense>
      )}
    </div>
  )
}
