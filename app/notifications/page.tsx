"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from "@/lib/firestore"
import type { AppNotification } from "@/types"
import { Bell, MessageCircle, AlertTriangle, Package, Info, Loader2, CheckCheck, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const PAGE_SIZE = 10

function toNotificationDate(n: AppNotification): Date {
  const c = (n as any).createdAt
  if (!c) return new Date()
  if (typeof c.toDate === "function") return c.toDate()
  if (typeof c.toMillis === "function") return new Date(c.toMillis())
  if (typeof c._seconds === "number") return new Date(c._seconds * 1000)
  if (typeof c === "string") return new Date(c)
  return new Date()
}

function formatNotificationTime(n: AppNotification): string {
  return toNotificationDate(n).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all")
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const paginationLastIds = useRef<Map<number, string | null>>(new Map([[1, null]]))

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchNotifications = useCallback(async (page: number = 1) => {
    if (!user) return
    setLoading(true)
    try {
      const lastId = page === 1 ? null : paginationLastIds.current.get(page) ?? null
      const result = await getNotifications(user.uid, {
        pageSize: PAGE_SIZE,
        lastId,
      })
      if (!mountedRef.current) return
      setNotifications(result.notifications)
      setTotalCount(result.totalCount)
      if (result.lastId != null && result.hasMore) {
        paginationLastIds.current.set(page + 1, result.lastId)
      }
    } catch (error: unknown) {
      if (!mountedRef.current) return
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูลการแจ้งเตือนได้",
        variant: "destructive",
      })
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    } else if (!authLoading && user) {
      fetchNotifications(currentPage)
    }
  }, [user, authLoading, currentPage])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handleMarkAsRead = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id)
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      )
    }
    if (notification.relatedId) {
      if (notification.type === "chat") {
        router.push(`/chat/${notification.relatedId}`)
      } else if (notification.type === "exchange") {
        router.push("/my-exchanges")
      } else if (notification.type === "report") {
        router.push("/profile")
      } else if (notification.type === "support") {
        router.push(`/support?ticketId=${notification.relatedId}`)
      }
    }
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    try {
      await markAllNotificationsAsRead(user.uid)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      toast({ title: "อ่านการแจ้งเตือนทั้งหมดแล้ว" })
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" })
    }
  }

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const removed = notifications.find((n) => n.id === id)
    if (!removed) return

    // Optimistic: ลบออกจาก UI ทันที
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setTotalCount((prev) => Math.max(0, prev - 1))

    deleteNotification(id).catch(() => {
      setNotifications((prev) => [...prev, removed].sort((a, b) => {
        const tA = (a.createdAt as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0
        const tB = (b.createdAt as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0
        return tB - tA
      }))
      setTotalCount((prev) => prev + 1)
      toast({ title: "ลบไม่สำเร็จ", description: "กรุณาลองใหม่อีกครั้ง", variant: "destructive" })
    })
  }

  const getIcon = (type: string) => {
    const iconClasses = "h-5 w-5"
    switch (type) {
      case "chat": return <MessageCircle className={`${iconClasses} text-blue-500`} />
      case "exchange": return <Package className={`${iconClasses} text-primary`} />
      case "report": return <AlertTriangle className={`${iconClasses} text-amber-500`} />
      case "support": return <MessageCircle className={`${iconClasses} text-primary`} />
      case "warning": return <AlertTriangle className={`${iconClasses} text-destructive`} />
      default: return <Info className={`${iconClasses} text-muted-foreground`} />
    }
  }

  const getIconBg = (type: string) => {
    switch (type) {
      case "chat": return "bg-blue-500/10"
      case "exchange": return "bg-primary/10"
      case "report": return "bg-amber-500/10"
      case "support": return "bg-primary/10"
      case "warning": return "bg-destructive/10"
      default: return "bg-muted"
    }
  }

  const hasNavigation = (n: AppNotification) =>
    !!(n.relatedId && ["chat", "exchange", "report", "support"].includes(n.type ?? ""))

  const filteredNotifications = activeTab === "all" 
    ? notifications 
    : notifications.filter(n => !n.isRead)

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">การแจ้งเตือน</h1>
            <p className="text-muted-foreground text-sm">
              ทั้งหมด {totalCount} รายการ
              {totalPages > 1 && ` • หน้า ${currentPage}/${totalPages}`}
            </p>
          </div>
        </div>

        {/* Tabs and Mark All Read */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
              <TabsTrigger value="unread" className="gap-1.5">
                ยังไม่ได้อ่าน
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleMarkAllRead} 
              disabled={unreadCount === 0}
              className="gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">อ่านทั้งหมด</span>
            </Button>
          </div>

          <TabsContent value={activeTab} className="space-y-3 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredNotifications.length > 0 ? (
              <>
                {filteredNotifications.map((n) => {
                  const hasLink = hasNavigation(n)
                  return (
                    <Card
                      key={n.id}
                      className={`cursor-pointer transition-all border ${
                        hasLink
                          ? "hover:shadow-md hover:border-primary/30 " + (!n.isRead ? "border-l-4 border-l-primary" : "border-border/60")
                          : "hover:shadow-sm border-border/50 bg-muted/20 " + (!n.isRead ? "border-l-4 border-l-muted-foreground/30" : "")
                      }`}
                      onClick={() => handleMarkAsRead(n)}
                    >
                      <CardContent className="p-4 flex gap-4 relative group/item">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 h-8 w-8 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-10"
                          onClick={(e) => handleDeleteNotification(e, n.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${getIconBg(n.type)}`}>
                          {getIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1 pr-8">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                            <h3 className={`text-sm leading-tight ${!n.isRead ? "font-semibold" : "font-medium"}`}>
                              {n.title}
                            </h3>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                              {formatNotificationTime(n)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            {hasLink ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                                ดูรายละเอียด
                                <ChevronRight className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded">
                                ข้อความแจ้งเตือน
                              </span>
                            )}
                            {!n.isRead && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20"
                              >
                                ใหม่
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t mt-6">
                    <p className="text-sm text-muted-foreground">
                      หน้า {currentPage} จาก {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        ก่อนหน้า
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                        className="gap-1"
                      >
                        ถัดไป
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Empty State */
              <div className="text-center py-16">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold mb-1">ไม่มีการแจ้งเตือน</h3>
                <p className="text-sm text-muted-foreground">
                  {activeTab === "unread" 
                    ? "คุณอ่านการแจ้งเตือนทั้งหมดแล้ว" 
                    : "คุณยังไม่มีการแจ้งเตือนในขณะนี้"
                  }
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

