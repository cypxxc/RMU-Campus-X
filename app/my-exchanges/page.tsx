"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { authFetchJson } from "@/lib/api-client"
import { cancelExchange, deleteExchange, createNotification } from "@/lib/firestore"
import type { Exchange } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageCircle, X, Trash2, AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { ReportModal } from "@/components/report-modal"
import { CancelExchangeDialog, DeleteExchangeDialog } from "@/components/exchange/exchange-action-dialogs"
import { BounceWrapper } from "@/components/ui/bounce-wrapper"

export default function MyExchangesPage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
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

  const loadExchanges = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) return
    const silent = options?.silent ?? false
    if (!silent) setLoading(true)
    try {
      const res = await authFetchJson<{ exchanges?: Exchange[] }>("/api/exchanges", { method: "GET" })
      const list = res.data?.exchanges ?? []
      setExchanges(list as Exchange[])
    } catch (error: any) {
      if (!silent) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: error?.message || "ไม่สามารถโหลดการแลกเปลี่ยนได้",
          variant: "destructive",
        })
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [user, toast])

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
        title: "ยกเลิกสำเร็จ",
        description: "การแลกเปลี่ยนถูกยกเลิกแล้ว",
      })

      // Notify the other party
      const recipientId = user.uid === exchangeToCancel.ownerId ? exchangeToCancel.requesterId : exchangeToCancel.ownerId
      
      await createNotification({
        userId: recipientId,
        title: "การแลกเปลี่ยนถูกยกเลิก",
        message: `การแลกเปลี่ยน "${exchangeToCancel.itemTitle}" ถูกยกเลิกโดยอีกฝ่าย`,
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
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error?.message || "ไม่สามารถยกเลิกการแลกเปลี่ยนได้",
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

  // Check if exchange can be deleted
  const canDelete = (exchange: Exchange) => {
    return ["cancelled", "completed", "rejected"].includes(exchange.status)
  }

  const handleDeleteExchange = async () => {
    if (!exchangeToDelete) return

    setDeleting(true)
    try {
      await deleteExchange(exchangeToDelete.id)

      toast({
        title: "ลบสำเร็จ",
        description: "ลบแชทการแลกเปลี่ยนแล้ว",
      })

      await loadExchanges()
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error?.message || "ไม่สามารถลบการแลกเปลี่ยนได้",
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

  const statusLabels: Record<string, string> = {
    pending: "รอการตอบรับ",
    accepted: "ตอบรับแล้ว",
    in_progress: "กำลังดำเนินการ",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก",
    rejected: "ปฏิเสธ",
  }

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      pending: "badge-warning",
      accepted: "bg-blue-500/10 text-blue-600 border-blue-500/20",
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
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="mb-6 -ml-2 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">การแลกเปลี่ยนของฉัน</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              ตรวจสอบรายการแลกเปลี่ยนทั้งหมด ({exchanges.length} รายการ)
            </p>
          </div>
        </div>

        {exchanges.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">ยังไม่มีการแลกเปลี่ยน</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              เริ่มการแลกเปลี่ยนโดยการขอรับสิ่งของจากหน้า Dashboard
            </p>
            <Button asChild>
              <Link href="/dashboard">ไปที่ Dashboard</Link>
            </Button>
          </div>
        ) : (
          /* Exchange List */
          <>
            <div className="space-y-4 content-auto block">
              {exchanges
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((exchange, index) => {
                const createdDate = typeof exchange.createdAt === "string" ? new Date(exchange.createdAt) : (exchange.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() || new Date()
                const isRequester = user?.uid === exchange.requesterId

                return (
                  <BounceWrapper 
                    key={exchange.id} 
                    variant="bounce-up"
                    delay={index * 0.05}
                  >
                    <Card 
                      className="border-border/60 hover:border-border transition-colors"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg truncate">
                            {exchange.itemTitle}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {isRequester ? `กับ ${exchange.ownerEmail}` : `กับ ${exchange.requesterEmail}`}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`shrink-0 ${getStatusBadgeClass(exchange.status)}`}
                        >
                          {statusLabels[exchange.status]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(createdDate, { addSuffix: true, locale: th })}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {/* Chat Button */}
                          <Button asChild size="sm" className="gap-1.5">
                            <Link href={`/chat/${exchange.id}`}>
                              <MessageCircle className="h-4 w-4" />
                              <span className="hidden sm:inline">เปิดแชท</span>
                            </Link>
                          </Button>

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
                              <span className="hidden sm:inline">ยกเลิก</span>
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
                            <span className="hidden sm:inline">รายงาน</span>
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
                  </BounceWrapper>
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
                  ก่อนหน้า
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
                  ถัดไป
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
        <ReportModal
          open={showReportModal}
          onOpenChange={setShowReportModal}
          reportType="exchange_report"
          targetId={reportExchangeId}
          targetTitle={exchanges.find(e => e.id === reportExchangeId)?.itemTitle}
        />
      )}
    </div>
  )
}

