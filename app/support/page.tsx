"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Headphones,
  Inbox,
  Loader2,
  MessageSquare,
  Send,
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useI18n } from "@/components/language-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { authFetchJson } from "@/lib/api-client"
import { userReplyToTicket } from "@/lib/firestore"
import { safeToDate } from "@/lib/utils"
import type { SupportTicket, SupportTicketStatus } from "@/types"

const PAGE_SIZE = 10

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replying, setReplying] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [ticketMessages, setTicketMessages] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { locale, tt } = useI18n()

  const intlLocale = locale === "th" ? "th-TH" : "en-US"

  const formatTicketTime = (date: Date): string =>
    date.toLocaleString(intlLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const getLatestReplyPreview = (ticket: SupportTicket): string | null => {
    if (ticket.messages && ticket.messages.length > 0) {
      const last = ticket.messages[ticket.messages.length - 1] as { sender?: string; content?: string }
      if (last?.sender === "admin" && last?.content) return last.content
    }
    if (ticket.adminReply) return ticket.adminReply
    return null
  }

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const isPending = (status: SupportTicketStatus) => status === "new" || status === "in_progress"
      const aPending = isPending(a.status)
      const bPending = isPending(b.status)
      if (aPending !== bPending) return aPending ? -1 : 1
      return safeToDate(b.createdAt).getTime() - safeToDate(a.createdAt).getTime()
    })
  }, [tickets])

  const totalPages = Math.max(1, Math.ceil(sortedTickets.length / PAGE_SIZE))
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedTickets.slice(start, start + PAGE_SIZE)
  }, [currentPage, sortedTickets])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    loadTickets()
  }, [authLoading, router, user])

  useEffect(() => {
    const ticketId = searchParams.get("ticketId")
    if (!ticketId || tickets.length === 0) return
    const ticket = tickets.find((t) => t.id === ticketId)
    if (ticket) setSelectedTicket(ticket)
  }, [searchParams, tickets])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const loadTickets = async () => {
    if (!user) return
    setLoading(true)
    try {
      const response = await authFetchJson<{ tickets?: SupportTicket[] }>("/api/support", { method: "GET" })
      setTickets(response?.data?.tickets ?? [])
    } catch (error) {
      console.error("[Support] Error loading tickets:", error)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedTicket) return
    const messages: any[] = [
      {
        id: "initial",
        sender: "user",
        senderEmail: selectedTicket.userEmail,
        content: selectedTicket.description,
        createdAt: selectedTicket.createdAt,
      },
    ]

    if (selectedTicket.adminReply && (!selectedTicket.messages || selectedTicket.messages.length === 0)) {
      messages.push({
        id: "admin-reply",
        sender: "admin",
        senderEmail: selectedTicket.repliedByEmail || "Admin",
        content: selectedTicket.adminReply,
        createdAt: selectedTicket.repliedAt || selectedTicket.updatedAt,
      })
    }

    if (selectedTicket.messages && selectedTicket.messages.length > 0) {
      messages.push(...selectedTicket.messages)
    }

    messages.sort(
      (a, b) =>
        safeToDate((a as { createdAt?: unknown }).createdAt).getTime() -
        safeToDate((b as { createdAt?: unknown }).createdAt).getTime()
    )

    setTicketMessages(messages)
  }, [selectedTicket])

  const handleSendReply = async () => {
    if (!selectedTicket || !user || !replyText.trim()) return
    setReplying(true)
    try {
      await userReplyToTicket(selectedTicket.id, replyText.trim(), user.email || "")
      await loadTickets()
      setReplyText("")
      toast({ title: tt("ส่งข้อความแล้ว", "Message sent") })
    } catch (error: unknown) {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: error instanceof Error ? error.message : tt("ไม่สามารถส่งข้อความได้", "Unable to send reply"),
        variant: "destructive",
      })
    } finally {
      setReplying(false)
    }
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!user) return
    const confirmed = window.confirm(
      tt(
        "ต้องการลบคำร้องนี้หรือไม่? คุณจะไม่เห็นคำร้องนี้ในรายการของคุณอีกต่อไป",
        "Do you want to delete this ticket? It will no longer appear in your list."
      )
    )
    if (!confirmed) return

    setDeletingId(ticketId)
    try {
      await authFetchJson(`/api/support/${ticketId}`, { method: "DELETE" })
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null)
      }
      await loadTickets()
      toast({
        title: tt("ลบคำร้องแล้ว", "Ticket deleted"),
      })
    } catch (error: unknown) {
      console.error("[Support] Error deleting ticket:", error)
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description:
          error instanceof Error
            ? error.message
            : tt("ไม่สามารถลบคำร้องได้", "Unable to delete ticket"),
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    if (!selectedTicket || tickets.length === 0) return
    const updated = tickets.find((ticket) => ticket.id === selectedTicket.id)
    if (updated) setSelectedTicket(updated)
  }, [selectedTicket, tickets])

  const statusConfig: Record<SupportTicketStatus, { label: string; color: string; icon: any }> = {
    new: {
      label: tt("รอดำเนินการ", "Pending"),
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: Clock,
    },
    in_progress: {
      label: tt("กำลังดำเนินการ", "In progress"),
      color: "bg-amber-100 text-amber-800 border-amber-200",
      icon: AlertCircle,
    },
    resolved: {
      label: tt("ดำเนินการแล้ว", "Resolved"),
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle2,
    },
    closed: {
      label: tt("ปิด", "Closed"),
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: CheckCircle2,
    },
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                {tt("คำร้องของฉัน", "My support tickets")}
              </h1>
              <p className="text-muted-foreground text-sm">
                {tt("ประวัติคำร้องขอความช่วยเหลือ", "Your support request history")}
              </p>
            </div>
          </div>
        </div>

        {tickets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">{tt("ยังไม่มีคำร้อง", "No support tickets yet")}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {tt(
                  "หากมีปัญหาหรือข้อสงสัย กรุณาติดต่อทีมงานผ่านช่องทางอื่น",
                  "If you need help, please contact the team through available channels."
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {paginatedTickets.map((ticket) => {
              const status = statusConfig[ticket.status]
              const StatusIcon = status.icon
              const createdAt = safeToDate(ticket.createdAt)
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
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{ticket.description}</p>
                        {replyPreview && (
                          <div className="text-xs bg-primary/10 text-primary rounded-md px-2 py-1.5 mb-2 line-clamp-2 border border-primary/20">
                            <span className="font-medium">{tt("ทีมงาน:", "Team:")} </span>
                            {replyPreview.length > 80 ? `${replyPreview.slice(0, 80)}...` : replyPreview}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTicketTime(createdAt)}
                          </span>
                          {(ticket.adminReply ||
                            (ticket.messages && ticket.messages.some((message: any) => message.sender === "admin"))) && (
                            <span className="flex items-center gap-1 text-primary font-medium">
                              <MessageSquare className="h-3 w-3" />
                              {tt("มีการตอบกลับ", "Has reply")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge className={`${status.color} gap-1`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-medium text-primary flex items-center gap-1">
                            {tt("ดูและตอบกลับ", "View and reply")}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/5 px-2 h-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteTicket(ticket.id)
                            }}
                            disabled={deletingId === ticket.id}
                          >
                            {deletingId === ticket.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            {tt("ลบคำร้อง", "Delete ticket")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="ml-1">{tt("หน้าก่อน", "Previous")}</span>
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {tt(`หน้า ${currentPage} จาก ${totalPages}`, `Page ${currentPage} of ${totalPages}`)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <span className="mr-1">{tt("ถัดไป", "Next")}</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="w-[95vw] max-w-3xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-5 py-4 border-b shrink-0 space-y-0">
            <DialogTitle className="text-xl font-semibold truncate pr-8">{selectedTicket?.subject}</DialogTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {selectedTicket && (
                <Badge
                  variant="outline"
                  className={`font-normal text-xs rounded-full ${statusConfig[selectedTicket.status].color}`}
                >
                  {statusConfig[selectedTicket.status].label}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground truncate max-w-[180px] ml-auto sm:ml-0" title={selectedTicket?.id}>
                {selectedTicket?.id}
              </span>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 bg-background">
            <div className="p-4 sm:p-5 space-y-6">
              {ticketMessages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">
                  {tt("ยังไม่มีข้อความในคำร้องนี้", "No messages in this ticket yet")}
                </p>
              ) : (
                ticketMessages.map((message, index) => {
                  const isMe = message.sender === "user"
                  const timeString = formatTicketTime(
                    safeToDate((message as { createdAt?: unknown }).createdAt)
                  )
                  return (
                    <div key={index} className={`flex w-full gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
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
                          {message.content}
                        </div>
                        <div className={`flex items-center gap-1.5 mt-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                          <span className="text-[11px] text-muted-foreground">{timeString}</span>
                          {!isMe && (
                            <span className="text-[11px] text-muted-foreground">- {tt("ทีมงาน", "Support team")}</span>
                          )}
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

          <div className="shrink-0 border-t bg-muted/30 rounded-b-xl">
            {selectedTicket && (selectedTicket.status === "new" || selectedTicket.status === "in_progress") ? (
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
                  placeholder={tt("ตอบกลับทีมงาน...", "Reply to support team...")}
                  disabled={replying}
                  className="flex-1 rounded-full border-2 bg-background focus-visible:ring-2"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!replyText.trim() || replying}
                  className="shrink-0 rounded-full h-10 w-10 bg-primary hover:bg-primary/90"
                >
                  {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {tt("คำร้องนี้ปิดแล้ว ไม่สามารถส่งข้อความเพิ่มได้", "This ticket is closed. Replies are disabled.")}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
