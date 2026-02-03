"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  ArrowLeft,
  Package,
  Trash2,
  Eye,
} from "lucide-react"

const STATUS_LABELS: Record<string, string> = {
  pending: "รอตอบรับ",
  accepted: "ตอบรับแล้ว",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  rejected: "ปฏิเสธ",
}

interface ExchangeRow {
  id: string
  itemTitle?: string
  ownerEmail?: string
  requesterEmail?: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export default function AdminExchangesPage() {
  const [exchanges, setExchanges] = useState<ExchangeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedExchange, setSelectedExchange] = useState<ExchangeRow | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [processing, setProcessing] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [lastId, setLastId] = useState<string | null>(null)

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const checkAdmin = useCallback(async () => {
    if (!user) return
    try {
      const db = getFirebaseDb()
      const snapshot = await getDocs(
        query(collection(db, "admins"), where("email", "==", user.email))
      )
      if (snapshot.empty) {
        toast({ title: "ไม่มีสิทธิ์เข้าถึง", variant: "destructive" })
        router.push("/dashboard")
        return
      }
      setIsAdmin(true)
    } catch {
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

  const loadExchanges = useCallback(
    async (append = false, nextLastId: string | null = null) => {
      if (!user) return
      if (!append) setLoading(true)
      try {
        const token = await user.getIdToken()
        const params = new URLSearchParams()
        params.set("limit", "50")
        if (statusFilter && statusFilter !== "all") params.set("status", statusFilter)
        const cursor = append ? (nextLastId ?? lastId) : null
        if (cursor) params.set("lastId", cursor)
        const res = await fetch(`/api/admin/exchanges?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error?.message || "โหลดไม่สำเร็จ")
        const data = json?.data
        const list = (data?.exchanges ?? []).map((e: ExchangeRow) => ({
          ...e,
          createdAt: e.createdAt ? new Date(e.createdAt).toLocaleString("th-TH") : "—",
          updatedAt: e.updatedAt ? new Date(e.updatedAt).toLocaleString("th-TH") : "—",
        }))
        if (append) {
          setExchanges((prev) => [...prev, ...list])
        } else {
          setExchanges(list)
        }
        setHasMore(data?.hasMore ?? false)
        setLastId(data?.lastId ?? null)
      } catch (e) {
        toast({
          title: "โหลดไม่สำเร็จ",
          description: e instanceof Error ? e.message : undefined,
          variant: "destructive",
        })
        if (!append) setExchanges([])
      } finally {
        setLoading(false)
      }
    },
    [user, statusFilter, lastId, toast]
  )

  useEffect(() => {
    if (!isAdmin || !user) return
    loadExchanges(false)
  }, [isAdmin, user, statusFilter, loadExchanges])

  useEffect(() => {
    if (!isAdmin) return
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadExchanges(false)
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [isAdmin, loadExchanges])

  const handleDelete = async () => {
    const id = deleteDialog.id
    if (!id || !user || processing) return
    setProcessing(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/admin/exchanges/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error?.message || "ลบไม่สำเร็จ")
      setExchanges((prev) => prev.filter((e) => e.id !== id))
      setDeleteDialog({ open: false, id: null })
      if (selectedExchange?.id === id) setSelectedExchange(null)
      toast({ title: "ลบการแลกเปลี่ยนแล้ว" })
    } catch (e) {
      toast({
        title: "ลบไม่สำเร็จ",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const c =
      status === "completed"
        ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400"
        : status === "cancelled" || status === "rejected"
          ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
    return <Badge className={c}>{STATUS_LABELS[status] ?? status}</Badge>
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-7xl mx-auto px-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => router.push("/admin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Package className="h-8 w-8 text-primary" />
                จัดการการแลกเปลี่ยน
              </h1>
              <p className="text-muted-foreground">ดูและลบรายการการแลกเปลี่ยนบนเว็บ ไม่ต้องเข้า Firestore</p>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden border shadow-sm">
          <CardHeader className="border-b px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                รายการการแลกเปลี่ยน
                <Badge variant="secondary" className="ml-2 px-3 py-1">
                  {exchanges.length} รายการ
                </Badge>
              </CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading && exchanges.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : exchanges.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                ไม่มีรายการการแลกเปลี่ยน
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สิ่งของ</TableHead>
                    <TableHead>เจ้าของ</TableHead>
                    <TableHead>ผู้ขอ</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>สร้างเมื่อ</TableHead>
                    <TableHead className="w-[120px]">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exchanges.map((ex) => (
                    <TableRow key={ex.id}>
                      <TableCell className="font-medium max-w-[180px] truncate">
                        {ex.itemTitle ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[140px] truncate">
                        {ex.ownerEmail ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[140px] truncate">
                        {ex.requesterEmail ?? "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(ex.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{ex.createdAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setSelectedExchange(ex)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteDialog({ open: true, id: ex.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {hasMore && (
              <div className="p-4 border-t flex justify-center">
                <Button variant="outline" onClick={() => loadExchanges(true, lastId)} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  โหลดเพิ่ม
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedExchange} onOpenChange={(open) => !open && setSelectedExchange(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>รายละเอียดการแลกเปลี่ยน</DialogTitle>
          </DialogHeader>
          {selectedExchange && (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">สิ่งของ:</span> {selectedExchange.itemTitle ?? "—"}</p>
              <p><span className="text-muted-foreground">เจ้าของ:</span> {selectedExchange.ownerEmail ?? "—"}</p>
              <p><span className="text-muted-foreground">ผู้ขอ:</span> {selectedExchange.requesterEmail ?? "—"}</p>
              <p><span className="text-muted-foreground">สถานะ:</span> {getStatusBadge(selectedExchange.status)}</p>
              <p><span className="text-muted-foreground">สร้างเมื่อ:</span> {selectedExchange.createdAt}</p>
              <p><span className="text-muted-foreground">อัปเดตเมื่อ:</span> {selectedExchange.updatedAt}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedExchange(null)}>ปิด</Button>
            {selectedExchange && (
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteDialog({ open: true, id: selectedExchange.id })
                  setSelectedExchange(null)
                }}
              >
                ลบรายการนี้
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              การลบจะรวมแชทที่เกี่ยวข้องด้วย ไม่สามารถกู้คืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
