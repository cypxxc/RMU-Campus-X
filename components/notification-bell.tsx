"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from "@/lib/firestore"
import { isTransientNetworkError } from "@/lib/api-client"
import { useAuth } from "@/components/auth-provider"
import type { AppNotification } from "@/types"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/components/language-provider"
import { NotificationDropdownContent } from "@/components/notification-dropdown-content"

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const shownToasts = useRef<Map<string, number>>(new Map())
  const lastProcessedTime = useRef<number>(0)
  const prevNotificationIds = useRef<Set<string>>(new Set())
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { tt } = useI18n()

  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now()
      shownToasts.current.forEach((timestamp, id) => {
        if (now - timestamp > 5 * 60 * 1000) {
          shownToasts.current.delete(id)
        }
      })
    }, 60000)
    return () => clearInterval(cleanup)
  }, [])

  const handleMarkAsRead = useCallback(async (id: string, relatedId?: string, type?: string) => {
    await markNotificationAsRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    if (relatedId) {
      if (type === "chat") router.push(`/chat/${relatedId}`)
      else if (type === "exchange") router.push("/my-exchanges")
      else if (type === "report") router.push("/profile")
      else if (type === "support") router.push(`/support?ticketId=${relatedId}`)
    }
  }, [router])

  const fetchNotifications = useCallback(async (showNewToasts = false) => {
    if (!user) return
    if (typeof navigator !== "undefined" && navigator.onLine === false) return
    try {
      const { notifications: list } = await getNotifications(user.uid, { pageSize: 20, includeTotalCount: false })
      const all = (list || []).slice(0, 10)

      if (showNewToasts) {
        const prevIds = prevNotificationIds.current
        const now = Date.now()
        all.forEach((n) => {
          if (prevIds.has(n.id)) return
          const notifTime = toCreatedAtMs(n)
          if (now - notifTime > 30000) return
          if (shownToasts.current.has(n.id)) return
          const contentHash = `${n.title}::${n.message}`
          let contentShownRecently = false
          shownToasts.current.forEach((ts, key) => {
            if (key === `content::${contentHash}` && now - ts < 5000) contentShownRecently = true
          })
          if (contentShownRecently) return
          shownToasts.current.set(n.id, now)
          shownToasts.current.set(`content::${contentHash}`, now)
          toast({
            title: n.title,
            description: n.message,
            onClick: () => handleMarkAsRead(n.id, n.relatedId, n.type),
          })
        })
      }

      setNotifications(all)
      setUnreadCount(all.filter((n) => !n.isRead).length)
      prevNotificationIds.current = new Set(all.map((n) => n.id))
      lastProcessedTime.current = Date.now()
    } catch (err) {
      if (isTransientNetworkError(err)) return
      console.error("[NotificationBell] Fetch error:", err)
    }
  }, [user, toast, handleMarkAsRead])

  useEffect(() => {
    if (!user) return

    const POLL_MS = 45_000
    const t = setTimeout(() => fetchNotifications(false), 0)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      fetchNotifications(true)
    }, POLL_MS)

    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchNotifications(true)
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      clearTimeout(t)
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [user, fetchNotifications])

  const handleMarkAllRead = async () => {
    if (!user) return
    try {
      await markAllNotificationsAsRead(user.uid)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
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
    if (!removed.isRead) setUnreadCount((prev) => Math.max(0, prev - 1))

    deleteNotification(id).catch((error) => {
      console.error("Error deleting notification:", error)
      setNotifications((prev) => {
        const next = [...prev, removed]
        next.sort((a, b) => {
          const tA = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0
          const tB = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0
          return tB - tA
        })
        return next.slice(0, 10)
      })
      if (!removed.isRead) setUnreadCount((prev) => prev + 1)
      toast({
        title: tt("ลบไม่สำเร็จ", "Delete failed"),
        description: tt("กรุณาลองใหม่อีกครั้ง", "Please try again."),
        variant: "destructive",
      })
    })
  }

  if (!user) return null

  return (
    <DropdownMenu onOpenChange={(open) => open && fetchNotifications(false)}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 group" aria-label={tt("การแจ้งเตือน", "Notifications")}>
          <Bell className={`h-5 w-5 transition-transform group-hover:scale-110 ${unreadCount > 0 ? "text-primary" : ""}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5">
              <Badge
                variant="destructive"
                className="relative h-5 w-5 flex items-center justify-center p-0 rounded-full text-[10px] border-2 border-background font-bold"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <NotificationDropdownContent
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllRead={handleMarkAllRead}
        onDelete={handleDeleteNotification}
      />
    </DropdownMenu>
  )
}

/** Helper to extract timestamp from notification */
function toCreatedAtMs(n: AppNotification): number {
  const c: unknown = n.createdAt
  if (!c) return Date.now()
  if (typeof c === "object" && c !== null) {
    const tsLike = c as { toDate?: () => Date; toMillis?: () => number; _seconds?: number }
    if (typeof tsLike.toDate === "function") return tsLike.toDate().getTime()
    if (typeof tsLike.toMillis === "function") return tsLike.toMillis()
    if (typeof tsLike._seconds === "number") return tsLike._seconds * 1000
  }
  if (typeof c === "string") return new Date(c).getTime()
  return Date.now()
}
