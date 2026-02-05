"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { doc, setDoc, onSnapshot, serverTimestamp, collection, query, where, orderBy, limit } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { createNotification, getItemById, confirmExchange, getUserProfile, respondToExchange } from "@/lib/firestore"
import { authFetchJson } from "@/lib/api-client"
import type { Exchange, ChatMessage, Item } from "@/types"
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
import { th } from "date-fns/locale"
import { ReportModal } from "@/components/report-modal"
import { ReviewModal } from "@/components/review-modal"
import { checkExchangeReviewed } from "@/lib/db/reviews"
import { Star } from "lucide-react"
import { getConfirmButtonLabel, getWaitingOtherConfirmationMessage } from "@/lib/exchange-state-machine"
import { ExchangeStepIndicator } from "@/components/exchange/exchange-step-indicator"


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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

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

  // Real-time ข้อความแชท (แบบ Facebook) — ใช้ Firestore onSnapshot แทน polling
  const MESSAGE_PAGE_SIZE = 50
  useEffect(() => {
    if (!user || !exchangeId) return
    const db = getFirebaseDb()
    const q = query(
      collection(db, "chatMessages"),
      where("exchangeId", "==", exchangeId),
      orderBy("createdAt", "desc"),
      limit(MESSAGE_PAGE_SIZE)
    )
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!mountedRef.current) return
        const list: ChatMessage[] = snapshot.docs.map((d) => {
          const data = d.data()
          const toIso = (v: unknown) =>
            v && typeof (v as { toDate?: () => Date }).toDate === "function"
              ? (v as { toDate: () => Date }).toDate().toISOString()
              : undefined
          return {
            id: d.id,
            exchangeId: data.exchangeId,
            senderId: data.senderId,
            senderEmail: data.senderEmail ?? "",
            message: data.message ?? "",
            createdAt: (toIso(data.createdAt) ?? new Date().toISOString()) as unknown as ChatMessage["createdAt"],
            imageUrl: data.imageUrl ?? null,
            imageType: data.imageType ?? null,
            readAt: data.readAt != null ? (toIso(data.readAt) as unknown as ChatMessage["readAt"]) : undefined,
            updatedAt: data.updatedAt != null ? toIso(data.updatedAt) : undefined,
          } as ChatMessage
        })
        const ordered = [...list].reverse()
        setNewestMessages(ordered)
        if (ordered.length > 0) oldestMessageRef.current = ordered[0] ?? null
        setHasMoreOlder(snapshot.docs.length >= MESSAGE_PAGE_SIZE)
      },
      (_err) => {
        if (mountedRef.current) toast({ title: "โหลดข้อความไม่สำเร็จ", variant: "destructive" })
      }
    )
    return () => unsub()
  }, [exchangeId, user])

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
        toast({ title: "ไม่พบการแลกเปลี่ยน", variant: "destructive" })
        router.push("/dashboard")
      }
    } catch (error: unknown) {
      if (!mountedRef.current) return
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถโหลดการแลกเปลี่ยนได้",
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
      toast({ title: "โหลดข้อความเก่าไม่สำเร็จ", variant: "destructive" })
    } finally {
      setLoadingOlder(false)
    }
  }

  const setTyping = (value: boolean) => {
    if (!user || !exchangeId) return
    const db = getFirebaseDb()
    const key = user.uid === exchange?.ownerId ? "ownerTypingAt" : "requesterTypingAt"
    setDoc(doc(db, "chatTyping", exchangeId), { [key]: value ? serverTimestamp() : null }, { merge: true }).catch(() => {})
  }

  useEffect(() => {
    if (!exchange || !user || !exchangeId) return
    const db = getFirebaseDb()
    const otherKey = user.uid === exchange.ownerId ? "requesterTypingAt" : "ownerTypingAt"
    const unsub = onSnapshot(
      doc(db, "chatTyping", exchangeId),
      (snap) => {
        if (!snap.exists()) {
          setOtherTyping(false)
          return
        }
        const data = snap.data()
        const t = data?.[otherKey]
        const millis = t && typeof (t as { toMillis?: () => number }).toMillis === "function" ? (t as { toMillis: () => number }).toMillis() : 0
        setOtherTyping(millis > 0 && Date.now() - millis < 5000)
      },
      (_err) => {
        // permission-denied หรือ network error — ปิด typing indicator และไม่ throw
        if (mountedRef.current) setOtherTyping(false)
      }
    )
    return () => unsub()
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
      if (!res?.data?.updated) throw new Error(res?.error ?? "แก้ไขไม่สำเร็จ")
      setEditingMessageId(null)
      setEditDraft("")
    } catch {
      toast({ title: "แก้ไขไม่สำเร็จ", variant: "destructive" })
    }
  }

  const handleDeleteMessage = async (msg: ChatMessage) => {
    if (!user || msg.senderId !== user.uid) return
    try {
      const res = await authFetchJson<{ deleted?: boolean }>(
        `/api/chat/${exchangeId}/messages/${msg.id}`,
        { method: "DELETE" }
      )
      if (!res?.data?.deleted) throw new Error(res?.error ?? "ลบไม่สำเร็จ")
      setEditingMessageId(null)
    } catch {
      toast({ title: "ลบไม่สำเร็จ", variant: "destructive" })
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
        title: action === "accept" ? "ตอบรับแล้ว" : "ปฏิเสธแล้ว",
        description: action === "accept" ? "การแลกเปลี่ยนได้รับการตอบรับ" : "คำขอถูกปฏิเสธแล้ว",
      })
      await loadExchange()
    } catch (error: unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถดำเนินการได้",
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
      const notificationMessage = `ส่งข้อความถึงคุณ: ${messageText.substring(0, 30)}${messageText.length > 30 ? "..." : ""}`

      await createNotification({
        userId: recipientId,
        title: "ข้อความใหม่จาก " + (user.displayName || user.email?.split('@')[0]),
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
            senderName: user.email?.split('@')[0] || 'ผู้ใช้',
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
        title: "ส่งข้อความไม่สำเร็จ",
        description: error instanceof Error ? error.message : "โปรดลองใหม่อีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const handleConfirm = async (role: "owner" | "requester") => {
    if (!exchange) return
    if (exchange.status !== "accepted" && exchange.status !== "in_progress") {
      toast({
        title: "ไม่สามารถยืนยันได้",
        description: "การแลกเปลี่ยนต้องได้รับการตอบรับจากเจ้าของก่อน จึงจะกดยืนยันได้",
        variant: "destructive",
      })
      return
    }

    try {
      // Use atomic confirmation transaction
      const result = await confirmExchange(exchangeId, role)
      
      if (!result.success) {
        throw new Error(result.error || "ไม่สามารถยืนยันได้")
      }

      if (result.data?.status === "completed") {
        toast({
          title: "เสร็จสิ้น",
          description: "การแลกเปลี่ยนเสร็จสมบูรณ์",
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
          title: "ยืนยันแล้ว",
          description: "รอให้อีกฝ่ายยืนยันเพื่อให้การแลกเปลี่ยนเสร็จสมบูรณ์",
        })
      }

      loadExchange()
    } catch (error: unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถยืนยันได้",
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

  const isOwner = user?.uid === exchange.ownerId
  const otherUserId = isOwner ? exchange.requesterId : exchange.ownerId
  const hasConfirmed = isOwner ? exchange.ownerConfirmed : exchange.requesterConfirmed
  const itemImage = item?.imageUrls?.[0] || item?.imageUrl

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
                      unoptimized
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
                        {item.category}
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
                  <span className="hidden sm:inline">รายงานผู้ใช้</span>
                  <span className="sm:hidden">รายงาน</span>
                </Button>

                {exchange.status === "completed" && (
                  <div className="flex items-center gap-2">
                    <div 
                      role="status" 
                      aria-live="polite"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 text-green-600 border border-green-500/20 text-sm font-bold h-9"
                    >
                      <CheckCheck className="h-4 w-4" />
                      <span className="hidden sm:inline">แลกเปลี่ยนสำเร็จ</span>
                      <span className="sm:hidden">สำเร็จ</span>
                    </div>
                    {!hasReviewed && (
                      <Button 
                        size="sm" 
                        className="h-9 gap-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold shadow-sm"
                        onClick={() => setShowReviewModal(true)}
                      >
                        <Star className="h-4 w-4 fill-black/20" />
                        <span className="hidden sm:inline">เขียนรีวิว</span>
                        <span className="sm:hidden">รีวิว</span>
                      </Button>
                    )}
                  </div>
                )}
                {exchange.status === "pending" && (
                  isOwner ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-9 font-bold bg-green-600 hover:bg-green-700 text-white gap-1.5"
                        disabled={responding}
                        onClick={() => handleRespondToRequest("accept")}
                      >
                        {responding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                        <span className="hidden sm:inline">ตอบรับ</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-destructive border-destructive/50 hover:bg-destructive/10 gap-1.5"
                        disabled={responding}
                        onClick={() => handleRespondToRequest("reject")}
                      >
                        <XCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">ปฏิเสธ</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/80 text-muted-foreground text-xs sm:text-sm h-9 border border-border/50" role="status">
                      <span>รอเจ้าของตอบรับคำขอ — แชทเพื่อสอบถามได้</span>
                    </div>
                  )
                )}
                {(exchange.status === "accepted" || exchange.status === "in_progress") && (
                  <>
                    {!hasConfirmed && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="h-9 font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all">
                            <CheckCheck className="h-4 w-4 mr-2" />
                            {getConfirmButtonLabel(exchange.status, isOwner ? "owner" : "requester")}
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
                                  {getConfirmButtonLabel(exchange.status, isOwner ? "owner" : "requester")}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {exchange.status === "accepted"
                                    ? isOwner
                                      ? "เจ้าของโพส ยืนยันการส่งมอบ"
                                      : "ผู้ขอ ยืนยันการรับของ"
                                    : isOwner
                                      ? "ยืนยันว่าคุณได้ส่งมอบสิ่งของให้ผู้รับแล้ว"
                                      : "ยืนยันว่าคุณได้รับสิ่งของจากผู้ให้แล้ว"}
                                </AlertDialogDescription>
                              </div>
                            </div>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleConfirm(isOwner ? "owner" : "requester")}
                              className="bg-green-600 hover:bg-green-700 font-bold"
                            >
                              <CheckCheck className="h-4 w-4 mr-2" />
                              {getConfirmButtonLabel(exchange.status, isOwner ? "owner" : "requester")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {hasConfirmed && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-sm font-bold h-9" role="status">
                        <CheckCheck className="h-4 w-4 shrink-0" />
                        {getWaitingOtherConfirmationMessage(isOwner ? "owner" : "requester")}
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
                  status={exchange.status}
                  ownerConfirmed={exchange.ownerConfirmed}
                  requesterConfirmed={exchange.requesterConfirmed}
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
                  <h3 className="font-semibold mb-1">เริ่มการสนทนา</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    ส่งข้อความถึง{isOwner ? 'ผู้ขอรับ' : 'เจ้าของสิ่งของ'}เพื่อนัดหมายการรับของ
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
                        {loadingOlder ? <Loader2 className="h-4 w-4 animate-spin" /> : hasMoreOlder ? "โหลดข้อความเก่า" : "ไม่มีข้อความเก่าเพิ่ม"}
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
                                      ? format(msgDate, "HH:mm", { locale: th })
                                      : isYesterday(msgDate)
                                        ? `เมื่อวาน ${format(msgDate, "HH:mm", { locale: th })}`
                                        : msgDate.getFullYear() === new Date().getFullYear()
                                          ? format(msgDate, "d MMM HH:mm", { locale: th })
                                          : format(msgDate, "d MMM yyyy HH:mm", { locale: th })}
                                    {msg.updatedAt && " (แก้ไข)"}
                                  </p>
                                  {isOwnMessage && msg.readAt && (
                                    <span className="text-[10px] text-primary-foreground/70" title="อ่านแล้ว">อ่านแล้ว</span>
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
                                  แก้ไข
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    if (confirm("ลบข้อความนี้?")) handleDeleteMessage(msg)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  ลบ
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
                <p className="text-xs text-muted-foreground animate-pulse">กำลังพิมพ์...</p>
              )}
              <div ref={messagesEndRef} />
            </div>

            {isChatClosed ? (
              <div className="border-t p-4 bg-muted/50 text-center text-sm text-muted-foreground">
                {exchange.status === "cancelled"
                  ? "การแลกเปลี่ยนนี้ถูกยกเลิกแล้ว ไม่สามารถส่งข้อความได้"
                  : exchange.status === "rejected"
                    ? "การแลกเปลี่ยนนี้ถูกปฏิเสธแล้ว ไม่สามารถส่งข้อความได้"
                    : "การแลกเปลี่ยนเสร็จสมบูรณ์แล้ว ปิดห้องแชท"}
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="border-t p-3 sm:p-4 bg-background">
                <div className="flex gap-2 items-end">
                  <Input
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder="พิมพ์ข้อความ..."
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
                    <span className="sr-only">ส่ง</span>
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Modal (รายงานผู้ใช้เท่านั้น) */}
      {reportTargetId && exchange && (
        <ReportModal
          open={showReportModal}
          onOpenChange={setShowReportModal}
          reportType="user_report"
          targetId={reportTargetId}
          targetTitle={undefined}
        />
      )}

      {/* Review Modal */}
      {exchange && user && (
        <ReviewModal
          open={showReviewModal}
          onOpenChange={setShowReviewModal}
          exchangeId={exchangeId}
          targetUserId={user.uid === exchange.ownerId ? exchange.requesterId : exchange.ownerId}
          itemTitle={exchange.itemTitle}
          onSuccess={() => setHasReviewed(true)}
        />
      )}
    </div>
  )
}
