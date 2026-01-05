"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { updateTicketStatus, replyToTicket } from "@/lib/firestore"
import type { SupportTicket } from "@/types"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loader2, MessageSquare, Send, Eye, CheckCircle2, Clock, Inbox } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"

const ticketCategoryLabels: Record<string, string> = {
  general: "ปัญหาทั่วไป",
  bug: "แจ้งบัค",
  feature: "เสนอแนะฟีเจอร์",
  account: "ปัญหาบัญชี",
  other: "อื่นๆ",
}

const ticketStatusLabels: Record<string, string> = {
  new: "ใหม่",
  in_progress: "กำลังดำเนินการ",
  resolved: "แก้ไขแล้ว",
  closed: "ปิด",
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [ticketReply, setTicketReply] = useState("")
  const [processing, setProcessing] = useState(false)

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    checkAdmin()
  }, [user, authLoading])

  const checkAdmin = async () => {
    if (!user) return

    try {
      const db = getFirebaseDb()
      const adminsRef = collection(db, "admins")
      const q = query(adminsRef, where("email", "==", user.email))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        toast({
          title: "ไม่มีสิทธิ์เข้าถึง",
          description: "คุณไม่มีสิทธิ์ใช้งานหน้าผู้ดูแลระบบ",
          variant: "destructive",
        })
        router.push("/dashboard")
        return
      }

      setIsAdmin(true)
      setupRealTimeListener()
    } catch (error) {
      console.error("[AdminSupport] Error checking admin:", error)
      router.push("/dashboard")
    }
  }

  const setupRealTimeListener = () => {
    const db = getFirebaseDb()
    
    const unsubscribe = onSnapshot(
      query(collection(db, "support_tickets"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const ticketsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SupportTicket[]
        
        setTickets(ticketsData)
        setLoading(false)
      },
      (error) => {
        console.error("[AdminSupport] Listener error:", error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }

  const handleSendReply = async () => {
    if (!selectedTicket || !user || !ticketReply.trim()) return

    setProcessing(true)
    try {
      // replyToTicket(ticketId, reply, adminId, adminEmail)
      await replyToTicket(selectedTicket.id, ticketReply.trim(), user.uid, user.email || "")

      toast({ title: "ตอบกลับสำเร็จ" })
      setTicketReply("")
      
      // Refresh ticket data
      const db = getFirebaseDb()
      const { doc, getDoc } = await import("firebase/firestore")
      const ticketDoc = await getDoc(doc(db, "support_tickets", selectedTicket.id))
      if (ticketDoc.exists()) {
        setSelectedTicket({ id: ticketDoc.id, ...ticketDoc.data() } as SupportTicket)
      }
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { className: string; icon: typeof Clock }> = {
      new: { className: "bg-blue-100 text-blue-800 border-blue-200", icon: Inbox },
      in_progress: { className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
      resolved: { className: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
      closed: { className: "bg-muted text-muted-foreground border-muted", icon: CheckCircle2 },
    }
    const config = configs[status]
    if (!config) {
      return (
        <Badge className="bg-muted text-muted-foreground gap-1">
          {ticketStatusLabels[status] || status}
        </Badge>
      )
    }
    const Icon = config.icon
    
    return (
      <Badge className={`${config.className} gap-1`}>
        <Icon className="h-3 w-3" />
        {ticketStatusLabels[status] || status}
      </Badge>
    )
  }

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const newCount = tickets.filter(t => t.status === 'new').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-1">Support Tickets</h1>
        <p className="text-muted-foreground text-sm">จัดการคำร้องและตอบกลับผู้ใช้</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{tickets.length}</div>
            <p className="text-sm text-muted-foreground">ทั้งหมด</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{newCount}</div>
            <p className="text-sm text-muted-foreground">ใหม่</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{inProgressCount}</div>
            <p className="text-sm text-muted-foreground">กำลังดำเนินการ</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
            </div>
            <p className="text-sm text-muted-foreground">เสร็จสิ้น</p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            รายการ Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>หัวข้อ</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันที่</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>ไม่มี Tickets</p>
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">{ticket.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ticketCategoryLabels[ticket.category]}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow((ticket.createdAt as any)?.toDate?.() || new Date(), {
                        addSuffix: true,
                        locale: th,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(ticket)}>
                        <Eye className="h-4 w-4 mr-1" />
                        ดู
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden flex flex-col gap-0 max-h-[85vh]">
          <DialogHeader className="p-6 pb-4 pr-24 border-b bg-muted/10 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold tracking-tight">{selectedTicket?.subject}</DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 bg-background px-2 py-0.5 rounded-md border shadow-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    {selectedTicket?.userEmail}
                  </span>
                  <span className="text-border">•</span>
                  <Badge variant="outline" className="font-normal">
                    {ticketCategoryLabels[selectedTicket?.category || 'general']}
                  </Badge>
                </div>
              </div>
              {selectedTicket && getStatusBadge(selectedTicket.status)}
            </div>
          </DialogHeader>

          {selectedTicket && (
            <div className="flex-1 overflow-y-auto p-6 bg-muted/5 space-y-8">
              <div className="space-y-6">
                 {/* User Initial Message */}
                 <div className="flex gap-4 group">
                    <div className="h-10 w-10 rounded-full bg-gray-100 border flex items-center justify-center shrink-0">
                       <span className="font-bold text-gray-500 text-sm">USER</span>
                    </div>
                    <div className="flex-1 space-y-2">
                       <div className="flex items-baseline justify-between">
                          <span className="text-sm font-semibold text-foreground/80">ผู้ใช้งาน</span>
                          <span className="text-xs text-muted-foreground">
                             {formatDistanceToNow((selectedTicket.createdAt as any)?.toDate?.() || new Date(), { addSuffix: true, locale: th })}
                          </span>
                       </div>
                       <div className="bg-white dark:bg-card border p-4 rounded-2xl rounded-tl-none shadow-sm text-sm leading-relaxed whitespace-pre-wrap">
                          {selectedTicket.description}
                       </div>
                    </div>
                 </div>

                 {/* Chat History */}
                 {(selectedTicket.messages || [])
                    .concat(
                       // If no messages but legacy adminReply exists, treat as one message
                       (!selectedTicket.messages?.length && selectedTicket.adminReply) 
                       ? [{
                           id: 'legacy', 
                           sender: 'admin', 
                           content: selectedTicket.adminReply, 
                           senderEmail: selectedTicket.repliedByEmail || '', 
                           createdAt: selectedTicket.repliedAt || new Date()
                       } as any] 
                       : []
                    )
                    .map((msg: any, idx: number) => (
                    <div key={idx} className={`flex gap-4 group ${msg.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
                       <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 border ${
                          msg.sender === 'admin' 
                          ? 'bg-primary/10 border-primary/20 text-primary' 
                          : 'bg-gray-100 text-gray-500'
                       }`}>
                          <span className="font-bold text-sm uppercase">{msg.sender === 'admin' ? 'ADM' : 'USER'}</span>
                       </div>
                       <div className="flex-1 space-y-2">
                          <div className={`flex items-baseline justify-between ${msg.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
                             <span className={`text-sm font-semibold ${msg.sender === 'admin' ? 'text-primary' : 'text-foreground/80'}`}>
                                {msg.sender === 'admin' ? 'Admin Response' : 'ผู้ใช้งาน'}
                             </span>
                             <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow((msg.createdAt as any)?.toDate?.() || new Date(), { addSuffix: true, locale: th })}
                             </span>
                          </div>
                          <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap border shadow-sm ${
                             msg.sender === 'admin' 
                             ? 'bg-primary/5 border-primary/10 rounded-tr-none' 
                             : 'bg-white dark:bg-card rounded-tl-none'
                          }`}>
                             {msg.content}
                             {msg.sender === 'admin' && msg.senderEmail && (
                                <div className="mt-3 pt-3 border-t border-primary/10 text-xs text-muted-foreground flex items-center gap-1.5">
                                   <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">A</div>
                                   ตอบโดย {msg.senderEmail}
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
            </div>
          )}

          {/* Footer / Reply Area */}
          <div className="p-4 border-t bg-background shrink-0">
             {selectedTicket && selectedTicket.status !== 'closed' ? (
               <div className="space-y-4">
                 {/* Status Actions */}
                 <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">การดำเนินการ</p>
                    <div className="flex gap-2">
                       {selectedTicket.status !== 'resolved' && (
                          <Button
                             size="sm"
                             variant="outline"
                             onClick={async () => {
                                if (!user) return
                                setProcessing(true)
                                try {
                                   await updateTicketStatus(selectedTicket.id, 'resolved', user.uid, user.email || "")
                                   toast({ title: "เปลี่ยนสถานะเป็น แก้ไขแล้ว" })
                                   setSelectedTicket(null)
                                } catch (error: any) {
                                   toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" })
                                } finally {
                                   setProcessing(false)
                                }
                             }}
                             disabled={processing}
                             className="border-green-200 hover:bg-green-50 text-green-700 dark:border-green-900 dark:hover:bg-green-950/50 dark:text-green-400"
                          >
                             <CheckCircle2 className="h-4 w-4 mr-2" />
                             ทำเครื่องหมายว่าแก้ไขแล้ว
                          </Button>
                       )}
                    </div>
                 </div>

                 {/* Reply Input */}
                 <div className="flex gap-3 items-start">
                    <Textarea
                       value={ticketReply}
                       onChange={(e) => setTicketReply(e.target.value)}
                       placeholder="พิมพ์ข้อความตอบกลับผู้ใช้งาน..."
                       rows={1}
                       className="min-h-[44px] max-h-[120px] resize-none py-3"
                       onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault()
                             handleSendReply()
                          }
                       }}
                    />
                    <Button 
                       onClick={handleSendReply} 
                       disabled={processing || !ticketReply.trim()}
                       className="shrink-0 h-[44px] px-4"
                    >
                       {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                 </div>
                 <p className="text-[10px] text-muted-foreground text-center">
                    กด Enter เพื่อส่ง หรือ Shift + Enter เพื่อขึ้นบรรทัดใหม่
                 </p>
               </div>
             ) : (
                <div className="text-center py-2 text-muted-foreground text-sm flex items-center justify-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                   Ticket นี้ถูกปิดแล้ว ไม่สามารถตอบกลับได้
                </div>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
