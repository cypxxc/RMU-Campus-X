"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useAdminGuard } from "@/hooks/use-admin-guard"
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
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  Package,
  Eye,
  User,
  Clock,
  Mail,
} from "lucide-react"
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus"

import { STATUS_LABELS } from "@/lib/exchange-state-machine"

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
  const { isAdmin } = useAdminGuard()
  const [exchanges, setExchanges] = useState<ExchangeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExchange, setSelectedExchange] = useState<ExchangeRow | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [lastId, setLastId] = useState<string | null>(null)

  const { user } = useAuth()
  const { locale, tt } = useI18n()
  const { toast } = useToast()

  const loadExchanges = useCallback(
    async (append = false, nextLastId: string | null = null) => {
      if (!user) return
      if (!append) setLoading(true)
      try {
        const token = await user.getIdToken()
        const params = new URLSearchParams()
        params.set("limit", "50")
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
    [user, lastId, toast, tt, locale]
  )

  useEffect(() => {
    if (!isAdmin || !user) return
    loadExchanges(false)
  }, [isAdmin, user, loadExchanges])

  useRefreshOnFocus(
    useCallback(() => {
      if (!isAdmin) return
      loadExchanges(false)
    }, [isAdmin, loadExchanges]),
    { enabled: isAdmin, minIntervalMs: 10_000 }
  )

  const getStatusBadge = (status: string) => {
    const c =
      status === "completed"
        ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400"
        : status === "cancelled" || status === "rejected"
          ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
    return (
      <Badge className={c}>
        {STATUS_LABELS[status as keyof typeof STATUS_LABELS]?.[locale === "th" ? "th" : "en"] ?? status}
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
                {tt("ประวัติการแลกเปลี่ยนทั้งหมด", "All exchange history")}
              </h1>
              <p className="text-muted-foreground">{tt("ดูประวัติการแลกเปลี่ยนทั้งหมดในระบบเพื่อใช้ตรวจสอบกรณีมีปัญหาระหว่างผู้ใช้", "Review complete exchange history across the system for dispute investigation.")}</p>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden border shadow-sm">
          <CardHeader className="border-b px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {tt("ประวัติการแลกเปลี่ยน", "Exchange history")}
                <Badge variant="secondary" className="ml-2 px-3 py-1">
                  {tt(`${exchanges.length} รายการ`, `${exchanges.length} records`)}
                </Badge>
              </CardTitle>
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
                    <TableHead className="w-[100px]">{tt("รายละเอียด", "Details")}</TableHead>
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
                          title={tt("ดูรายละเอียด", "View details")}
                        >
                          <Eye className="h-4 w-4" />
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
              {tt("รายละเอียดประวัติการแลกเปลี่ยน", "Exchange history details")}
            </DialogTitle>
          </DialogHeader>
          {selectedExchange && (
            <div className="rounded-xl border border-border/60 bg-gradient-to-b from-muted/30 to-muted/10 px-6 py-5 max-h-[70vh] overflow-y-auto">
              <DetailRow
                label={tt("รหัส", "ID")}
                value={selectedExchange.id}
                valueClassName="font-mono text-xs text-muted-foreground"
              />
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
