"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, DocumentSnapshot } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { replyToTicket, updateTicketStatus, getUserProfile, getSupportTickets } from "@/lib/firestore"
import type { SupportTicket, User, SupportTicketStatus } from "@/types"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Loader2, MessageSquare, Send, Eye, CheckCircle2, Clock, Inbox, ArrowLeft, Search } from "lucide-react"
import Link from "next/link"

const ticketCategoryLabels: Record<string, string> = {
  general: "ปัญหาทั่วไป",
  bug: "แจ้งข้อผิดพลาด",
  feature: "เสนอแนะฟังก์ชัน",
  account: "ปัญหาบัญชี",
  other: "อื่นๆ",
}

const ticketStatusLabels: Record<string, string> = {
  new: "ใหม่",
  in_progress: "กำลังดำเนินการ",
  resolved: "แก้ไขแล้ว",
  closed: "ปิด",
}

const getStatusBadge = (status: string) => {
  const configs: Record<string, { className: string; icon: any }> = {
    new: { className: "bg-blue-100 text-blue-800 border-blue-200", icon: Inbox },
    in_progress: { className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
    resolved: { className: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
    closed: { className: "bg-muted text-muted-foreground border-muted", icon: CheckCircle2 },
  }
  const config = configs[status]
  
  const Icon = config?.icon || CheckCircle2 // Fallback icon

  if (!config) {
    return (
      <Badge className="bg-muted text-muted-foreground gap-1">
        {ticketStatusLabels[status] || status}
      </Badge>
    )
  }
  
  return (
    <Badge className={`${config.className} gap-1 shadow-sm`}>
      <Icon className="h-3 w-3" />
      {ticketStatusLabels[status] || status}
    </Badge>
  )
}

interface PaginationState {
  data: SupportTicket[]
  lastDoc: DocumentSnapshot | null
  hasMore: boolean
  totalCount: number
  loading: boolean
}

export default function AdminSupportPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [ticketUser, setTicketUser] = useState<User | null>(null)
  const [ticketReply, setTicketReply] = useState("")
  const [processing, setProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  // Separate state for each tab to preserve data when switching
  const [pendingState, setPendingState] = useState<PaginationState>({ data: [], lastDoc: null, hasMore: true, totalCount: 0, loading: false })
  const [historyState, setHistoryState] = useState<PaginationState>({ data: [], lastDoc: null, hasMore: true, totalCount: 0, loading: false })
  const pendingStateRef = useRef(pendingState)
  const historyStateRef = useRef(historyState)

  useEffect(() => {
    pendingStateRef.current = pendingState
  }, [pendingState])

  useEffect(() => {
    historyStateRef.current = historyState
  }, [historyState])

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const checkAdmin = useCallback(async () => {
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
    } catch (error) {
      console.error("[AdminSupport] Error checking admin:", error)
      router.push("/dashboard")
    }
  }, [router, toast, user])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    checkAdmin()
  }, [authLoading, checkAdmin, router, user])

  const loadTickets = useCallback(async (tab: 'pending' | 'history', reset = false) => {
    const currentState = tab === 'pending' ? pendingStateRef.current : historyStateRef.current
    const setState = tab === 'pending' ? setPendingState : setHistoryState
    
    if (currentState.loading) return

    setState(prev => ({ ...prev, loading: true }))

    try {
      const statusFilters: SupportTicketStatus[] = tab === 'pending' 
        ? ['new', 'in_progress'] 
        : ['resolved', 'closed']

      const { tickets, lastDoc, hasMore, totalCount } = await getSupportTickets(
        statusFilters, 
        10, 
        reset ? null : currentState.lastDoc
      )

      setState(prev => ({
        data: reset ? tickets : [...prev.data, ...tickets],
        lastDoc,
        hasMore,
        totalCount,
        loading: false
      }))

    } catch (error) {
      console.error(`[AdminSupport] Error loading ${tab} tickets:`, error)
      setState(prev => ({ ...prev, loading: false }))
      toast({ title: "โหลดข้อมูลล้มเหลว", variant: "destructive" })
    }
  }, [toast])

  useEffect(() => {
    if (!isAdmin || isDataLoaded) return
    loadTickets('pending', true)
    loadTickets('history', true)
    setIsDataLoaded(true)
  }, [isAdmin, isDataLoaded, loadTickets])

  const handleSendReply = async () => {
    if (!selectedTicket || !user || !ticketReply.trim()) return

    setProcessing(true)
    try {
      await replyToTicket(selectedTicket.id, ticketReply.trim(), user.uid, user.email || "")

      toast({ title: "ตอบกลับสำเร็จ" })
      setTicketReply("")
      
      // Update local state locally for immediate feedback
      // Note: This won't refresh the list, but updates the opened modal if we re-fetch ticket
      // Usually we might want to refresh the specific ticket
      
      const db = getFirebaseDb()
      const { doc, getDoc } = await import("firebase/firestore")
      const ticketDoc = await getDoc(doc(db, "support_tickets", selectedTicket.id))
      
      if (ticketDoc.exists()) {
        const newData = { id: ticketDoc.id, ...ticketDoc.data() } as SupportTicket
        setSelectedTicket(newData)
        
        // Update in list
        const updateInList = (list: SupportTicket[]) => list.map(t => t.id === newData.id ? newData : t)
        setPendingState(prev => ({ ...prev, data: updateInList(prev.data) }))
        setHistoryState(prev => ({ ...prev, data: updateInList(prev.data) }))
      }
      
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }
  
  const refreshAll = useCallback(() => {
    loadTickets("pending", true)
    loadTickets("history", true)
  }, [loadTickets])

  // อัปเดตอัตโนมัติทุก 30 วินาที เฉพาะเมื่อแท็บเปิดอยู่
  useEffect(() => {
    if (!isAdmin) return
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      refreshAll()
    }, 30_000)
    return () => clearInterval(interval)
  }, [isAdmin, refreshAll])

  // Filter logic for search (client-side filtering of loaded data as requested in plan, or server side? Plan said Server pagination.)
  // We can't easily Mix Server Pagination + Client Search without refetching. 
  // For now, let's filter the LOADED data. If robust search is needed, we need a search index like Algolia or a specific search query.
  // Given constraints, I will rely on Firestore simple queries. Or filter loaded data.
  // The UI shows "Search Ticket...". If I use server pagination, I can't search entire collection client side.
  // I will just filter the *visible* tickets for now, as implementing full text search on Firestore is complex/costly without 3rd party.
  
  const getFilteredData = (data: SupportTicket[]) => {
      if (!searchQuery) return data
      const q = searchQuery.toLowerCase()
      return data.filter(t => 
        (t.subject || "").toLowerCase().includes(q) ||
        (t.userEmail || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      )
  }

  if (!isDataLoaded && !isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

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
              คำร้องขอความช่วยเหลือ
            </h1>
            <p className="text-muted-foreground">จัดการคำร้องและตอบกลับผู้ใช้</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
             <div className="p-2 bg-primary/10 rounded-lg">
                <Inbox className="h-5 w-5 text-primary" />
             </div>
             <div>
               {/* Approximate totals based on what we fetched / know */}
               <div className="text-2xl font-bold">{pendingState.totalCount + historyState.totalCount}</div>
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
               {/* Note: This count is only accurate if we fetch status specific counts, but our paginated result returns totalCount for that query! */}
               <div className="text-2xl font-bold text-foreground">
                   {/* Approximate or need specific count queries. For now using what we have loaded or known total from query */}
                   {pendingState.data.filter(t => t.status === 'new').length}
               </div>
               <p className="text-xs text-muted-foreground">ใหม่ (โหลดแล้ว)</p>
             </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
             <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
             </div>
             <div>
               <div className="text-2xl font-bold text-foreground">
                   {pendingState.data.filter(t => t.status === 'in_progress').length}
               </div>
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
                   {historyState.totalCount}
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
              รายการคำร้อง
            </CardTitle>
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาคำร้อง..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background w-full md:w-[300px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="pending" className="w-full">
            <div className="px-6 py-3 border-b bg-muted/30">
              <TabsList className="bg-muted/50 p-1">
                <TabsTrigger value="pending" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                   รอดำเนินการ 
                   <Badge variant="secondary" className="px-1.5 h-5 text-[10px] bg-muted-foreground/10 text-foreground">{pendingState.totalCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                   ประวัติ
                   <Badge variant="secondary" className="px-1.5 h-5 text-[10px] bg-muted-foreground/10 text-foreground">{historyState.totalCount}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="pending" className="m-0">
               <TicketsList 
                 data={getFilteredData(pendingState.data)} 
                 loading={pendingState.loading}
                 hasMore={pendingState.hasMore}
                 onLoadMore={() => loadTickets('pending')}
                 onView={async (ticket) => {
                    setSelectedTicket(ticket)
                    try {
                      const profile = await getUserProfile(ticket.userId)
                      setTicketUser(profile)
                    } catch (e) {
                      setTicketUser(null)
                    }
                 }} 
                 emptyMessage="ไม่มีคำร้องรอดำเนินการ"
               />
            </TabsContent>
            
            <TabsContent value="history" className="m-0">
               <TicketsList 
                 data={getFilteredData(historyState.data)} 
                 loading={historyState.loading}
                 hasMore={historyState.hasMore}
                 onLoadMore={() => loadTickets('history')}
                 onView={async (ticket) => {
                    setSelectedTicket(ticket)
                    try {
                      const profile = await getUserProfile(ticket.userId)
                      setTicketUser(profile)
                    } catch (e) {
                      setTicketUser(null)
                    }
                 }} 
                 emptyMessage="ไม่มีประวัติคำร้อง"
               />
            </TabsContent>
          </Tabs>
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
                                {msg.sender === 'admin' ? 'คำตอบจากทีมงาน' : (ticketUser?.displayName || selectedTicket?.userEmail?.split('@')[0] || 'ผู้ใช้งาน')}
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
                   คำร้องนี้ถูกปิดแล้ว ไม่สามารถตอบกลับได้
                </div>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  </div>
  )
}

function TicketsList({ 
  data, 
  loading,
  hasMore,
  onLoadMore,
  onView, 
  emptyMessage,
}: { 
  data: SupportTicket[], 
  loading: boolean,
  hasMore: boolean,
  onLoadMore: () => void,
  onView: (ticket: SupportTicket) => void, 
  emptyMessage: string,
}) {

  return (
     <div>
       <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="font-semibold">หัวข้อ</TableHead>
                <TableHead className="font-semibold">หมวดหมู่</TableHead>
                <TableHead className="font-semibold">สถานะ</TableHead>
                <TableHead className="font-semibold">วันที่</TableHead>
                <TableHead className="text-right font-semibold">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 px-4">
                    <div className="p-4 rounded-full bg-muted w-fit mx-auto mb-4">
                      <MessageSquare className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {emptyMessage}
                    </h3>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-muted/50 border-b last:border-0 bg-card">
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
                      <Button variant="ghost" size="sm" onClick={() => onView(ticket)}
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
       </div>
       
       {hasMore && (
           <div className="flex justify-center p-4">
               <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loading}>
                   {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "โหลดเพิ่มเติม"}
               </Button>
           </div>
       )}
     </div>
  )
}
