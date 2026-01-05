"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from "@/lib/firestore"
import type { AppNotification } from "@/types"
import { Bell, MessageCircle, AlertTriangle, Package, Info, Loader2, ArrowLeft, CheckCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BounceWrapper } from "@/components/ui/bounce-wrapper"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all")
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    } else if (!authLoading && user) {
      fetchNotifications()
    }
  }, [user, authLoading, router])

  const fetchNotifications = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getNotifications(user.uid)
      setNotifications(data)
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถดึงข้อมูลการแจ้งเตือนได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await deleteNotification(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      toast({ title: "ลบการแจ้งเตือนแล้ว" })
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาดในการลบ", variant: "destructive" })
    }
  }

  const getIcon = (type: string) => {
    const iconClasses = "h-5 w-5"
    switch (type) {
      case "chat": return <MessageCircle className={`${iconClasses} text-blue-500`} />
      case "exchange": return <Package className={`${iconClasses} text-primary`} />
      case "report": return <AlertTriangle className={`${iconClasses} text-amber-500`} />
      case "warning": return <AlertTriangle className={`${iconClasses} text-destructive`} />
      default: return <Info className={`${iconClasses} text-muted-foreground`} />
    }
  }

  const getIconBg = (type: string) => {
    switch (type) {
      case "chat": return "bg-blue-500/10"
      case "exchange": return "bg-primary/10"
      case "report": return "bg-amber-500/10"
      case "warning": return "bg-destructive/10"
      default: return "bg-muted"
    }
  }

  const filteredNotifications = activeTab === "all" 
    ? notifications 
    : notifications.filter(n => !n.isRead)

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (authLoading || loading) {
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
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">การแจ้งเตือน</h1>
            <p className="text-muted-foreground text-sm">
              ติดตามความเคลื่อนไหวทั้งหมดของคุณ
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
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((n, index) => (
                <BounceWrapper 
                  key={n.id}
                  variant="bounce-up"
                  delay={index * 0.03}
                >
                  <Card 
                    className={`cursor-pointer transition-all hover:shadow-md border-border/60 ${
                      !n.isRead ? "border-l-4 border-l-primary" : ""
                    }`}
                    onClick={() => handleMarkAsRead(n)}
                >
                  <CardContent className="p-4 flex gap-4 relative group/item">
                    {/* Delete button shown on hover */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-10"
                      onClick={(e) => handleDeleteNotification(e, n.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {/* Icon */}
                    <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${getIconBg(n.type)}`}>
                      {getIcon(n.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1 pr-8">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                        <h3 className={`text-sm leading-tight ${!n.isRead ? "font-semibold" : "font-medium"}`}>
                          {n.title}
                        </h3>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {formatDistanceToNow((n.createdAt as any)?.toDate?.() || new Date(), {
                            addSuffix: true,
                            locale: th,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      {!n.isRead && (
                        <Badge 
                          variant="outline" 
                          className="mt-1.5 text-[10px] h-5 bg-primary/10 text-primary border-primary/20"
                        >
                          ใหม่
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </BounceWrapper>
              ))
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
