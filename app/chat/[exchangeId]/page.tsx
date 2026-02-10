"use client"

import type React from "react"

import { useEffect, useState, useRef, lazy, Suspense } from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  subscribeToExchange,
  subscribeToChatMessages,
  subscribeToChatTyping,
  setChatTyping,
} from "@/lib/services/client-firestore"
import { createNotification, getItemById, confirmExchange, getUserProfile, respondToExchange } from "@/lib/firestore"
import { authFetchJson } from "@/lib/api-client"
import type { Exchange, ChatMessage, Item, ItemCategory } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { Send, Loader2, CheckCheck, AlertTriangle, Package, MessageCircle, MoreVertical, Pencil, Trash2, Check, X, XCircle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { format, isToday, isYesterday } from "date-fns"
import { th, enUS } from "date-fns/locale"
const ReportModal = lazy(() => import("@/components/report-modal").then((m) => ({ default: m.ReportModal })))
const ReviewModal = lazy(() => import("@/components/review-modal").then((m) => ({ default: m.ReviewModal })))
import { checkExchangeReviewed } from "@/lib/db/reviews"
import { Star } from "lucide-react"
import {
  normalizeExchangePhaseStatus,
} from "@/lib/exchange-state-machine"
import { getItemPrimaryImageUrl } from "@/lib/cloudinary-url"
import { ExchangeStepIndicator } from "@/components/exchange/exchange-step-indicator"
import { useI18n } from "@/components/language-provider"


export default function ChatPage({
  params,
}: {
  params: Promise<{ exchangeId: string }>
}) {
  const { exchangeId } = use(params)
  const [exchange, setExchange] = useState<Exchange | null>(null)
  const [item, setItem] = useState<Item | null>(null)
  const [newestMessages, setNewestMessages] = useState<ChatMessage[]>([])
  const [olderMessages, setOlderMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMoreOlder, setHasMoreOlder] = useState(true)
  const [otherTyping, setOtherTyping] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [responding, setResponding] = useState(false)

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const oldestMessageRef = useRef<ChatMessage | null>(null)
  const mountedRef = useRef(true)

  // ลบข้อความซ้ำ (อาจเกิดจาก optimistic update กับ real-time listener) — เก็บตาม id แรกที่เจอ
  const messages = (() => {
    const combined = [...olderMessages, ...newestMessages]
    const seen = new Set<string>()
    return combined.filter((m) => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })
  })()

  const [showReportModal, setShowReportModal] = useState(false)
  const [reportTargetId, setReportTargetId] = useState<string | null>(null)
  const [otherUserDisplayName, setOtherUserDisplayName] = useState<string | null>(null)

  // Review State
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { locale, tt } = useI18n()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const categoryLabelByValue: Record<ItemCategory, string> = {
    electronics: tt("อิเล็กทรอนิกส์", "Electronics"),
    books: tt("หนังสือ", "Books"),
    furniture: tt("เฟอร์นิเจอร์", "Furniture"),
    clothing: tt("เสื้อผ้า", "Clothing"),
    sports: tt("อุปกรณ์กีฬา", "Sports"),
    other: tt("อื่นๆ", "Other"),
  }
  const getLocalizedConfirmButtonLabel = (role: "owner" | "requester") =>
    role === "owner" ? tt("ยืนยันส่งมอบแล้ว", "Confirm handoff") : tt("ยืนยันรับของแล้ว", "Confirm received")
  const getLocalizedWaitingMessage = (role: "owner" | "requester") =>
    role === "owner"
      ? tt("คุณยืนยันส่งมอบแล้ว - รออีกฝ่ายยืนยันรับของ", "You confirmed handoff. Waiting for the other party to confirm receipt.")
      : tt("คุณยืนยันรับของแล้ว - รออีกฝ่ายยืนยันส่งมอบ", "You confirmed receipt. Waiting for the other party to confirm handoff.")

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    loadExchange()
  }, [exchangeId, user, authLoading])

  // Real-time: ใช้ onSnapshot เฉพาะจุดที่จำเป็น (แชท + typing) — Logic อยู่ใน client-firestore
  const MESSAGE_PAGE_SIZE = 50
  useEffect(() => {
    if (!user?.uid || !exchangeId) return

    const unsub = subscribeToExchange(
      exchangeId,
      (nextExchange) => {
        if (!mountedRef.current) return
        if (!nextExchange) {
          toast({ title: tt("ไม่พบการแลกเปลี่ยน", "Exchange not found"), variant: "destructive" })
          router.push("/dashboard")
          return
        }
        setExchange({ ...nextExchange, id: nextExchange.id ?? exchangeId } as Exchange)
      },
      () => {
        if (mountedRef.current) {
          toast({ title: tt("ซิงก์สถานะแบบเรียลไทม์ไม่สำเร็จ", "Realtime status sync failed"), variant: "destructive" })
        }
      }
    )

    return unsub
  }, [exchangeId, user?.uid, toast, router, tt])

  useEffect(() => {
    if (!user || !exchangeId) return
    const unsub = subscribeToChatMessages(
      exchangeId,
      MESSAGE_PAGE_SIZE,
      (ordered) => {
        if (!mountedRef.current) return
        setNewestMessages(ordered)
        if (ordered.length > 0) oldestMessageRef.current = ordered[0] ?? null
        setHasMoreOlder(ordered.length >= MESSAGE_PAGE_SIZE)
      },
      () => {
        if (mountedRef.current) toast({ title: tt("โหลดข้อความไม่สำเร็จ", "Unable to load messages"), variant: "destructive" })
      }
    )
    return unsub
  }, [exchangeId, user, toast, tt])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadExchange = async () => {
    try {
      const res = await authFetchJson<{ exchange?: Record<string, unknown> }>(
        `/api/exchanges/${exchangeId}`,
        { method: "GET", cache: "no-store" }
      )
      if (!mountedRef.current) return
      const exchangeData = res.data?.exchange as Exchange | undefined
      if (exchangeData) {
        setExchange({ ...exchangeData, id: exchangeData.id ?? exchangeId } as Exchange)
        const itemId = exchangeData.itemId as string
        if (itemId) {
          const itemRes = await getItemById(itemId)
          if (!mountedRef.current) return
          if (itemRes.success && itemRes.data) setItem(itemRes.data)
        }
      } else {
        toast({ title: tt("ไม่พบการแลกเปลี่ยน", "Exchange not found"), variant: "destructive" })
        router.push("/dashboard")
      }
    } catch (error: unknown) {
      if (!mountedRef.current) return
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: error instanceof Error ? error.message : tt("ไม่สามารถโหลดการแลกเปลี่ยนได้", "Unable to load exchange"),
        variant: "destructive",
      })
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (exchange?.status === "completed" && user) {
      checkExchangeReviewed(exchange.id, user.uid).then((value) => {
        if (mountedRef.current) setHasReviewed(value)
      })
    }
  }, [exchange?.status, exchange?.id, user])

  // โหลดชื่อที่อีกฝั่งตั้งในโปรไฟล์ (displayName) สำหรับแสดงในหัวแชท
  useEffect(() => {
    if (!exchange) return
    const otherId = user?.uid === exchange.ownerId ? exchange.requesterId : exchange.ownerId
    if (!otherId) return
    setOtherUserDisplayName(null)
    getUserProfile(otherId).then((profile) => {
      if (mountedRef.current && profile?.displayName) setOtherUserDisplayName(profile.displayName)
    })
  }, [exchange?.ownerId, exchange?.requesterId, user?.uid])

  const LOAD_MORE_SIZE = 20

  useEffect(() => {
    if (!user || !exchange || newestMessages.length === 0) return
    const otherId = user.uid === exchange.ownerId ? exchange.requesterId : exchange.ownerId
    const unread = newestMessages.filter((m) => m.senderId === otherId && !m.readAt)
    if (unread.length === 0) return
    const messageIds = unread.slice(0, 500).map((m) => m.id)
    authFetchJson(`/api/chat/${exchangeId}/messages/read`, {
      method: "POST",
      body: { messageIds },
    }).catch((e) => console.warn("Mark read failed:", e))
  }, [newestMessages, user?.uid, exchange?.ownerId, exchange?.requesterId, exchange?.id, exchangeId])

  const loadMoreOlder = async () => {
    if (!user || loadingOlder || !hasMoreOlder) return
    const currentOldest = olderMessages.length > 0 ? olderMessages[0] : oldestMessageRef.current
    if (!currentOldest) return
    setLoadingOlder(true)
    try {
      const res = await authFetchJson<{ messages?: ChatMessage[] }>(
        `/api/chat/${exchangeId}/messages?limit=${LOAD_MORE_SIZE}&beforeId=${encodeURIComponent(currentOldest.id)}`,
        { method: "GET" }
      )
      const docs = (res.data?.messages ?? []) as ChatMessage[]
      setOlderMessages((prev) => [...docs, ...prev])
      if (docs.length < LOAD_MORE_SIZE) setHasMoreOlder(false)
      if (docs.length > 0) oldestMessageRef.current = docs[0] ?? null
    } catch (err) {
      toast({ title: tt("โหลดข้อความเก่าไม่สำเร็จ", "Unable to load older messages"), variant: "destructive" })
    } finally {
      setLoadingOlder(false)
    }
  }

  const setTyping = (value: boolean) => {
    if (!user || !exchangeId || !exchange) return
    const key = user.uid === exchange.ownerId ? "ownerTypingAt" : "requesterTypingAt"
    setChatTyping(exchangeId, key, value)
  }

  useEffect(() => {
    if (!exchange || !user || !exchangeId) return
    const otherKey = user.uid === exchange.ownerId ? "requesterTypingAt" : "ownerTypingAt"
    const unsub = subscribeToChatTyping(
      exchangeId,
      otherKey,
      setOtherTyping,
      () => {
        if (mountedRef.current) setOtherTyping(false)
      }
    )
    return unsub
  }, [exchangeId, exchange?.ownerId, user?.uid])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    setTyping(true)
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000)
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      setTyping(false)
    }
  }, [exchangeId])

  const handleEditMessage = async (msg: ChatMessage, newText: string) => {
    if (!user || msg.senderId !== user.uid || !newText.trim()) return
    try {
      const res = await authFetchJson<{ updated?: boolean }>(
        `/api/chat/${exchangeId}/messages/${msg.id}`,
        { method: "PATCH", body: { message: newText.trim() } }
      )
      if (!res?.data?.updated) throw new Error(res?.error ?? tt("แก้ไขไม่สำเร็จ", "Update failed"))
      setEditingMessageId(null)
      setEditDraft("")
    } catch {
      toast({ title: tt("แก้ไขไม่สำเร็จ", "Update failed"), variant: "destructive" })
    }
  }

  const handleDeleteMessage = async (msg: ChatMessage) => {
    if (!user || msg.senderId !== user.uid) return
    try {
      const res = await authFetchJson<{ deleted?: boolean }>(
        `/api/chat/${exchangeId}/messages/${msg.id}`,
        { method: "DELETE" }
      )
      if (!res?.data?.deleted) throw new Error(res?.error ?? tt("ลบไม่สำเร็จ", "Delete failed"))
      setEditingMessageId(null)
    } catch {
      toast({ title: tt("ลบไม่สำเร็จ", "Delete failed"), variant: "destructive" })
    }
  }

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }

  const isChatClosed =
    exchange?.status === "cancelled" ||
    exchange?.status === "rejected" ||
    exchange?.status === "completed"

  const handleRespondToRequest = async (action: "accept" | "reject") => {
    if (!user || !exchange) return
    setResponding(true)
    try {
      await respondToExchange(exchangeId, action, user.uid)
      toast({
        title: action === "accept" ? tt("ตอบรับแล้ว", "Accepted") : tt("ปฏิเสธแล้ว", "Rejected"),
        description:
          action === "accept"
            ? tt("เข้าสู่ขั้นตอนกำลังดำเนินการแล้ว", "Exchange is now in progress.")
            : tt("คำขอถูกปฏิเสธแล้ว", "The request has been rejected."),
      })
      await loadExchange()
    } catch (error: unknown) {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: error instanceof Error ? error.message : tt("ไม่สามารถดำเนินการได้", "Unable to proceed"),
        variant: "destructive",
      })
    } finally {
      setResponding(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || !exchange) return
    if (isChatClosed) return

    setSending(true)
    try {
      const messageText = newMessage.trim()

      const res = await authFetchJson<{ messageId?: string; createdAt?: string }>(
        `/api/chat/${exchangeId}/messages`,
        {
          method: "POST",
          body: { message: messageText },
        }
      )
      const messageId = res.data?.messageId ?? ""
      const createdAt = res.data?.createdAt ?? new Date().toISOString()
      setNewestMessages((prev) => [
        ...prev,
        {
          id: messageId,
          exchangeId,
          senderId: user.uid,
          senderEmail: user.email ?? "",
          message: messageText,
          createdAt: createdAt as unknown as ChatMessage["createdAt"],
        } as ChatMessage,
      ])

      setNewMessage("")
      scrollToBottom()

      // Create notification for recipient
      const recipientId = user.uid === exchange.ownerId ? exchange.requesterId : exchange.ownerId
      const notificationMessage = tt(
        `ส่งข้อความถึงคุณ: ${messageText.substring(0, 30)}${messageText.length > 30 ? "..." : ""}`,
        `Sent you a message: ${messageText.substring(0, 30)}${messageText.length > 30 ? "..." : ""}`
      )

      await createNotification({
        userId: recipientId,
        title: tt("ข้อความใหม่จาก ", "New message from ") + (user.displayName || user.email?.split('@')[0]),
        message: notificationMessage,
        type: "chat",
        relatedId: exchangeId,
        senderId: user.uid,
      })

      // Send LINE notification (async, don't block)
      try {
        const token = await user.getIdToken()
        fetch('/api/line/notify-chat', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            recipientId,
            senderName: user.email?.split('@')[0] || tt("ผู้ใช้", "User"),
            itemTitle: exchange.itemTitle,
            messagePreview: messageText,
            exchangeId
          })
        }).catch(err => console.log('[LINE] Notify chat error:', err))
      } catch (lineError) {
        console.log('[LINE] Notify chat error:', lineError)
      }
    } catch (error: unknown) {
      console.error('Send message error:', error)
      toast({
        title: tt("ส่งข้อความไม่สำเร็จ", "Message failed"),
        description: error instanceof Error ? error.message : tt("โปรดลองใหม่อีกครั้ง", "Please try again."),
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const handleConfirm = async (role: "owner" | "requester") => {
    if (!exchange) return
    const phaseStatus = normalizeExchangePhaseStatus(exchange.status)
    if (phaseStatus !== "in_progress") {
      toast({
        title: tt("ไม่สามารถยืนยันได้", "Unable to confirm"),
        description: tt(
          "การแลกเปลี่ยนต้องได้รับการตอบรับจากเจ้าของก่อน จึงจะกดยืนยันได้",
          "The owner must accept the exchange before confirmation."
        ),
        variant: "destructive",
      })
      return
    }

    try {
      // Use atomic confirmation transaction
      const result = await confirmExchange(exchangeId, role)
      
      if (!result.success) {
        throw new Error(result.error || tt("ไม่สามารถยืนยันได้", "Unable to confirm"))
      }

      if (result.data?.status === "completed") {
        toast({
          title: tt("เสร็จสิ้น", "Completed"),
          description: tt("การแลกเปลี่ยนเสร็จสมบูรณ์", "Exchange completed successfully."),
        })

        // Notify both parties about completion via LINE (async, best effort)
        try {
          // Send LINE to Owner
          if (user) {
            user.getIdToken().then(token => {
              fetch('/api/line/notify-chat', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  type: 'status_change',
                  recipientUserId: exchange.ownerId,
                  itemTitle: exchange.itemTitle,
                  status: 'completed',
                  exchangeId
                })
              }).catch(err => console.log('[LINE] Notify owner error:', err))

              // Send LINE to Requester
              fetch('/api/line/notify-chat', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  type: 'status_change',
                  recipientUserId: exchange.requesterId,
                  itemTitle: exchange.itemTitle,
                  status: 'completed',
                  exchangeId
                })
              }).catch(err => console.log('[LINE] Notify requester error:', err))
          })
        }
        } catch (lineError) {
          console.log('[LINE] Notify completion error:', lineError)
        }
      } else {
        toast({
          title: tt("ยืนยันแล้ว", "Confirmed"),
          description: tt("รอให้อีกฝ่ายยืนยันเพื่อให้การแลกเปลี่ยนเสร็จสมบูรณ์", "Waiting for the other party to confirm."),
        })
      }

      loadExchange()
    } catch (error: unknown) {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: error instanceof Error ? error.message : tt("ไม่สามารถยืนยันได้", "Unable to confirm"),
        variant: "destructive",
      })
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!exchange) return null

  const phaseStatus = normalizeExchangePhaseStatus(exchange.status)
  const isOwner = user?.uid === exchange.ownerId
  const otherUserId = isOwner ? exchange.requesterId : exchange.ownerId
  const hasConfirmed = isOwner ? exchange.ownerConfirmed : exchange.requesterConfirmed
  const itemImage = item ? getItemPrimaryImageUrl(item, { width: 200 }) : undefined

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="h-[calc(100vh-12rem)] shadow-lg border-border/60">
          <CardHeader className="border-b bg-muted/10 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {itemImage ? (
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden border bg-background">
                    <Image 
                      src={itemImage} 
                      alt={exchange.itemTitle}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center border">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg leading-tight">
                    <Link
                      href={`/profile/${otherUserId}`}
                      className="hover:underline underline-offset-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                    >
                      {otherUserDisplayName ?? (isOwner ? exchange.requesterEmail : exchange.ownerEmail)}
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap mt-1">
                    {exchange.itemTitle}
                    {item && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary ml-2 border border-primary/20">
                        {categoryLabelByValue[item.category as ItemCategory] ?? item.category}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1"
                  onClick={() => {
                    setReportTargetId(isOwner ? exchange.requesterId : exchange.ownerId)
                    setShowReportModal(true)
                  }}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span className="hidden sm:inline">{tt("รายงานผู้ใช้", "Report user")}</span>
                  <span className="sm:hidden">{tt("รายงาน", "Report")}</span>
                </Button>

                {exchange.status === "completed" && (
                  <div className="flex items-center gap-2">
                    <div 
                      role="status" 
                      aria-live="polite"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 text-green-600 border border-green-500/20 text-sm font-bold h-9"
                    >
                      <CheckCheck className="h-4 w-4" />
                      <span className="hidden sm:inline">{tt("แลกเปลี่ยนสำเร็จ", "Exchange complete")}</span>
                      <span className="sm:hidden">{tt("สำเร็จ", "Done")}</span>
                    </div>
                    {!hasReviewed && (
                      <Button 
                        size="sm" 
                        className="h-9 gap-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold shadow-sm"
                        onClick={() => setShowReviewModal(true)}
                      >
                        <Star className="h-4 w-4 fill-black/20" />
                        <span className="hidden sm:inline">{tt("เขียนรีวิว", "Write review")}</span>
                        <span className="sm:hidden">{tt("รีวิว", "Review")}</span>
                      </Button>
                    )}
                  </div>
                )}
                {phaseStatus === "pending" && (
                  isOwner ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-9 font-bold bg-green-600 hover:bg-green-700 text-white gap-1.5"
                        disabled={responding}
                        onClick={() => handleRespondToRequest("accept")}
                      >
                        {responding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                        <span className="hidden sm:inline">{tt("ตอบรับ", "Accept")}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-destructive border-destructive/50 hover:bg-destructive/10 gap-1.5"
                        disabled={responding}
                        onClick={() => handleRespondToRequest("reject")}
                      >
                        <XCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">{tt("ปฏิเสธ", "Reject")}</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/80 text-muted-foreground text-xs sm:text-sm h-9 border border-border/50" role="status">
                      <span>{tt("รอเจ้าของตอบรับคำขอ — แชทเพื่อสอบถามได้", "Waiting for owner approval. You can still chat for details.")}</span>
                    </div>
                  )
                )}
                {phaseStatus === "in_progress" && (
                  <>
                    {!hasConfirmed && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="h-9 font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all">
                            <CheckCheck className="h-4 w-4 mr-2" />
                            {getLocalizedConfirmButtonLabel(isOwner ? "owner" : "requester")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-md">
                          <AlertDialogHeader>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                                <CheckCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                              <div>
                                <AlertDialogTitle>
                                  {getLocalizedConfirmButtonLabel(isOwner ? "owner" : "requester")}
                                </AlertDialogTitle>
                                <AlertDialogDescription className="space-y-1">
                                  <span>
                                    {isOwner
                                      ? tt("ยืนยันว่าคุณได้ส่งมอบสิ่งของให้ผู้รับแล้ว", "Confirm that you have handed over the item.")
                                      : tt("ยืนยันว่าคุณได้รับสิ่งของจากผู้ให้แล้ว", "Confirm that you have received the item.")}
                                  </span>
                                  <span className="block text-amber-600 dark:text-amber-400 font-medium">
                                    {tt("การดำเนินการนี้ไม่สามารถย้อนกลับได้", "This action cannot be undone.")}
                                  </span>
                                </AlertDialogDescription>
                              </div>
                            </div>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{tt("ยกเลิก", "Cancel")}</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleConfirm(isOwner ? "owner" : "requester")}
                              className="bg-green-600 hover:bg-green-700 font-bold"
                            >
                              <CheckCheck className="h-4 w-4 mr-2" />
                              {getLocalizedConfirmButtonLabel(isOwner ? "owner" : "requester")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {hasConfirmed && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-sm font-bold h-9" role="status">
                        <CheckCheck className="h-4 w-4 shrink-0" />
                        {getLocalizedWaitingMessage(isOwner ? "owner" : "requester")}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* Step indicator: แสดงขั้นตอนการแลกเปลี่ยน */}
            {exchange.status !== "cancelled" && exchange.status !== "rejected" && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <ExchangeStepIndicator
                  status={phaseStatus}
                  ownerConfirmed={exchange.ownerConfirmed}
                  requesterConfirmed={exchange.requesterConfirmed}
                  locale={locale}
                />
              </div>
            )}
          </CardHeader>

          <CardContent className="flex flex-col h-full p-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-background/20" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-h-[200px]">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{tt("เริ่มการสนทนา", "Start conversation")}</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {tt("ส่งข้อความถึง", "Send a message to ")}
                    {isOwner ? tt("ผู้ขอรับ", "the requester") : tt("เจ้าของสิ่งของ", "the owner")}
                    {tt("เพื่อนัดหมายการรับของ", " to arrange pickup.")}
                  </p>
                </div>
              ) : (
                <>
                  {(hasMoreOlder || olderMessages.length > 0) && (
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={loadMoreOlder}
                        disabled={loadingOlder || !hasMoreOlder}
                        className="text-muted-foreground"
                      >
                        {loadingOlder
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : hasMoreOlder
                            ? tt("โหลดข้อความเก่า", "Load older messages")
                            : tt("ไม่มีข้อความเก่าเพิ่ม", "No more messages")}
                      </Button>
                    </div>
                  )}
                  {messages.map((msg) => {
                    const isOwnMessage = msg.senderId === user?.uid
                    const msgDate =
                      typeof msg.createdAt === "string"
                        ? new Date(msg.createdAt)
                        : msg.createdAt?.toDate?.() ||
                          (typeof msg.createdAt === "object" && (msg.createdAt as { toDate?: () => Date })?.toDate?.()) ||
                          new Date()
                    const isEditing = editingMessageId === msg.id

                    return (
                      <div key={msg.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                        <div className={`flex items-end gap-1 max-w-[75%] ${isOwnMessage ? "flex-row-reverse" : ""}`}>
                          <div
                            className={`rounded-2xl px-4 py-2 shadow-sm ${
                              isOwnMessage
                                ? "bg-primary text-primary-foreground rounded-br-none"
                                : "bg-white dark:bg-muted text-foreground border border-border/40 rounded-bl-none"
                            }`}
                          >
                            {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <Input
                                  value={editDraft}
                                  onChange={(e) => setEditDraft(e.target.value)}
                                  className="bg-background text-foreground min-w-[200px]"
                                  autoFocus
                                />
                                <div className="flex gap-1 justify-end">
                                  <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => { setEditingMessageId(null); setEditDraft("") }}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Button type="button" size="sm" className="h-8" onClick={() => handleEditMessage(msg, editDraft)}>
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {msg.message && (
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-wrap">{msg.message}</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1">
                                  <p className={`text-[10px] ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                    {isToday(msgDate)
                                      ? format(msgDate, "HH:mm", { locale: locale === "th" ? th : enUS })
                                      : isYesterday(msgDate)
                                        ? tt(
                                            `เมื่อวาน ${format(msgDate, "HH:mm", { locale: th })}`,
                                            `Yesterday ${format(msgDate, "HH:mm", { locale: enUS })}`
                                          )
                                        : msgDate.getFullYear() === new Date().getFullYear()
                                          ? format(msgDate, "d MMM HH:mm", { locale: locale === "th" ? th : enUS })
                                          : format(msgDate, "d MMM yyyy HH:mm", { locale: locale === "th" ? th : enUS })}
                                    {msg.updatedAt && tt(" (แก้ไข)", " (edited)")}
                                  </p>
                                  {isOwnMessage && msg.readAt && (
                                    <span className="text-[10px] text-primary-foreground/70" title={tt("อ่านแล้ว", "Read")}>
                                      {tt("อ่านแล้ว", "Read")}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          {isOwnMessage && !isEditing && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full opacity-70 hover:opacity-100">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isOwnMessage ? "end" : "start"}>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingMessageId(msg.id)
                                    setEditDraft(msg.message || "")
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  {tt("แก้ไข", "Edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    if (confirm(tt("ลบข้อความนี้?", "Delete this message?"))) handleDeleteMessage(msg)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {tt("ลบ", "Delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
              {otherTyping && (
                <p className="text-xs text-muted-foreground animate-pulse">{tt("กำลังพิมพ์...", "Typing...")}</p>
              )}
              <div ref={messagesEndRef} />
            </div>

            {isChatClosed ? (
              <div className="border-t p-4 bg-muted/50 text-center text-sm text-muted-foreground">
                {exchange.status === "cancelled"
                  ? tt("การแลกเปลี่ยนนี้ถูกยกเลิกแล้ว ไม่สามารถส่งข้อความได้", "This exchange was cancelled. Messaging is disabled.")
                  : exchange.status === "rejected"
                    ? tt("การแลกเปลี่ยนนี้ถูกปฏิเสธแล้ว ไม่สามารถส่งข้อความได้", "This exchange was rejected. Messaging is disabled.")
                    : tt("การแลกเปลี่ยนเสร็จสมบูรณ์แล้ว ปิดห้องแชท", "This exchange is complete. Chat is now closed.")}
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="border-t p-3 sm:p-4 bg-background">
                <div className="flex gap-2 items-end">
                  <Input
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder={tt("พิมพ์ข้อความ...", "Type a message...")}
                    disabled={sending}
                    className="min-h-[40px] max-h-[120px] py-2 flex-1"
                  />
                  <Button 
                    type="submit" 
                    disabled={sending || !newMessage.trim()}
                    className="h-10 w-10 p-0 shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                    <span className="sr-only">{tt("ส่ง", "Send")}</span>
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Modal (รายงานผู้ใช้เท่านั้น) */}
      {reportTargetId && exchange && (
        <Suspense fallback={null}>
          <ReportModal
            open={showReportModal}
            onOpenChange={setShowReportModal}
            reportType="user_report"
            targetId={reportTargetId}
            targetTitle={undefined}
          />
        </Suspense>
      )}

      {/* Review Modal */}
      {exchange && user && (
        <Suspense fallback={null}>
          <ReviewModal
            open={showReviewModal}
            onOpenChange={setShowReviewModal}
            exchangeId={exchangeId}
            targetUserId={user.uid === exchange.ownerId ? exchange.requesterId : exchange.ownerId}
            itemTitle={exchange.itemTitle}
            onSuccess={() => setHasReviewed(true)}
          />
        </Suspense>
      )}
    </div>
  )
}
