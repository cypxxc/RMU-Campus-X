"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { checkIsAdmin } from "@/lib/services/client-firestore"
import { useAuth } from "@/components/auth-provider"
import { useI18n } from "@/components/language-provider"
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
  Package,
  Trash2,
  Pencil,
  User,
  Clock,
  Mail,
} from "lucide-react"
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus"

import { STATUS_LABELS } from "@/lib/exchange-state-machine"

const STATUS_LABELS_EN: Record<string, string> = {
  pending: "Pending owner response",
  accepted: "In progress",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
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

function DetailRow({
  label,
  value,
  icon: Icon,
  valueClassName = "",
}: {
  label: string
  value: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  valueClassName?: string
}) {
  return (
    <div className="flex items-start gap-4 py-4 first:pt-0 last:pb-0 border-b border-border/50 last:border-0">
      <div className="flex shrink-0 items-center gap-2 min-w-[100px]">
        {Icon && (
          <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className={`min-w-0 flex-1 text-foreground text-sm ${valueClassName}`}>
        {typeof value === "string" ? (
          <span className="break-words leading-relaxed">{value}</span>
        ) : (
          value
        )}
      </div>
    </div>
  )
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
  const { locale, tt } = useI18n()
  const router = useRouter()
  const { toast } = useToast()

  const checkAdmin = useCallback(async () => {
    if (!user) return
    try {
      const isAdmin = await checkIsAdmin(user.email ?? undefined)
      if (!isAdmin) {
        toast({ title: tt("ไม่มีสิทธิ์เข้าถึง", "Access denied"), variant: "destructive" })
        router.push("/dashboard")
        return
      }
      setIsAdmin(true)
    } catch {
      router.push("/dashboard")
    }
  }, [router, toast, user, tt])

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
        if (!res.ok) throw new Error(json?.error?.message || tt("โหลดไม่สำเร็จ", "Load failed"))
        const data = json?.data
        const list = (data?.exchanges ?? []).map((e: ExchangeRow) => ({
          ...e,
          createdAt: e.createdAt ? new Date(e.createdAt).toLocaleString(locale === "th" ? "th-TH" : "en-US") : tt("—", "-"),
          updatedAt: e.updatedAt ? new Date(e.updatedAt).toLocaleString(locale === "th" ? "th-TH" : "en-US") : tt("—", "-"),
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
          title: tt("โหลดไม่สำเร็จ", "Load failed"),
          description: e instanceof Error ? e.message : undefined,
          variant: "destructive",
        })
        if (!append) setExchanges([])
      } finally {
        setLoading(false)
      }
    },
    [user, statusFilter, lastId, toast, tt, locale]
  )

  useEffect(() => {
    if (!isAdmin || !user) return
    loadExchanges(false)
  }, [isAdmin, user, statusFilter, loadExchanges])

  useRefreshOnFocus(
    useCallback(() => {
      if (!isAdmin) return
      loadExchanges(false)
    }, [isAdmin, loadExchanges]),
    { enabled: isAdmin, minIntervalMs: 10_000 }
  )

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
      if (!res.ok) throw new Error(json?.error?.message || tt("ลบไม่สำเร็จ", "Delete failed"))
      setExchanges((prev) => prev.filter((e) => e.id !== id))
      setDeleteDialog({ open: false, id: null })
      if (selectedExchange?.id === id) setSelectedExchange(null)
      toast({ title: tt("ลบการแลกเปลี่ยนแล้ว", "Exchange deleted") })
    } catch (e) {
      toast({
        title: tt("ลบไม่สำเร็จ", "Delete failed"),
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
    return (
      <Badge className={c}>
        {locale === "th"
          ? STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status
          : STATUS_LABELS_EN[status] ?? status}
      </Badge>
    )
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
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Package className="h-8 w-8 text-primary" />
                {tt("จัดการการแลกเปลี่ยน", "Manage exchanges")}
              </h1>
              <p className="text-muted-foreground">{tt("ดูและลบรายการการแลกเปลี่ยนบนเว็บ ไม่ต้องเข้า Firestore", "View and delete exchange records directly from the web admin.")}</p>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden border shadow-sm">
          <CardHeader className="border-b px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {tt("รายการการแลกเปลี่ยน", "Exchange list")}
                <Badge variant="secondary" className="ml-2 px-3 py-1">
                  {tt(`${exchanges.length} รายการ`, `${exchanges.length} records`)}
                </Badge>
              </CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={tt("สถานะ", "Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tt("ทั้งหมด", "All")}</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {locale === "th" ? label : STATUS_LABELS_EN[value] ?? value}
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
                {tt("ไม่มีรายการการแลกเปลี่ยน", "No exchanges found")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tt("สิ่งของ", "Item")}</TableHead>
                    <TableHead>{tt("เจ้าของ", "Owner")}</TableHead>
                    <TableHead>{tt("ผู้ขอ", "Requester")}</TableHead>
                    <TableHead>{tt("สถานะ", "Status")}</TableHead>
                    <TableHead>{tt("สร้างเมื่อ", "Created at")}</TableHead>
                    <TableHead className="w-[80px]">{tt("จัดการ", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exchanges.map((ex) => (
                    <TableRow key={ex.id}>
                      <TableCell className="font-medium max-w-[180px] truncate">
                        {ex.itemTitle ?? tt("—", "-")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[140px] truncate">
                        {ex.ownerEmail ?? tt("—", "-")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[140px] truncate">
                        {ex.requesterEmail ?? tt("—", "-")}
                      </TableCell>
                      <TableCell>{getStatusBadge(ex.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{ex.createdAt}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setSelectedExchange(ex)}
                          title={tt("ดู/แก้ไขรายละเอียด", "View details")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
                  {tt("โหลดเพิ่ม", "Load more")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedExchange} onOpenChange={(open) => !open && setSelectedExchange(null)}>
        <DialogContent className="max-w-lg sm:max-w-xl p-6 sm:p-8">
          <DialogHeader className="pb-4 px-0">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <span className="rounded-lg bg-primary/10 p-2">
                <Package className="h-5 w-5 text-primary" />
              </span>
              {tt("รายละเอียดการแลกเปลี่ยน", "Exchange details")}
            </DialogTitle>
          </DialogHeader>
          {selectedExchange && (
            <div className="rounded-xl border border-border/60 bg-gradient-to-b from-muted/30 to-muted/10 px-6 py-5 max-h-[70vh] overflow-y-auto">
              <DetailRow
                label={tt("สิ่งของ", "Item")}
                value={selectedExchange.itemTitle ?? tt("—", "-")}
                icon={Package}
                valueClassName="font-medium text-base"
              />
              <DetailRow
                label={tt("เจ้าของ", "Owner")}
                value={selectedExchange.ownerEmail ?? tt("—", "-")}
                icon={User}
              />
              <DetailRow
                label={tt("ผู้ขอ", "Requester")}
                value={selectedExchange.requesterEmail ?? tt("—", "-")}
                icon={Mail}
              />
              <DetailRow
                label={tt("สถานะ", "Status")}
                value={getStatusBadge(selectedExchange.status)}
              />
              <DetailRow
                label={tt("สร้างเมื่อ", "Created at")}
                value={selectedExchange.createdAt ?? tt("—", "-")}
                icon={Clock}
                valueClassName="text-muted-foreground"
              />
              <DetailRow
                label={tt("อัปเดตเมื่อ", "Updated at")}
                value={selectedExchange.updatedAt ?? tt("—", "-")}
                icon={Clock}
                valueClassName="text-muted-foreground"
              />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-3 pt-6 px-0">
            <Button variant="outline" onClick={() => setSelectedExchange(null)}>
              {tt("ปิด", "Close")}
            </Button>
            {selectedExchange && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setDeleteDialog({ open: true, id: selectedExchange.id })
                  setSelectedExchange(null)
                }}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {tt("ลบ", "Delete")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tt("ยืนยันการลบ", "Confirm deletion")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tt("การลบจะรวมแชทที่เกี่ยวข้องด้วย ไม่สามารถกู้คืนได้", "Deletion includes related chat data and cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tt("ยกเลิก", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {tt("ลบ", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
