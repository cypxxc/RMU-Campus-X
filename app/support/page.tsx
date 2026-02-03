"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { getUserSupportTickets, userReplyToTicket } from "@/lib/firestore"
import type { SupportTicket, SupportTicketStatus } from "@/types"
import { Navbar } from "@/components/navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, MessageSquare, Clock, CheckCircle2, AlertCircle, ArrowLeft, Inbox, Send } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replying, setReplying] = useState(false)
  const [ticketMessages, setTicketMessages] = useState<any[]>([])
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    loadTickets()
  }, [user, authLoading])

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

  const categoryLabels: Record<string, string> = {
    general: "ปัญหาทั่วไป",
    bug: "แจ้งข้อผิดพลาด",
    feature: "เสนอแนะฟังก์ชัน",
    account: "ปัญหาบัญชี",
    other: "อื่นๆ",
  }

  const statusConfig: Record<SupportTicketStatus, { label: string; color: string; icon: any }> = {
    new: { label: "รอดำเนินการ", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
    in_progress: { label: "กำลังดำเนินการ", color: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertCircle },
    resolved: { label: "แก้ไขแล้ว", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
    closed: { label: "ปิด", color: "bg-gray-100 text-gray-800 border-gray-200", icon: CheckCircle2 },
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
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
            {tickets.map((ticket) => {
              const status = statusConfig[ticket.status]
              const StatusIcon = status.icon
              const createdAt = (ticket.createdAt as any)?.toDate?.() || new Date()

              return (
                <Card 
                  key={ticket.id} 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold truncate">{ticket.subject}</h3>
                          <Badge variant="outline" className="text-[10px]">
                            {categoryLabels[ticket.category] || ticket.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {ticket.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(createdAt, { locale: th, addSuffix: true })}
                          </span>
                          {ticket.adminReply && (
                            <span className="flex items-center gap-1 text-primary">
                              <MessageSquare className="h-3 w-3" />
                              มีการตอบกลับ
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {ticket.priority && (
                          <Badge variant="outline" className={`text-[10px] ${
                            ticket.priority === 3 ? 'bg-red-50 text-red-600 border-red-200' :
                            ticket.priority === 2 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            {ticket.priority === 3 ? 'ด่วน' : ticket.priority === 2 ? 'ปานกลาง' : 'ปกติ'}
                          </Badge>
                        )}
                        <Badge className={`${status.color} gap-1`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-muted/10 shrink-0">
             <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  {selectedTicket?.subject}
                </DialogTitle>
                {selectedTicket && (
                  <Badge className={statusConfig[selectedTicket.status].color}>
                    {statusConfig[selectedTicket.status].label}
                  </Badge>
                )}
             </div>
             <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="font-normal text-[10px]">
                   {categoryLabels[selectedTicket?.category || 'general'] || selectedTicket?.category}
                </Badge>
                <span>•</span>
                <span>{selectedTicket?.id}</span>
             </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
             {ticketMessages.map((msg, idx) => {
               const isMe = msg.sender === 'user'
               return (
                 <div key={idx} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                   <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-2 rounded-2xl text-sm ${
                        isMe 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-white border shadow-sm rounded-tl-none'
                      }`}>
                         {msg.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {formatDistanceToNow((msg.createdAt as any)?.toDate ? (msg.createdAt as any).toDate() : (msg.createdAt instanceof Date ? msg.createdAt : new Date()), { addSuffix: true, locale: th })}
                         {!isMe && msg.senderEmail && ` • ${msg.senderEmail === 'Admin' ? 'ทีมงาน' : 'ทีมงาน'}`}
                      </span>
                   </div>
                 </div>
               )
             })}
          </div>

          <div className="p-4 bg-background border-t shrink-0">
             <form 
               onSubmit={(e: React.FormEvent) => {
                 e.preventDefault()
                 handleSendReply()
               }}
               className="flex gap-2"
             >
                <Input 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="พิมพ์ข้อความ..."
                  disabled={replying}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!replyText.trim() || replying}>
                   {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
             </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
