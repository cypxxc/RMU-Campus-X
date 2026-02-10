"use client"

import type { AppNotification } from "@/types"
import { Bell, Check, MessageCircle, AlertTriangle, Package, Info, X, Inbox, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useI18n } from "@/components/language-provider"

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

function formatNotificationTime(n: AppNotification, locale: "th" | "en"): string {
  return new Date(toCreatedAtMs(n)).toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getNotificationIcon(type: string) {
  const iconClass = "h-5 w-5"
  switch (type) {
    case "chat":
      return <MessageCircle className={`${iconClass} text-blue-500`} />
    case "exchange":
      return <Package className={`${iconClass} text-emerald-500`} />
    case "report":
      return <AlertTriangle className={`${iconClass} text-amber-500`} />
    case "support":
      return <MessageCircle className={`${iconClass} text-indigo-500`} />
    case "system":
      return <Info className={`${iconClass} text-cyan-500`} />
    case "warning":
      return <AlertTriangle className={`${iconClass} text-red-500`} />
    default:
      return <Info className={`${iconClass} text-muted-foreground`} />
  }
}

function getNotificationIconBg(type: string, isRead: boolean) {
  if (isRead) return "bg-muted/60"
  switch (type) {
    case "chat":
      return "bg-blue-500/10 ring-1 ring-blue-500/20"
    case "exchange":
      return "bg-emerald-500/10 ring-1 ring-emerald-500/20"
    case "report":
      return "bg-amber-500/10 ring-1 ring-amber-500/20"
    case "support":
      return "bg-indigo-500/10 ring-1 ring-indigo-500/20"
    case "system":
      return "bg-cyan-500/10 ring-1 ring-cyan-500/20"
    case "warning":
      return "bg-red-500/10 ring-1 ring-red-500/20"
    default:
      return "bg-muted/80"
  }
}

interface NotificationDropdownContentProps {
  notifications: AppNotification[]
  unreadCount: number
  onMarkAsRead: (id: string, relatedId?: string, type?: string) => void
  onMarkAllRead: () => void
  onDelete: (e: React.MouseEvent, id: string) => void
}

export function NotificationDropdownContent({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllRead,
  onDelete,
}: NotificationDropdownContentProps) {
  const { locale, tt } = useI18n()

  return (
    <DropdownMenuContent align="end" className="w-[360px] p-0 overflow-hidden shadow-2xl border-border/50 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">{tt("การแจ้งเตือน", "Notifications")}</h3>
            {unreadCount > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {tt(`${unreadCount} รายการที่ยังไม่ได้อ่าน`, `${unreadCount} unread`)}
              </p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs text-primary hover:text-primary hover:bg-primary/10 font-semibold rounded-full"
            onClick={onMarkAllRead}
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            {tt("อ่านทั้งหมด", "Mark all read")}
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length > 0 ? (
          <div className="divide-y divide-border/50">
            {notifications.map((n) => {
              const hasLink = !!(n.relatedId && ["chat", "exchange", "report", "support"].includes(n.type ?? ""))
              return (
                <DropdownMenuItem
                  key={n.id}
                  className={`group relative px-5 py-4 cursor-pointer flex gap-4 items-start outline-none focus:bg-muted/50 transition-all duration-200 ${
                    hasLink
                      ? !n.isRead
                        ? "bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10 border-l-2 border-l-primary/50"
                        : "hover:bg-muted/50 border-l-2 border-l-transparent hover:border-l-primary/30"
                      : !n.isRead
                        ? "bg-muted/30 hover:bg-muted/50"
                        : "hover:bg-muted/50"
                  }`}
                  onClick={() => onMarkAsRead(n.id, n.relatedId, n.type)}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 shrink-0 h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                    getNotificationIconBg(n.type, n.isRead)
                  }`}>
                    {getNotificationIcon(n.type)}
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
                      {hasLink && (
                        <span className="shrink-0 text-primary flex items-center gap-0.5 text-[11px] font-medium">
                          {tt("ไปที่", "Open")}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-muted-foreground/70">
                        {formatNotificationTime(n, locale)}
                      </span>
                      {!hasLink && (
                        <span className="text-[10px] text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded">
                          {tt("ข้อความแจ้งเตือน", "Notification")}
                        </span>
                      )}
                      {!n.isRead && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {tt("ใหม่", "New")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all bg-background/90 backdrop-blur shadow-sm hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => onDelete(e, n.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DropdownMenuItem>
              )
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Inbox className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-foreground/70">{tt("ไม่มีการแจ้งเตือน", "No notifications")}</p>
            <p className="text-xs text-muted-foreground mt-1">{tt("คุณจะได้รับการแจ้งเตือนที่นี่", "Notifications will appear here.")}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <Link 
        href="/notifications" 
        className="block py-3 text-center text-xs font-bold text-primary hover:bg-primary/5 transition-colors border-t"
      >
        {tt("ดูการแจ้งเตือนทั้งหมด", "View all notifications")} →
      </Link>
    </DropdownMenuContent>
  )
}
