"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { getUserSupportTickets, userReplyToTicket } from "@/lib/firestore"
import type { SupportTicket, SupportTicketStatus } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, MessageSquare, Clock, CheckCircle2, AlertCircle, Inbox, Send, ChevronRight, ChevronLeft, UserCircle, Headphones, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function formatTicketTime(date: Date): string {
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getLatestReplyPreview(ticket: SupportTicket): string | null {
  if (ticket.messages && ticket.messages.length > 0) {
    const last = ticket.messages[ticket.messages.length - 1] as { sender?: string; content?: string }
    if (last?.sender === "admin" && last?.content) return last.content
  }
  if (ticket.adminReply) return ticket.adminReply
  return null
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replying, setReplying] = useState(false)
  const [ticketMessages, setTicketMessages] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const { user, loading: authLoading } = useAuth()

  const PAGE_SIZE = 10

  // เรียง: คำร้องที่รอดำเนินการ (new, in_progress) บนสุด แล้วตามด้วยวันที่สร้างล่าสุด
  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const pending = (s: SupportTicketStatus) => s === "new" || s === "in_progress"
      const aPending = pending(a.status)
      const bPending = pending(b.status)
      if (aPending !== bPending) return aPending ? -1 : 1
      const timeA = (a.createdAt as any)?.toMillis?.() ?? (a.createdAt as any)?.toDate?.()?.getTime?.() ?? (a.createdAt instanceof Date ? a.createdAt.getTime() : 0)
      const timeB = (b.createdAt as any)?.toMillis?.() ?? (b.createdAt as any)?.toDate?.()?.getTime?.() ?? (b.createdAt instanceof Date ? b.createdAt.getTime() : 0)
      return timeB - timeA
    })
  }, [tickets])

  const totalPages = Math.max(1, Math.ceil(sortedTickets.length / PAGE_SIZE))
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedTickets.slice(start, start + PAGE_SIZE)
  }, [sortedTickets, currentPage])
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    loadTickets()
  }, [user, authLoading])

  // เปิด ticket จากลิงก์ (เช่น จากหน้าโปรไฟล์ /support?ticketId=xxx)
  useEffect(() => {
    const ticketId = searchParams.get("ticketId")
    if (!ticketId || tickets.length === 0) return
    const ticket = tickets.find((t) => t.id === ticketId)
    if (ticket) setSelectedTicket(ticket)
  }, [searchParams, tickets])

  // คงหน้าให้อยู่ในช่วงเมื่อจำนวน ticket ลดลง
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [totalPages, currentPage])

  const loadTickets = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getUserSupportTickets(user.uid)
      setTickets(data)
    } catch (error) {
      console.error("[Support] Error loading tickets:", error)
    } finally {
      setLoading(false)
    }
  }

  // Effect to prepare messages when ticket is selected
  useEffect(() => {
    if (selectedTicket) {
      const msgs = []
      // 1. Add description as first message
      msgs.push({
        id: 'initial',
        sender: 'user',
        senderEmail: selectedTicket.userEmail,
        content: selectedTicket.description,
        createdAt: selectedTicket.createdAt
      })

      // 2. Add adminReply if exists (legacy)
      if (selectedTicket.adminReply && (!selectedTicket.messages || selectedTicket.messages.length === 0)) {
        msgs.push({
          id: 'admin-reply',
          sender: 'admin',
          senderEmail: selectedTicket.repliedByEmail || 'Admin',
          content: selectedTicket.adminReply,
          createdAt: selectedTicket.repliedAt || selectedTicket.updatedAt
        })
      }

      // 3. Add messages array
      if (selectedTicket.messages && selectedTicket.messages.length > 0) {
        msgs.push(...selectedTicket.messages)
      }
      
      // Sort by date
      // Note: createdAt might be Timestamp or Date or Object. Handle carefully.
      msgs.sort((a, b) => {
        const timeA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0)
        const timeB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0)
        return timeA - timeB
      })
      
      setTicketMessages(msgs)
    }
  }, [selectedTicket])

  const handleSendReply = async () => {
    if (!selectedTicket || !user || !replyText.trim()) return
    
    setReplying(true)
    try {
      await userReplyToTicket(
        selectedTicket.id, 
        replyText.trim(), 
        user.email || ""
      )
      
      // Refresh tickets
      await loadTickets()
      setReplyText("")
      toast({ title: "ส่งข้อความแล้ว" })
      
      // Update local view immediately (Optimistic UI)
      // Note: loadTickets updates 'tickets', but 'selectedTicket' needs update too
      // We can find the updated ticket from new 'tickets' data?
      // Since loadTickets is async, we can call it.
      // But standard way: Close modal or just let reload happen. 
      // Better: Re-fetch user support tickets returns updated array.
      // I'll update selectedTicket from the new fetched data.
      
    } catch (error: any) {
      console.error(error)
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setReplying(false)
    }
  }

  // Hook into loadTickets to update selectedTicket if it's open
  useEffect(() => {
    if (selectedTicket && tickets.length > 0) {
      const updated = tickets.find(t => t.id === selectedTicket.id)
      if (updated) setSelectedTicket(updated)
    }
  }, [tickets])

  const statusConfig: Record<SupportTicketStatus, { label: string; color: string; icon: any }> = {
    new: { label: "รอดำเนินการ", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
    in_progress: { label: "กำลังดำเนินการ", color: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertCircle },
    resolved: { label: "แก้ไขแล้ว", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
    closed: { label: "ปิด", color: "bg-gray-100 text-gray-800 border-gray-200", icon: CheckCircle2 },
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                คำร้องของฉัน
              </h1>
              <p className="text-muted-foreground text-sm">ประวัติคำร้องขอความช่วยเหลือ</p>
            </div>
          </div>
          </div>

        {/* Tickets List */}
        {tickets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">ยังไม่มีคำร้อง</h3>
              <p className="text-muted-foreground text-sm mb-4">
                หากมีปัญหาหรือข้อสงสัย กรุณาติดต่อทีมงานผ่านช่องทางอื่น
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {paginatedTickets.map((ticket) => {
              const status = statusConfig[ticket.status]
              const StatusIcon = status.icon
              const createdAt = (ticket.createdAt as any)?.toDate?.() || new Date()
              const replyPreview = getLatestReplyPreview(ticket)

              return (
                <Card
                  key={ticket.id}
                  className="cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors overflow-hidden"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold truncate">{ticket.subject}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {ticket.description}
                        </p>
                        {replyPreview && (
                          <div className="text-xs bg-primary/10 text-primary rounded-md px-2 py-1.5 mb-2 line-clamp-2 border border-primary/20">
                            <span className="font-medium">ทีมงาน: </span>
                            {replyPreview.length > 80 ? `${replyPreview.slice(0, 80)}...` : replyPreview}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTicketTime(createdAt)}
                          </span>
                          {(ticket.adminReply || (ticket.messages && ticket.messages.some((m: any) => m.sender === "admin"))) && (
                            <span className="flex items-center gap-1 text-primary font-medium">
                              <MessageSquare className="h-3 w-3" />
                              มีการตอบกลับ
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge className={`${status.color} gap-1`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                        <span className="text-xs font-medium text-primary flex items-center gap-1">
                          ดูและตอบกลับ
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="ml-1">หน้าก่อน</span>
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  หน้า {currentPage} จาก {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <span className="mr-1">ถัดไป</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="w-[95vw] max-w-3xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl">
          {/* หัวข้อ: ชื่อคำร้อง + สถานะ + ID */}
          <DialogHeader className="px-5 py-4 border-b shrink-0 space-y-0">
            <DialogTitle className="text-xl font-semibold truncate pr-8">
              {selectedTicket?.subject}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {selectedTicket && (
                <Badge variant="outline" className={`font-normal text-xs rounded-full ${statusConfig[selectedTicket.status].color}`}>
                  {statusConfig[selectedTicket.status].label}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground truncate max-w-[180px] ml-auto sm:ml-0" title={selectedTicket?.id}>
                {selectedTicket?.id}
              </span>
            </div>
          </DialogHeader>

          {/* พื้นที่แชท - ฟองข้อความกว้างตามเนื้อหา */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-background">
            <div className="p-4 sm:p-5 space-y-6">
              {ticketMessages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">ยังไม่มีข้อความในคำร้องนี้</p>
              ) : (
                ticketMessages.map((msg, idx) => {
                  const isMe = msg.sender === "user"
                  const timeStr = formatTicketTime(
                    (msg.createdAt as any)?.toDate
                      ? (msg.createdAt as any).toDate()
                      : msg.createdAt instanceof Date
                        ? msg.createdAt
                        : new Date()
                  )
                  return (
                    <div
                      key={idx}
                      className={`flex w-full gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {/* Avatar: ทีมงาน = Headphones, ผู้ใช้ = ไม่แสดง (แสดงไอคอนใต้ข้อความแทน) */}
                      {!isMe && (
                        <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground border">
                          <Headphones className="h-4 w-4" />
                        </div>
                      )}
                      <div className={`flex flex-col min-w-0 max-w-[85%] ${isMe ? "items-end" : "items-start"}`}>
                        <div
                          className={`w-fit max-w-full rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted/80 text-foreground border rounded-bl-md"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1.5 mt-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                          <span className="text-[11px] text-muted-foreground">{timeStr}</span>
                          {!isMe && <span className="text-[11px] text-muted-foreground">- ทีมงาน</span>}
                          {isMe && (
                            <span className="w-3.5 h-3.5 rounded-full bg-primary/30 flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-primary" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                      </div>
                      {isMe && <div className="w-9 shrink-0" />}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ช่องตอบกลับ */}
          <div className="shrink-0 border-t bg-muted/30 rounded-b-xl">
            {selectedTicket &&
            (selectedTicket.status === "new" || selectedTicket.status === "in_progress") ? (
              <form
                onSubmit={(e: React.FormEvent) => {
                  e.preventDefault()
                  handleSendReply()
                }}
                className="p-4 flex gap-2 items-center"
              >
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="ตอบกลับทีมงาน..."
                  disabled={replying}
                  className="flex-1 rounded-full border-2 bg-background focus-visible:ring-2"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!replyText.trim() || replying}
                  className="shrink-0 rounded-full h-10 w-10 bg-primary hover:bg-primary/90"
                >
                  {replying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">คำร้องนี้ปิดแล้ว ไม่สามารถส่งข้อความเพิ่มได้</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
