"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { createNotification, getItemById, confirmExchange } from "@/lib/firestore"
import type { Exchange, ChatMessage, Item } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { Send, Loader2, CheckCheck, AlertTriangle, ChevronDown, Package } from "lucide-react"
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


export default function ChatPage({
  params,
}: {
  params: Promise<{ exchangeId: string }>
}) {
  const { exchangeId } = use(params)
  const [exchange, setExchange] = useState<Exchange | null>(null)
  const [item, setItem] = useState<Item | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportType, setReportType] = useState<"chat_report" | "user_report">("chat_report")
  const [reportTargetId, setReportTargetId] = useState<string | null>(null)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error?.message || "ไม่สามารถโหลดการแลกเปลี่ยนได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    const db = getFirebaseDb()
    const q = query(
      collection(db, "chatMessages"),
      where("exchangeId", "==", exchangeId),
      orderBy("createdAt", "asc")
    )

    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ChatMessage)
      setMessages(msgs)
    }, (error: any) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error?.message || "ไม่สามารถโหลดข้อความได้",
        variant: "destructive",
      })
    })
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || !exchange) return

    setSending(true)
    try {
      const db = getFirebaseDb()
      await addDoc(collection(db, "chatMessages"), {
        exchangeId,
        senderId: user.uid,
        senderEmail: user.email,
        message: newMessage.trim(),
        createdAt: serverTimestamp(),
      })

      setNewMessage("")
      scrollToBottom()

      // Create notification for recipient
      const recipientId = user.uid === exchange.ownerId ? exchange.requesterId : exchange.ownerId

      await createNotification({
        userId: recipientId,
        title: "ข้อความใหม่",
        message: `คุณได้รับข้อความใหม่จากการแลกเปลี่ยน: ${exchange.itemTitle}`,
        type: "chat",
        relatedId: exchangeId,
        senderId: user.uid,
      })

      // Send LINE notification (async, don't block)
      try {
        fetch('/api/line/notify-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId,
            senderName: user.email?.split('@')[0] || 'ผู้ใช้',
            itemTitle: exchange.itemTitle,
            messagePreview: newMessage.trim(),
            exchangeId
          })
        }).catch(err => console.log('[LINE] Notify chat error:', err))
      } catch (lineError) {
        console.log('[LINE] Notify chat error:', lineError)
      }
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error?.message || "ไม่สามารถส่งข้อความได้",
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
          // Notify owner
          if (exchange.ownerId !== user?.uid) {
             // Use firestore notification only, LINE is supplementary
          }
          
          // Send LINE to Owner
          fetch('/api/line/notify-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'status_change',
              recipientUserId: exchange.requesterId,
              itemTitle: exchange.itemTitle,
              status: 'completed',
              exchangeId
            })
          }).catch(err => console.log('[LINE] Notify requester error:', err))
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
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error?.message || "ไม่สามารถยืนยันได้",
        variant: "destructive",
      })
    }
  }

  if (loading) {
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
        <Card className="h-[calc(100vh-12rem)]">
          <CardHeader className="border-b bg-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {itemImage ? (
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden border">
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
                  <CardTitle className="text-lg">{exchange.itemTitle}</CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                    {isOwner ? `คุยกับ ${exchange.requesterEmail}` : `คุยกับ ${exchange.ownerEmail}`}
                    {item && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary ml-2">
                        {item.category}
                      </span>
                    )}
                  </p>
                  {item && (
                    <div className="mt-1 text-xs text-muted-foreground/80 space-y-0.5">
                      {item.location && (
                        <p className="flex items-center gap-1">
                          📍 {item.location} {item.locationDetail && `(${item.locationDetail})`}
                        </p>
                      )}
                      <p className="line-clamp-1 italic max-w-[200px] sm:max-w-md">
                        "{item.description}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-9">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      รายงาน
                      <ChevronDown className="h-4 w-4 ml-2" />
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
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-bold border border-primary/20 h-9">
                    <CheckCheck className="h-4 w-4" />
                    แลกเปลี่ยนสำเร็จ
                  </div>
                ) : (
                  <>
                    {!hasConfirmed && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="h-9 font-bold">
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

          <CardContent className="flex flex-col h-full p-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isOwnMessage = msg.senderId === user?.uid
                const msgDate = msg.createdAt?.toDate?.() || new Date()

                return (
                  <div key={msg.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatDistanceToNow(msgDate, { addSuffix: true, locale: th })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="พิมพ์ข้อความ..."
                  disabled={sending}
                />
                <Button type="submit" disabled={sending || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
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
    </div>
  )
}
