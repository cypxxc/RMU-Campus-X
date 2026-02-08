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
import { Loader2, MessageSquare, Send, Pencil, CheckCircle2, Clock, Inbox, Search, Check, UserCircle } from "lucide-react"
import Image from "next/image"
import { resolveImageUrl } from "@/lib/cloudinary-url"

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
      setTicketReply("")

      const db = getFirebaseDb()
      const { doc, getDoc } = await import("firebase/firestore")
      const ticketDoc = await getDoc(doc(db, "support_tickets", selectedTicket.id))
      if (ticketDoc.exists()) {
        const newData = { id: ticketDoc.id, ...ticketDoc.data() } as SupportTicket
        setSelectedTicket(newData)
      }
      refreshAll()
      toast({ title: "ตอบกลับสำเร็จ" })
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
                    } catch {
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
                    } catch {
                      setTicketUser(null)
                    }
                 }} 
                 emptyMessage="ไม่มีประวัติคำร้อง"
               />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog – รูปแบบเดียวกับแชทฝั่งผู้ใช้ */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="w-[95vw] max-w-3xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-5 py-4 border-b shrink-0 space-y-0">
            <DialogTitle className="text-xl font-semibold truncate pr-8">
              {selectedTicket?.subject}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {selectedTicket && (
                <div className="shrink-0">{getStatusBadge(selectedTicket.status)}</div>
              )}
              <span className="text-xs text-muted-foreground truncate max-w-[180px] ml-auto sm:ml-0" title={selectedTicket?.userEmail}>
                {selectedTicket?.userEmail}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={selectedTicket?.id}>
                {selectedTicket?.id}
              </span>
            </div>
          </DialogHeader>

          {selectedTicket && (() => {
            const initialMsg = {
              sender: "user",
              content: selectedTicket.description,
              createdAt: selectedTicket.createdAt,
            }
            const history = (selectedTicket.messages || []).concat(
              !selectedTicket.messages?.length && selectedTicket.adminReply
                ? [{
                    sender: "admin",
                    content: selectedTicket.adminReply,
                    senderEmail: selectedTicket.repliedByEmail || "",
                    createdAt: selectedTicket.repliedAt || new Date(),
                  } as any]
                : []
            )
            const allMessages = [initialMsg, ...history]
            const formatTime = (d: any) =>
              (d?.toDate?.() || (d instanceof Date ? d : new Date())).toLocaleString("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })

            return (
              <>
                <div className="flex-1 overflow-y-auto min-h-0 bg-background">
                  <div className="p-4 sm:p-5 space-y-6">
                    {allMessages.map((msg: any, idx: number) => {
                      const isMe = msg.sender === "admin"
                      const timeStr = formatTime(msg.createdAt)
                      return (
                        <div
                          key={idx}
                          className={`flex w-full gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                        >
                          {!isMe && (
                            <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground border overflow-hidden relative">
                              {ticketUser?.photoURL ? (
                                <Image
                                  src={resolveImageUrl(ticketUser.photoURL)}
                                  alt={`รูปโปรไฟล์ของ ${ticketUser?.displayName || ticketUser?.email || "ผู้ส่งคำร้อง"}`}
                                  fill
                                  className="object-cover"
                                  sizes="36px"
                                />
                              ) : (
                                <UserCircle className="h-4 w-4" />
                              )}
                            </div>
                          )}
                          <div className={`flex flex-col min-w-0 max-w-[85%] ${isMe ? "items-end" : "items-start"}`}>
                            <div
                              className={`w-fit max-w-full rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted/80 text-foreground border rounded-bl-md"
                              }`}
                            >
                              {msg.content}
                              {isMe && msg.senderEmail && (
                                <div className="mt-2 pt-2 border-t border-primary/20 text-[11px] opacity-90">
                                  ตอบโดย {msg.senderEmail}
                                </div>
                              )}
                            </div>
                            <div className={`flex items-center gap-1.5 mt-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                              <span className="text-[11px] text-muted-foreground">{timeStr}</span>
                              {!isMe && <span className="text-[11px] text-muted-foreground">- ผู้ใช้งาน</span>}
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
                    })}
                  </div>
                </div>

                <div className="shrink-0 border-t bg-muted/30 rounded-b-xl">
                  {selectedTicket.status !== "closed" ? (
                    <div className="p-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleSendReply()
                        }}
                        className="flex gap-2 items-center flex-1 min-w-0"
                      >
                        <Input
                          value={ticketReply}
                          onChange={(e) => setTicketReply(e.target.value)}
                          placeholder="ตอบกลับ..."
                          disabled={processing}
                          className="flex-1 rounded-full border-2 bg-background focus-visible:ring-2"
                        />
                        <Button
                          type="submit"
                          size="icon"
                          disabled={processing || !ticketReply.trim()}
                          className="shrink-0 rounded-full h-10 w-10 bg-primary hover:bg-primary/90"
                        >
                          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </form>
                      {selectedTicket.status !== "resolved" && (
                        <Button
                          variant="outline"
                          size="default"
                          onClick={async () => {
                            if (!user) return
                            setProcessing(true)
                            try {
                              await updateTicketStatus(selectedTicket.id, "resolved", user.uid, user.email || "")
                              setSelectedTicket(null)
                              refreshAll()
                              toast({ title: "ปิดคำร้องแล้ว" })
                            } catch {
                              toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" })
                            } finally {
                              setProcessing(false)
                            }
                          }}
                          disabled={processing}
                          className="shrink-0 border-green-200 hover:bg-green-50 text-green-700 dark:border-green-900 dark:hover:bg-green-950/50 dark:text-green-400"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                          แก้ไขแล้ว
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">คำร้องนี้ปิดแล้ว ไม่สามารถตอบกลับได้</p>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
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
                <TableHead className="font-semibold">สถานะ</TableHead>
                <TableHead className="font-semibold">วันที่</TableHead>
                <TableHead className="text-right font-semibold">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16 px-4">
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
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {((ticket.createdAt as any)?.toDate?.() || new Date()).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                        onClick={() => onView(ticket)}
                        title="ดูรายละเอียด"
                      >
                        <Pencil className="h-4 w-4" />
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
