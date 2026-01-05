"use client"

import { useEffect, useState, useRef } from "react"
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from "@/lib/firestore"
import { useAuth } from "@/components/auth-provider"
import type { AppNotification } from "@/types"
import { Bell, Check, MessageCircle, AlertTriangle, Package, Info, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [mounted, setMounted] = useState(false)
  const shownToasts = useRef<Set<string>>(new Set()) // Track shown toast IDs to prevent duplicates
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!user) return

    const db = getFirebaseDb()
    
    // ✅ OPTIMIZED: Single listener instead of two
    // Fetch recent 50 notifications and calculate unread count client-side
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20) // Optimized: reduced from 50 for better performance
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !isInitialLoad) {
          const newNotif = { id: change.doc.id, ...change.doc.data() } as AppNotification
          // Prevent duplicate toasts (React Strict Mode / Firestore may trigger twice)
          if (!shownToasts.current.has(newNotif.id)) {
            shownToasts.current.add(newNotif.id)
            toast({
              title: newNotif.title,
              description: newNotif.message,
              onClick: () => handleMarkAsRead(newNotif.id, newNotif.relatedId, newNotif.type),
            })
          }
        }
      })

      const allNotifications = snapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as AppNotification[]
      
      // Display latest 10
      setNotifications(allNotifications.slice(0, 10))
      
      // ✅ Calculate unread count client-side (no second listener needed)
      setUnreadCount(allNotifications.filter(n => !n.isRead).length)
      
      setIsInitialLoad(false)
    }, (error) => {
      console.error("[NotificationBell] Snapshot error:", error)
    })

    return () => unsubscribe()
  }, [user])

  const handleMarkAsRead = async (id: string, relatedId?: string, type?: string) => {
    await markNotificationAsRead(id)
    if (relatedId) {
      if (type === "chat") {
        router.push(`/chat/${relatedId}`)
      } else if (type === "exchange") {
        router.push("/my-exchanges")
      } else if (type === "report") {
        router.push("/profile") // หรือหน้าประวัติรายงานถ้ามี
      }
    }
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    await markAllNotificationsAsRead(user.uid)
  }

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // Prevent triggering "Mark as Read" or navigation
    try {
      await deleteNotification(id)
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "chat":
        return <MessageCircle className="h-4 w-4 text-info" />
      case "exchange":
        return <Package className="h-4 w-4 text-success" />
      case "report":
        return <AlertTriangle className="h-4 w-4 text-warning" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />
    }
  }

  if (!mounted || !user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className={`h-5 w-5 ${unreadCount > 0 ? "text-primary animate-pulse" : ""}`} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full text-[10px] border-2 border-background"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-85 p-0 overflow-hidden shadow-2xl border-muted/50 rounded-2xl">
        <div className="flex items-center justify-between p-4 border-b bg-muted/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black tracking-tight">แจ้งเตือน</span>
            {unreadCount > 0 && (
              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-bold border-none">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-primary hover:text-primary/80 hover:bg-transparent font-bold"
              onClick={handleMarkAllRead}
            >
              <Check className="h-3 w-3 mr-1" />
              อ่านทั้งหมด
            </Button>
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={`group relative p-4 cursor-pointer flex gap-3 items-start border-b border-muted/20 last:border-0 outline-none focus:bg-muted/50 transition-all ${
                  !n.isRead ? "bg-primary/5" : ""
                }`}
                onClick={() => handleMarkAsRead(n.id, n.relatedId, n.type)}
              >
                <div className={`mt-0.5 shrink-0 h-10 w-10 rounded-2xl flex items-center justify-center transition-colors ${
                  !n.isRead ? "bg-primary/10 shadow-sm" : "bg-muted/50"
                }`}>
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-sm leading-snug truncate ${!n.isRead ? "font-bold text-foreground" : "font-medium text-foreground/90"}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {formatDistanceToNow((n.createdAt as any)?.toDate?.() || new Date(), {
                        addSuffix: true,
                        locale: th,
                      })}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground/90 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    {!n.isRead && (
                       <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                         <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                         ยังไม่ได้อ่าน
                       </span>
                    )}
                  </div>
                </div>

                {/* Delete Button - Visible on mobile/touch and hover on desktop */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur shadow-sm hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => handleDeleteNotification(e, n.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-10 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-10" />
              <p className="text-sm font-medium">ไม่มีการแจ้งเตือน</p>
              <p className="text-[11px] opacity-60">คุณยังไม่มีความเคลื่อนไหวในตอนนี้</p>
            </div>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <Link href="/notifications" className="block p-2 text-center text-xs font-bold text-muted-foreground hover:bg-muted/50 hover:text-primary transition-colors border-t border-muted/30">
           ดูทั้งหมด
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
