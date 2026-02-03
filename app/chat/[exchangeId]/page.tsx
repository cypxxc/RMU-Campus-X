"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, getDoc, getDocs, updateDoc, deleteDoc, setDoc, writeBatch, limit, endBefore, serverTimestamp, Timestamp } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { createNotification, getItemById, confirmExchange } from "@/lib/firestore"
import type { Exchange, ChatMessage, Item } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { Send, Loader2, CheckCheck, AlertTriangle, ChevronDown, Package, MessageCircle, MoreVertical, Pencil, Trash2, Check, X } from "lucide-react"
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
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import { ReportModal } from "@/components/report-modal"
import { ChatImageUpload } from "@/components/chat/chat-image-upload"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { ReviewModal } from "@/components/review-modal"
import { checkExchangeReviewed } from "@/lib/db/reviews"
import { Star } from "lucide-react"


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

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const oldestMessageRef = useRef<ChatMessage | null>(null)

  const messages = [...olderMessages, ...newestMessages]

  // Image Upload State
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null)
  
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportType, setReportType] = useState<"chat_report" | "user_report">("chat_report")
  const [reportTargetId, setReportTargetId] = useState<string | null>(null)
  
  // Review State
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // รอให้ auth โหลดเสร็จก่อน
    if (authLoading) return

    // ถ้าไม่มี user หลังจาก auth โหลดเสร็จแล้ว ให้ redirect
    if (!user) {
      router.push("/login")
      return
    }

    loadExchange()
    const unsubscribe = subscribeToMessages()

    return () => unsubscribe()
  }, [exchangeId, user, authLoading])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadExchange = async () => {
    try {
      const db = getFirebaseDb()
      const docRef = doc(db, "exchanges", exchangeId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const exchangeData = { id: docSnap.id, ...docSnap.data() } as Exchange
        setExchange(exchangeData)
        
        // Fetch item details
        const itemRes = await getItemById(exchangeData.itemId)
        if (itemRes.success && itemRes.data) {
          setItem(itemRes.data)
        }
      } else {
        toast({
          title: "ไม่พบการแลกเปลี่ยน",
          variant: "destructive",
        })
        router.push("/dashboard")
      }
    } catch (error: unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถโหลดการแลกเปลี่ยนได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Check if user has already reviewed when exchange is completed
  useEffect(() => {
    if (exchange?.status === "completed" && user) {
      checkExchangeReviewed(exchange.id, user.uid).then(setHasReviewed)
    }
  }, [exchange?.status, exchange?.id, user])

  const PAGE_SIZE = 50
  const LOAD_MORE_SIZE = 20

  const subscribeToMessages = () => {
    const db = getFirebaseDb()
    const q = query(
      collection(db, "chatMessages"),
      where("exchangeId", "==", exchangeId),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    )

    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage)
      const ascending = [...msgs].reverse()
      setNewestMessages(ascending)
      if (ascending.length > 0) {
        oldestMessageRef.current = ascending[0]
      }
      if (msgs.length < PAGE_SIZE) setHasMoreOlder(false)
    }, (error: unknown) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถโหลดข้อความได้",
        variant: "destructive",
      })
    })
  }

  useEffect(() => {
    if (!user || !exchange || newestMessages.length === 0) return
    const otherId = user.uid === exchange.ownerId ? exchange.requesterId : exchange.ownerId
    const unread = newestMessages.filter((m) => m.senderId === otherId && !m.readAt)
    if (unread.length === 0) return
    const db = getFirebaseDb()
    const batch = writeBatch(db)
    const now = Timestamp.now()
    unread.slice(0, 500).forEach((m) => {
      batch.update(doc(db, "chatMessages", m.id), { readAt: now })
    })
    batch.commit().catch((e) => console.warn("Mark read failed:", e))
  }, [newestMessages, user?.uid, exchange?.ownerId, exchange?.requesterId, exchange?.id])

  const loadMoreOlder = async () => {
    if (!user || loadingOlder || !hasMoreOlder) return
    const currentOldest = olderMessages.length > 0 ? olderMessages[0] : oldestMessageRef.current
    if (!currentOldest) return
    setLoadingOlder(true)
    try {
      const db = getFirebaseDb()
      const msgRef = doc(db, "chatMessages", currentOldest.id)
      const msgSnap = await getDoc(msgRef)
      if (!msgSnap.exists()) {
        setHasMoreOlder(false)
        return
      }
      const q = query(
        collection(db, "chatMessages"),
        where("exchangeId", "==", exchangeId),
        orderBy("createdAt", "asc"),
        endBefore(msgSnap),
        limit(LOAD_MORE_SIZE)
      )
      const snap = await getDocs(q)
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage)
      setOlderMessages((prev) => [...docs, ...prev])
      if (docs.length < LOAD_MORE_SIZE) setHasMoreOlder(false)
    } catch (err) {
      toast({
        title: "โหลดข้อความเก่าไม่สำเร็จ",
        variant: "destructive",
      })
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
    const unsub = onSnapshot(doc(db, "chatTyping", exchangeId), (snap) => {
      if (!snap.exists()) {
        setOtherTyping(false)
        return
      }
      const data = snap.data()
      const t = data?.[otherKey]
      const millis = t && typeof (t as { toMillis?: () => number }).toMillis === "function" ? (t as { toMillis: () => number }).toMillis() : 0
      setOtherTyping(millis > 0 && Date.now() - millis < 5000)
    })
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
      const db = getFirebaseDb()
      await updateDoc(doc(db, "chatMessages", msg.id), {
        message: newText.trim(),
        updatedAt: serverTimestamp(),
      })
      setEditingMessageId(null)
      setEditDraft("")
    } catch {
      toast({ title: "แก้ไขไม่สำเร็จ", variant: "destructive" })
    }
  }

  const handleDeleteMessage = async (msg: ChatMessage) => {
    if (!user || msg.senderId !== user.uid) return
    try {
      const db = getFirebaseDb()
      await deleteDoc(doc(db, "chatMessages", msg.id))
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !selectedImageFile) || !user || !exchange) return

    setSending(true)
    try {
      let imageUrl = undefined
      let imageType = undefined

      // Upload image if selected
      if (selectedImageFile) {
        const formData = new FormData()
        formData.append('file', selectedImageFile)
        formData.append('preset', 'chat')

        const token = await user.getIdToken()
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (!uploadRes.ok) {
           // Try to parse error
           let errorMsg = 'Image upload failed'
           try {
             const errData = await uploadRes.json()
             errorMsg = errData.error || errorMsg
           } catch {}
           throw new Error(errorMsg)
        }

        const data = await uploadRes.json()
        imageUrl = data.url
        imageType = selectedImageFile.type
      }

      const messageText = newMessage.trim() || (imageUrl ? "ส่งรูปภาพ" : "")

      const db = getFirebaseDb()
      await addDoc(collection(db, "chatMessages"), {
        exchangeId,
        senderId: user.uid,
        senderEmail: user.email,
        message: messageText,
        imageUrl: imageUrl || null,
        imageType: imageType || null,
        createdAt: serverTimestamp(),
      })

      setNewMessage("")
      setSelectedImageFile(null)
      setSelectedImagePreview(null)
      scrollToBottom()

      // Create notification for recipient
      const recipientId = user.uid === exchange.ownerId ? exchange.requesterId : exchange.ownerId
      const notificationMessage = imageUrl ? 
        (newMessage.trim() ? `ส่งรูปภาพและข้อความถึงคุณ: ${newMessage.trim()}` : `ส่งรูปภาพถึงคุณ`) : 
        `ส่งข้อความถึงคุณ: ${newMessage.substring(0, 30)}...`

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
            messagePreview: imageUrl ? '[ส่งรูปภาพ]' : newMessage.trim(),
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
                <div>
                  <CardTitle className="text-lg leading-tight">{exchange.itemTitle}</CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap mt-1">
                    {isOwner ? `คุยกับ ${exchange.requesterEmail}` : `คุยกับ ${exchange.ownerEmail}`}
                    {item && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary ml-2 border border-primary/20">
                        {item.category}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-9 gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="hidden sm:inline">รายงาน</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => {
                        setReportType("chat_report")
                        setReportTargetId(exchangeId)
                        setShowReportModal(true)
                      }}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      รายงานแชท
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setReportType("user_report")
                        setReportTargetId(isOwner ? exchange.requesterId : exchange.ownerId)
                        setShowReportModal(true)
                      }}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      รายงานผู้ใช้
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {exchange.status === "completed" ? (
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
                ) : (
                  <>
                    {!hasConfirmed && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="h-9 font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all">
                            <CheckCheck className="h-4 w-4 mr-2" />
                            ยืนยัน
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-md">
                          <AlertDialogHeader>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                                <CheckCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                              <div>
                                <AlertDialogTitle>ยืนยันการแลกเปลี่ยน</AlertDialogTitle>
                                <AlertDialogDescription className="mt-1">
                                  {isOwner 
                                    ? "ยืนยันว่าคุณได้ให้สิ่งของและได้รับของแลกเปลี่ยนแล้ว"
                                    : "ยืนยันว่าคุณได้รับสิ่งของและให้ของแลกเปลี่ยนแล้ว"
                                  }
                                </AlertDialogDescription>
                              </div>
                            </div>
                          </AlertDialogHeader>
                          <div className="bg-muted/50 rounded-lg p-3 text-sm">
                            <p className="font-medium mb-1">หมายเหตุ:</p>
                            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                              <li>กดยืนยันเมื่อคุณได้รับของและตรวจสอบความถูกต้องแล้ว</li>
                              <li>การแลกเปลี่ยนจะเสร็จสมบูรณ์เมื่อทั้งสองฝ่ายกดยืนยัน</li>
                            </ul>
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleConfirm(isOwner ? "owner" : "requester")}
                              className="bg-green-600 hover:bg-green-700 font-bold"
                            >
                              <CheckCheck className="h-4 w-4 mr-2" />
                              ยืนยันเรียบร้อย
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    
                    {hasConfirmed && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-200 text-sm font-bold h-9">
                        <CheckCheck className="h-4 w-4" />
                        คุณยืนยันแล้ว
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
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
                    const msgDate = msg.createdAt?.toDate?.() || (typeof msg.createdAt === "object" && (msg.createdAt as { toDate?: () => Date }).toDate?.()) || new Date()
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
                            {msg.imageUrl && (
                              <div className="mb-2 rounded-lg overflow-hidden relative">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <div className="relative cursor-pointer hover:opacity-90 transition-opacity">
                                      <Image
                                        src={msg.imageUrl}
                                        alt="Sent image"
                                        width={300}
                                        height={200}
                                        className="w-full h-auto object-cover max-h-[250px] rounded-lg bg-black/5"
                                        unoptimized
                                      />
                                    </div>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl p-0 overflow-hidden bg-transparent border-none shadow-none">
                                    <div className="relative w-full h-[80vh]">
                                      <Image src={msg.imageUrl} alt="Full view" fill className="object-contain" unoptimized />
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            )}
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
                                    {formatDistanceToNow(msgDate, { addSuffix: true, locale: th })}
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

            <form onSubmit={handleSendMessage} className="border-t p-3 sm:p-4 bg-background">
              <div className="flex gap-2 items-end">
                <ChatImageUpload
                  onImageSelected={(file, preview) => {
                    setSelectedImageFile(file)
                    setSelectedImagePreview(preview)
                  }}
                  onClear={() => {
                    setSelectedImageFile(null)
                    setSelectedImagePreview(null)
                  }}
                  selectedImage={selectedImagePreview}
                  disabled={sending}
                />
                <Input
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder="พิมพ์ข้อความ..."
                  disabled={sending}
                  className="min-h-[40px] max-h-[120px] py-2"
                />
                <Button 
                  type="submit" 
                  disabled={sending || (!newMessage.trim() && !selectedImageFile)}
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
          </CardContent>
        </Card>
      </div>

      {/* Report Modal */}
      {reportTargetId && exchange && (
        <ReportModal
          open={showReportModal}
          onOpenChange={setShowReportModal}
          reportType={reportType}
          targetId={reportTargetId}
          targetTitle={reportType === "chat_report" ? exchange.itemTitle : undefined}
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
