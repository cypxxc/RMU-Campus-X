"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  MessageCircle,
  Package,
  X,
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useI18n } from "@/components/language-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { deleteNotification, getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "@/lib/firestore"
import type { AppNotification, NotificationType } from "@/types"

const PAGE_SIZE = 10

type NotificationTab = "all" | "unread" | NotificationType

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<NotificationTab>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [unreadTotal, setUnreadTotal] = useState(0)
  const paginationLastIds = useRef<Map<number, string | null>>(new Map([[1, null]]))
  const mountedRef = useRef(true)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { locale, tt } = useI18n()

  const intlLocale = locale === "th" ? "th-TH" : "en-US"

  const typeTabs: Array<{ value: NotificationType; label: string }> = [
    { value: "exchange", label: tt("การแลกเปลี่ยน", "Exchanges") },
    { value: "chat", label: tt("แชท", "Chat") },
    { value: "support", label: tt("ซัพพอร์ต", "Support") },
    { value: "report", label: tt("รายงาน", "Reports") },
    { value: "warning", label: tt("คำเตือน", "Warnings") },
    { value: "system", label: tt("ระบบ", "System") },
  ]

  const tabLabels: Record<NotificationType, string> = Object.fromEntries(
    typeTabs.map((tab) => [tab.value, tab.label])
  ) as Record<NotificationType, string>

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const getFilterByTab = (tab: NotificationTab): { types?: NotificationType[]; unreadOnly?: boolean } => {
    if (tab === "all") return {}
    if (tab === "unread") return { unreadOnly: true }
    return { types: [tab] }
  }

  const getEmptyTitleByTab = (tab: NotificationTab): string => {
    if (tab === "unread") return tt("อ่านครบแล้ว", "All caught up")
    if (tab === "all") return tt("ไม่มีการแจ้งเตือน", "No notifications")
    return tt(`ไม่มีการแจ้งเตือนหมวด${tabLabels[tab]}`, `No ${tabLabels[tab]} notifications`)
  }

  const getEmptyDescriptionByTab = (tab: NotificationTab): string => {
    if (tab === "unread") return tt("คุณอ่านการแจ้งเตือนทั้งหมดแล้ว", "You've read everything.")
    if (tab === "all") return tt("เมื่อมีการแจ้งเตือนใหม่จะแสดงที่นี่", "New notifications will appear here.")
    return tt(`ยังไม่มีการแจ้งเตือนในหมวด${tabLabels[tab]}`, `No notifications in ${tabLabels[tab]} category.`)
  }

  const toNotificationDate = (notification: AppNotification): Date => {
    const value: unknown = notification.createdAt
    if (!value) return new Date()
    if (typeof value === "object" && value !== null) {
      const timestampLike = value as { toDate?: () => Date; toMillis?: () => number; _seconds?: number }
      if (typeof timestampLike.toDate === "function") return timestampLike.toDate()
      if (typeof timestampLike.toMillis === "function") return new Date(timestampLike.toMillis())
      if (typeof timestampLike._seconds === "number") return new Date(timestampLike._seconds * 1000)
    }
    if (typeof value === "string") return new Date(value)
    return new Date()
  }

  const formatNotificationTime = (notification: AppNotification): string =>
    toNotificationDate(notification).toLocaleString(intlLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchNotifications = useCallback(
    async (page = 1) => {
      if (!user) return
      setLoading(true)
      try {
        const lastId = page === 1 ? null : paginationLastIds.current.get(page) ?? null
        const filterOptions = getFilterByTab(activeTab)
        const result = await getNotifications(user.uid, {
          pageSize: PAGE_SIZE,
          lastId,
          ...filterOptions,
        })
        if (!mountedRef.current) return

        setNotifications(result.notifications)
        setTotalCount(result.totalCount)
        if (result.lastId != null && result.hasMore) {
          paginationLastIds.current.set(page + 1, result.lastId)
        }

        if (activeTab === "unread") {
          setUnreadTotal(result.totalCount)
        } else {
          getNotifications(user.uid, { pageSize: 1, unreadOnly: true })
            .then((unreadResult) => {
              if (!mountedRef.current) return
              setUnreadTotal(unreadResult.totalCount)
            })
            .catch(() => undefined)
        }
      } catch (error: unknown) {
        if (!mountedRef.current) return
        toast({
          title: tt("เกิดข้อผิดพลาด", "Error"),
          description:
            error instanceof Error
              ? error.message
              : tt("ไม่สามารถดึงข้อมูลการแจ้งเตือนได้", "Unable to fetch notifications"),
          variant: "destructive",
        })
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    },
    [activeTab, toast, tt, user]
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    } else if (!authLoading && user) {
      fetchNotifications(currentPage)
    }
  }, [authLoading, currentPage, fetchNotifications, router, user])

  useEffect(() => {
    paginationLastIds.current = new Map([[1, null]])
    setCurrentPage(1)
  }, [activeTab])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handleMarkAsRead = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id)
      if (activeTab === "unread") {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
        setTotalCount((prev) => Math.max(0, prev - 1))
      } else {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        )
      }
      setUnreadTotal((prev) => Math.max(0, prev - 1))
    }

    if (notification.relatedId) {
      if (notification.type === "chat") router.push(`/chat/${notification.relatedId}`)
      else if (notification.type === "exchange") router.push("/my-exchanges")
      else if (notification.type === "report") router.push("/profile")
      else if (notification.type === "support") router.push(`/support?ticketId=${notification.relatedId}`)
    }
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    try {
      await markAllNotificationsAsRead(user.uid)
      if (activeTab === "unread") {
        setNotifications([])
        setTotalCount(0)
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      }
      setUnreadTotal(0)
      toast({ title: tt("อ่านการแจ้งเตือนทั้งหมดแล้ว", "All notifications marked as read") })
    } catch {
      toast({ title: tt("เกิดข้อผิดพลาด", "Error"), variant: "destructive" })
    }
  }

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const removed = notifications.find((n) => n.id === id)
    if (!removed) return

    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setTotalCount((prev) => Math.max(0, prev - 1))
    if (!removed.isRead) setUnreadTotal((prev) => Math.max(0, prev - 1))

    deleteNotification(id).catch(() => {
      setNotifications((prev) =>
        [...prev, removed].sort((a, b) => {
          const ta = (a.createdAt as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0
          const tb = (b.createdAt as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0
          return tb - ta
        })
      )
      setTotalCount((prev) => prev + 1)
      if (!removed.isRead) setUnreadTotal((prev) => prev + 1)
      toast({
        title: tt("ลบไม่สำเร็จ", "Delete failed"),
        description: tt("กรุณาลองใหม่อีกครั้ง", "Please try again."),
        variant: "destructive",
      })
    })
  }

  const getIcon = (type: string) => {
    const iconClasses = "h-5 w-5"
    switch (type) {
      case "chat":
        return <MessageCircle className={`${iconClasses} text-blue-500`} />
      case "exchange":
        return <Package className={`${iconClasses} text-primary`} />
      case "report":
        return <AlertTriangle className={`${iconClasses} text-amber-500`} />
      case "support":
        return <MessageCircle className={`${iconClasses} text-primary`} />
      case "warning":
        return <AlertTriangle className={`${iconClasses} text-destructive`} />
      default:
        return <Info className={`${iconClasses} text-muted-foreground`} />
    }
  }

  const getIconBg = (type: string) => {
    switch (type) {
      case "chat":
        return "bg-blue-500/10"
      case "exchange":
        return "bg-primary/10"
      case "report":
        return "bg-amber-500/10"
      case "support":
        return "bg-primary/10"
      case "warning":
        return "bg-destructive/10"
      default:
        return "bg-muted"
    }
  }

  const hasNavigation = (notification: AppNotification) =>
    !!(notification.relatedId && ["chat", "exchange", "report", "support"].includes(notification.type ?? ""))

  const unreadCount = unreadTotal
  const currentTabLabel =
    activeTab === "all"
      ? tt("ทั้งหมด", "All")
      : activeTab === "unread"
        ? tt("ยังไม่ได้อ่าน", "Unread")
        : tabLabels[activeTab]

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">{tt("การแจ้งเตือน", "Notifications")}</h1>
            <p className="text-muted-foreground text-sm">
              {currentTabLabel} {totalCount} {tt("รายการ", "items")}
              {totalPages > 1 && ` • ${tt(`หน้า ${currentPage}/${totalPages}`, `Page ${currentPage}/${totalPages}`)}`}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NotificationTab)} className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <TabsList className="h-auto flex-wrap justify-start gap-1.5">
              <TabsTrigger value="all">{tt("ทั้งหมด", "All")}</TabsTrigger>
              <TabsTrigger value="unread" className="gap-1.5">
                {tt("ยังไม่ได้อ่าน", "Unread")}
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              {typeTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">{tt("อ่านทั้งหมด", "Mark all read")}</span>
            </Button>
          </div>

          <TabsContent value={activeTab} className="space-y-3 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : notifications.length > 0 ? (
              <>
                {notifications.map((notification) => {
                  const hasLink = hasNavigation(notification)
                  return (
                    <Card
                      key={notification.id}
                      className={`cursor-pointer transition-all border ${
                        hasLink
                          ? `hover:shadow-md hover:border-primary/30 ${!notification.isRead ? "border-l-4 border-l-primary" : "border-border/60"}`
                          : `hover:shadow-sm border-border/50 bg-muted/20 ${!notification.isRead ? "border-l-4 border-l-muted-foreground/30" : ""}`
                      }`}
                      onClick={() => handleMarkAsRead(notification)}
                    >
                      <CardContent className="p-4 flex gap-4 relative group/item">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 h-8 w-8 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-10"
                          onClick={(e) => handleDeleteNotification(e, notification.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${getIconBg(notification.type)}`}>
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1 pr-8">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                            <h3 className={`text-sm leading-tight ${!notification.isRead ? "font-semibold" : "font-medium"}`}>
                              {notification.title}
                            </h3>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                              {formatNotificationTime(notification)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            {hasLink ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                                {tt("ดูรายละเอียด", "View details")}
                                <ChevronRight className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded">
                                {tt("ข้อความแจ้งเตือน", "Notification message")}
                              </span>
                            )}
                            {!notification.isRead && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20"
                              >
                                {tt("ใหม่", "New")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t mt-6">
                    <p className="text-sm text-muted-foreground">
                      {tt(`หน้า ${currentPage} จาก ${totalPages}`, `Page ${currentPage} of ${totalPages}`)}
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
                        {tt("ก่อนหน้า", "Previous")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                        className="gap-1"
                      >
                        {tt("ถัดไป", "Next")}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Empty className="py-16 bg-muted/10 border border-dashed rounded-2xl">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="rounded-2xl size-14 [&_svg]:size-8">
                    <Bell className="text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle>{getEmptyTitleByTab(activeTab)}</EmptyTitle>
                  <EmptyDescription>{getEmptyDescriptionByTab(activeTab)}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild variant="outline">
                    <Link href="/dashboard">{tt("ไปหน้าหลัก", "Go to dashboard")}</Link>
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
