"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from "@/lib/firestore"
import { useAuth } from "@/components/auth-provider"
import type { AppNotification } from "@/types"
import { Bell, Check, MessageCircle, AlertTriangle, Package, Info, X, Sparkles, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

function toCreatedAtMs(n: AppNotification): number {
  const c = (n as any).createdAt
  if (!c) return Date.now()
  if (typeof c.toDate === "function") return c.toDate().getTime()
  if (typeof c.toMillis === "function") return c.toMillis()
  if (typeof c._seconds === "number") return c._seconds * 1000
  if (typeof c === "string") return new Date(c).getTime()
  return Date.now()
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const shownToasts = useRef<Map<string, number>>(new Map())
  const lastProcessedTime = useRef<number>(0)
  const prevNotificationIds = useRef<Set<string>>(new Set())
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Clean up old shown toasts (older than 5 minutes) periodically
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
    if (relatedId) {
      if (type === "chat") {
        router.push(`/chat/${relatedId}`)
      } else if (type === "exchange") {
        router.push("/my-exchanges")
      } else if (type === "report") {
        router.push("/profile")
      }
    }
  }, [router])

  // โหลดการแจ้งเตือนผ่าน API + โพลทุก 30 วินาที (ไม่ใช้ onSnapshot เพื่อเลี่ยง Firestore "Unexpected state")
  useEffect(() => {
    if (!user) return

    const POLL_MS = 30_000

    const fetchAndApply = async (isFirst: boolean) => {
      try {
        const { notifications: list } = await getNotifications(user.uid, { pageSize: 20 })
        const all = (list || []).slice(0, 10)

        if (!isFirst) {
          const prevIds = prevNotificationIds.current
          all.forEach((n) => {
            if (prevIds.has(n.id)) return
            const notifTime = toCreatedAtMs(n)
            const now = Date.now()
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
        console.error("[NotificationBell] Fetch error:", err)
      }
    }

    fetchAndApply(true)
    const interval = setInterval(() => fetchAndApply(false), POLL_MS)
    return () => clearInterval(interval)
  }, [user, toast, handleMarkAsRead])

  const handleMarkAllRead = async () => {
    if (!user) return
    await markAllNotificationsAsRead(user.uid)
  }

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const removed = notifications.find((n) => n.id === id)
    if (!removed) return

    // Optimistic: ลบออกจาก UI ทันที
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (!removed.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    deleteNotification(id).catch((error) => {
      console.error("Error deleting notification:", error)
      // Revert on failure
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
      toast({ title: "ลบไม่สำเร็จ", description: "กรุณาลองใหม่อีกครั้ง", variant: "destructive" })
    })
  }

  const getIcon = (type: string) => {
    const iconClass = "h-5 w-5"
    switch (type) {
      case "chat":
        return <MessageCircle className={`${iconClass} text-blue-500`} />
      case "exchange":
        return <Package className={`${iconClass} text-emerald-500`} />
      case "report":
        return <AlertTriangle className={`${iconClass} text-amber-500`} />
      case "warning":
        return <AlertTriangle className={`${iconClass} text-red-500`} />
      case "success":
        return <Sparkles className={`${iconClass} text-emerald-500`} />
      default:
        return <Info className={`${iconClass} text-muted-foreground`} />
    }
  }

  const getIconBg = (type: string, isRead: boolean) => {
    if (isRead) return "bg-muted/60"
    switch (type) {
      case "chat":
        return "bg-blue-500/10 ring-1 ring-blue-500/20"
      case "exchange":
        return "bg-emerald-500/10 ring-1 ring-emerald-500/20"
      case "report":
        return "bg-amber-500/10 ring-1 ring-amber-500/20"
      case "warning":
        return "bg-red-500/10 ring-1 ring-red-500/20"
      case "success":
        return "bg-emerald-500/10 ring-1 ring-emerald-500/20"
      default:
        return "bg-muted/80"
    }
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 group" aria-label="การแจ้งเตือน">
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
      <DropdownMenuContent align="end" className="w-[360px] p-0 overflow-hidden shadow-2xl border-border/50 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">การแจ้งเตือน</h3>
              {unreadCount > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {unreadCount} รายการที่ยังไม่ได้อ่าน
                </p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs text-primary hover:text-primary hover:bg-primary/10 font-semibold rounded-full"
              onClick={handleMarkAllRead}
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              อ่านทั้งหมด
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length > 0 ? (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className={`group relative px-5 py-4 cursor-pointer flex gap-4 items-start outline-none focus:bg-muted/50 transition-all duration-200 ${
                    !n.isRead 
                      ? "bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10" 
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleMarkAsRead(n.id, n.relatedId, n.type)}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 shrink-0 h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                    getIconBg(n.type, n.isRead)
                  }`}>
                    {getIcon(n.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className={`text-sm leading-tight ${
                        !n.isRead 
                          ? "font-bold text-foreground" 
                          : "font-medium text-foreground/80"
                      }`}>
                        {n.title}
                      </p>
                    </div>
                    <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(toCreatedAtMs(n)), {
                          addSuffix: true,
                          locale: th,
                        })}
                      </span>
                      {!n.isRead && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          ใหม่
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all bg-background/90 backdrop-blur shadow-sm hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => handleDeleteNotification(e, n.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <Inbox className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-foreground/70">ไม่มีการแจ้งเตือน</p>
              <p className="text-xs text-muted-foreground mt-1">คุณจะได้รับการแจ้งเตือนที่นี่</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <Link 
          href="/notifications" 
          className="block py-3 text-center text-xs font-bold text-primary hover:bg-primary/5 transition-colors border-t"
        >
          ดูการแจ้งเตือนทั้งหมด →
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
