"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { replyToTicket, updateTicketStatus, getUserProfile } from "@/lib/firestore"
import type { SupportTicket, User } from "@/types"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Loader2, MessageSquare, Send, Eye, CheckCircle2, Clock, Inbox, ArrowLeft, RefreshCw, Search } from "lucide-react"
import Link from "next/link"

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
  const [ticketUser, setTicketUser] = useState<User | null>(null)
  const [ticketReply, setTicketReply] = useState("")
  const [processing, setProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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

  // Filter Logic
  const filteredTickets = tickets.filter(t => {
    const q = searchQuery.toLowerCase()
    return (
      (t.subject || "").toLowerCase().includes(q) ||
      (t.userEmail || "").toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q)
    )
  })

  const newCount = tickets.filter(t => t.status === 'new').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-7xl mx-auto px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-primary" />
              Support Tickets
            </h1>
            <p className="text-muted-foreground">จัดการคำร้องและตอบกลับผู้ใช้</p>
          </div>
        </div>
        <Button onClick={() => setupRealTimeListener()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          รีเฟรช
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
             <div className="p-2 bg-primary/10 rounded-lg">
                <Inbox className="h-5 w-5 text-primary" />
             </div>
             <div>
               <div className="text-2xl font-bold">{tickets.length}</div>
               <p className="text-xs text-muted-foreground">ทั้งหมด</p>
             </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
             <div className="p-2 bg-blue-100 rounded-lg">
                <Inbox className="h-5 w-5 text-blue-600" />
             </div>
             <div>
               <div className="text-2xl font-bold text-foreground">{newCount}</div>
               <p className="text-xs text-muted-foreground">ใหม่</p>
             </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
             <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
             </div>
             <div>
               <div className="text-2xl font-bold text-foreground">{inProgressCount}</div>
               <p className="text-xs text-muted-foreground">กำลังดำเนินการ</p>
             </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
             <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
             </div>
             <div>
               <div className="text-2xl font-bold text-foreground">
                 {tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
               </div>
               <p className="text-xs text-muted-foreground">เสร็จสิ้น</p>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="border-b px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              รายการ Tickets
              <Badge variant="secondary" className="ml-2 px-3 py-1">
                {filteredTickets.length} รายการ
              </Badge>
            </CardTitle>
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหา Ticket..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background w-full md:w-[300px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/40">
                <TableHead className="font-semibold">หัวข้อ</TableHead>
                <TableHead className="font-semibold">หมวดหมู่</TableHead>
                <TableHead className="font-semibold">สถานะ</TableHead>
                <TableHead className="font-semibold">วันที่</TableHead>
                <TableHead className="text-right font-semibold">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 px-4">
                    <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {searchQuery ? "ไม่พบ Ticket ที่ค้นหา" : "ไม่มี Tickets"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "ลองเปลี่ยนคำค้นหาใหม่" : "เมื่อมีผู้ใช้แจ้งปัญหาจะแสดงที่นี่"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-muted/5 border-b last:border-0">
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                          {ticket.userEmail}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal bg-background/50">{ticketCategoryLabels[ticket.category]}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {((ticket.createdAt as any)?.toDate?.() || new Date()).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={async () => {
                        setSelectedTicket(ticket)
                        // Fetch user profile
                        try {
                          const profile = await getUserProfile(ticket.userId)
                          setTicketUser(profile)
                        } catch (e) {
                          setTicketUser(null)
                        }
                      }}
                      className="hover:bg-primary/10 hover:text-primary"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        ดูรายละเอียด
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {filteredTickets.length > itemsPerPage && (
            <div className="flex items-center justify-center gap-2 p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ก่อนหน้า
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(filteredTickets.length / itemsPerPage) }, (_, i) => i + 1).slice(
                  Math.max(0, currentPage - 3),
                  Math.min(Math.ceil(filteredTickets.length / itemsPerPage), currentPage + 2)
                ).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    size="sm"
                    className="w-8 h-8"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTickets.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(filteredTickets.length / itemsPerPage)}
              >
                ถัดไป
              </Button>
            </div>
          )}
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
                    {ticketUser?.photoURL ? (
                       <img 
                          src={ticketUser.photoURL} 
                          alt={ticketUser.displayName || 'User'}
                          className="h-10 w-10 rounded-full border object-cover shrink-0"
                       />
                    ) : (
                       <div className="h-10 w-10 rounded-full bg-gray-100 border flex items-center justify-center shrink-0">
                          <span className="font-bold text-gray-500 text-sm uppercase">
                             {(ticketUser?.displayName || selectedTicket?.userEmail || 'U').charAt(0)}
                          </span>
                       </div>
                    )}
                    <div className="flex-1 space-y-2">
                       <div className="flex items-baseline justify-between">
                          <span className="text-sm font-semibold text-foreground/80">
                             {ticketUser?.displayName || selectedTicket?.userEmail?.split('@')[0] || 'ผู้ใช้งาน'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                             {((selectedTicket.createdAt as any)?.toDate?.() || new Date()).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                       {msg.sender === 'admin' ? (
                          <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 border bg-primary/10 border-primary/20 text-primary">
                             <span className="font-bold text-sm">ADM</span>
                          </div>
                       ) : ticketUser?.photoURL ? (
                          <img 
                             src={ticketUser.photoURL} 
                             alt={ticketUser.displayName || 'User'}
                             className="h-10 w-10 rounded-full border object-cover shrink-0"
                          />
                       ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-100 border flex items-center justify-center shrink-0 text-gray-500">
                             <span className="font-bold text-sm uppercase">
                                {(ticketUser?.displayName || selectedTicket?.userEmail || 'U').charAt(0)}
                             </span>
                          </div>
                       )}
                       <div className="flex-1 space-y-2">
                          <div className={`flex items-baseline justify-between ${msg.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
                             <span className={`text-sm font-semibold ${msg.sender === 'admin' ? 'text-primary' : 'text-foreground/80'}`}>
                                {msg.sender === 'admin' ? 'Admin Response' : (ticketUser?.displayName || selectedTicket?.userEmail?.split('@')[0] || 'ผู้ใช้งาน')}
                             </span>
                             <span className="text-xs text-muted-foreground">
                                {((msg.createdAt as any)?.toDate?.() || new Date()).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
  </div>
  )
}
