"use client"

import { memo, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { checkIsAdmin } from "@/lib/services/client-firestore"
import { deleteItem, updateItem, createAdminLog } from "@/lib/firestore"
import { useItems } from "@/hooks/use-items"
import type { Item, ItemStatus } from "@/types"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Package, Search, Trash2, Clock, CheckCircle2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { ItemCard } from "@/components/item-card"
import { ItemCardSkeletonGrid } from "@/components/item-card-skeleton"
import { ItemDetailView } from "@/components/item-detail-view"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useI18n } from "@/components/language-provider"
import debounce from "lodash/debounce"
import { cn } from "@/lib/utils"
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus"

const MemoizedItemCard = memo(ItemCard)

const statusLabels: Record<ItemStatus, { th: string; en: string }> = {
  available: { th: "พร้อมให้", en: "Available" },
  pending: { th: "รอดำเนินการ", en: "Pending" },
  completed: { th: "เสร็จสิ้น", en: "Completed" },
}

const PAGE_SIZE = 20
type StatusFilter = ItemStatus | "all"

export default function AdminItemsPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; itemId: string | null }>({ open: false, itemId: null })
  const [processing, setProcessing] = useState(false)

  // สถิติโพสแบบ real-time จาก API (โพสทั้งหมด, ใหม่ 24 ชม., พร้อมให้รับ, แลกเปลี่ยนแล้ว)
  const [itemStats, setItemStats] = useState<{
    total: number
    pending: number
    active: number
    completed: number
  } | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const { user, loading: authLoading } = useAuth()
  const { tt } = useI18n()
  const router = useRouter()
  const { toast } = useToast()

  const checkAdmin = useCallback(async () => {
    if (!user) return

    try {
      const isAdmin = await checkIsAdmin(user.email ?? undefined)
      if (!isAdmin) {
        toast({
          title: tt("ไม่มีสิทธิ์เข้าถึง", "Access denied"),
          description: tt("คุณไม่มีสิทธิ์ใช้งานหน้าผู้ดูแลระบบ", "You do not have permission to access admin pages."),
          variant: "destructive",
        })
        router.push("/dashboard")
        return
      }
      setIsAdmin(true)
    } catch (error) {
      console.error("[AdminItems] Error checking admin:", error)
      router.push("/dashboard")
    }
  }, [router, toast, user, tt])

  const fetchItemStats = useCallback(async () => {
    if (!user) return
    setStatsLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json?.success && json?.data?.items) {
        const items = json.data.items
        setItemStats({
          total: items.total ?? 0,
          pending: items.pending ?? 0,
          active: items.active ?? 0,
          completed: items.completed ?? 0,
        })
      }
    } catch (e) {
      console.error("[AdminItems] Error fetching stats:", e)
    } finally {
      setStatsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    checkAdmin()
  }, [authLoading, checkAdmin, router, user])

  useEffect(() => {
    const handler = debounce(() => setDebouncedSearchQuery(searchQuery), searchQuery ? 500 : 0)
    handler()
    return () => handler.cancel()
  }, [searchQuery])

  const {
    items,
    isLoading: loading,
    refetch: refetchItems,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
  } = useItems({
    searchQuery: debouncedSearchQuery,
    status: statusFilter,
    pageSize: PAGE_SIZE,
    includeFavoriteStatus: false,
    enabled: isAdmin,
  })

  const filterLabels: Record<StatusFilter, string> = {
    all: tt("ทุกสถานะ", "All statuses"),
    available: tt("พร้อมให้", "Available"),
    pending: tt("รอดำเนินการ", "Pending"),
    completed: tt("แลกเปลี่ยนแล้ว", "Completed"),
  }
  const activeFilterLabel = filterLabels[statusFilter]
  const getStatusLabel = (status: ItemStatus) => tt(statusLabels[status].th, statusLabels[status].en)
  const statusCards = [
    {
      key: "all" as const,
      title: tt("โพสทั้งหมด", "Total posts"),
      value: itemStats ? itemStats.total : (statsLoading ? "..." : "-"),
      description: tt("คลิกเพื่อดูทุกสถานะ", "Click to view all statuses"),
      icon: Package,
      iconBg: "bg-primary/10 dark:bg-primary/20",
      iconColor: "text-primary",
    },
    {
      key: "available" as const,
      title: tt("พร้อมให้รับ", "Ready for pickup"),
      value: itemStats ? itemStats.active : (statsLoading ? "..." : "-"),
      description: tt("คลิกเพื่อดูเฉพาะโพสพร้อมให้รับ", "Click to view ready posts only"),
      icon: CheckCircle2,
      iconBg: "bg-green-100 dark:bg-green-950/50",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      key: "pending" as const,
      title: tt("รอดำเนินการ", "Pending"),
      value: itemStats ? itemStats.pending : (statsLoading ? "..." : "-"),
      description: tt("คลิกเพื่อดูเฉพาะโพสรอดำเนินการ", "Click to view pending posts only"),
      icon: Clock,
      iconBg: "bg-amber-100 dark:bg-amber-950/50",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "completed" as const,
      title: tt("แลกเปลี่ยนแล้ว", "Completed"),
      value: itemStats ? itemStats.completed : (statsLoading ? "..." : "-"),
      description: tt("คลิกเพื่อดูเฉพาะโพสที่เสร็จสิ้น", "Click to view completed posts only"),
      icon: CheckCircle2,
      iconBg: "bg-muted",
      iconColor: "text-muted-foreground",
    },
  ] satisfies Array<{
    key: StatusFilter
    title: string
    value: number | string
    description: string
    icon: typeof Package
    iconBg: string
    iconColor: string
  }>

  // โหลดสถิติโพสแบบ real-time เมื่อเป็น admin
  useEffect(() => {
    if (!isAdmin || !user) return
    fetchItemStats()
  }, [isAdmin, user, fetchItemStats])

  useRefreshOnFocus(
    useCallback(() => {
      if (!isAdmin) return
      fetchItemStats()
      refetchItems()
    }, [isAdmin, fetchItemStats, refetchItems]),
    { enabled: isAdmin, minIntervalMs: 10_000 }
  )

  const handleDeleteItem = async () => {
    if (!deleteDialog.itemId || !user) return

    setProcessing(true)
    try {
      const itemToDelete = items.find(i => i.id === deleteDialog.itemId)
      
      await deleteItem(deleteDialog.itemId)
      
      // Log admin action
      await createAdminLog({
        actionType: 'item_delete', 
        adminId: user.uid,
        adminEmail: user.email || "",
        targetType: 'item',
        targetId: deleteDialog.itemId,
        targetInfo: itemToDelete?.title || "Unknown Item",
        description: `${tt("ลบโพส", "Delete item")}: ${itemToDelete?.title || deleteDialog.itemId}`,
        status: 'success',
        metadata: { category: itemToDelete?.category }
      } as any)

      toast({ title: tt("ลบโพสสำเร็จ", "Item deleted") })
      refetchItems()
      fetchItemStats() // อัปเดตสถิติ real-time
      
      setDeleteDialog({ open: false, itemId: null })
    } catch (error: any) {
      toast({ title: tt("เกิดข้อผิดพลาด", "Error"), description: error.message, variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  const handleUpdateStatus = async (itemId: string, newStatus: ItemStatus) => {
    if (!user) return
    setProcessing(true)
    try {
      const itemToUpdate = items.find(i => i.id === itemId)
      
      await updateItem(itemId, { status: newStatus })
      
      // Log admin action
      await createAdminLog({
        actionType: 'item_status_change',
        adminId: user.uid,
        adminEmail: user.email || "",
        targetType: 'item',
        targetId: itemId,
        targetInfo: itemToUpdate?.title || "Unknown Item",
        description: `${tt("เปลี่ยนสถานะเป็น", "Set status to")}: ${getStatusLabel(newStatus)}`,
        status: 'success',
        metadata: { 
          from: itemToUpdate?.status,
          to: newStatus 
        }
      } as any)

      toast({ title: `${tt("เปลี่ยนสถานะเป็น", "Status updated to")} ${getStatusLabel(newStatus)}` })
      refetchItems()
      if (selectedItem?.id === itemId) {
        setSelectedItem(prev => prev ? { ...prev, status: newStatus } : null)
      }
      fetchItemStats() // อัปเดตสถิติ real-time
      
    } catch (error: any) {
      toast({ title: tt("เกิดข้อผิดพลาด", "Error"), description: error.message, variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="max-w-7xl mx-auto px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              {tt("จัดการโพส", "Manage posts")}
            </h1>
            <p className="text-muted-foreground">{tt("ดูแลและจัดการโพสในระบบ", "Review and manage posts in the system")}</p>
          </div>
        </div>
      </div>

      {/* สถิติโพสแบบ real-time จากระบบ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statusCards.map((card) => {
          const Icon = card.icon
          const active = statusFilter === card.key
          return (
            <Card
              key={card.key}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => setStatusFilter(card.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  setStatusFilter(card.key)
                }
              }}
              className={cn(
                "group border shadow-sm cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40",
                active && "border-primary ring-2 ring-primary/20 bg-primary/5"
              )}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className={cn("p-2 rounded-lg shrink-0", card.iconBg)}>
                  <Icon className={cn("h-5 w-5", card.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-2xl font-bold text-foreground">{card.value}</div>
                    <ChevronRight className={cn("h-4 w-4 text-primary/80 mt-1 transition-transform", active ? "translate-x-0.5" : "group-hover:translate-x-0.5")} />
                  </div>
                  <p className="text-xs font-medium text-foreground/90">{card.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {active ? tt("กำลังแสดงโพสสถานะนี้", "Showing this status") : card.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Items Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          {tt("รายการโพส", "Posts")}
          <Badge variant="secondary" className="ml-2 px-3 py-1">
            {tt(`${totalCount} รายการ`, `${totalCount} records`)}
          </Badge>
          <Badge variant={statusFilter === "all" ? "outline" : "default"} className="px-3 py-1">
            {activeFilterLabel}
          </Badge>
        </h2>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tt("ค้นหาโพส...", "Search posts...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background w-full md:w-[300px]"
          />
        </div>
      </div>

      {/* Items Grid — รูปแบบเดียวกับ dashboard + ปุ่มจัดการ admin */}
      {loading && items.length === 0 ? (
        <ItemCardSkeletonGrid count={6} />
      ) : items.length === 0 ? (
        <Empty className="py-16 bg-muted/10 border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="rounded-2xl size-14 [&_svg:not([class*='size-'])]:size-7">
              <Package className="h-7 w-7 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>
              {searchQuery
                ? tt("ไม่พบโพสที่ค้นหา", "No posts found")
                : statusFilter === "all"
                  ? tt("ยังไม่มีโพสในระบบ", "No posts yet")
                  : `${tt("ไม่พบโพสสถานะ", "No posts with status")} ${activeFilterLabel}`}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? tt("ลองเปลี่ยนคำค้นหาใหม่", "Try a different keyword")
                : statusFilter === "all"
                  ? tt("โพสจากผู้ใช้จะแสดงในหน้านี้", "User posts will appear here")
                  : tt("ลองเปลี่ยนไปดูสถานะอื่น หรือกลับไปดูทุกสถานะ", "Try another status or switch back to all")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  {tt("ล้างคำค้นหา", "Clear search")}
                </Button>
              )}
              {statusFilter !== "all" && (
                <Button variant="outline" onClick={() => setStatusFilter("all")}>
                  {tt("ดูทุกสถานะ", "View all statuses")}
                </Button>
              )}
            </div>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 content-auto">
          {items.map((item, index) => (
            <MemoizedItemCard
              key={item.id}
              item={item}
              variant="admin"
              onViewDetails={(i) => setSelectedItem(i)}
              onDelete={() => setDeleteDialog({ open: true, itemId: item.id })}
              priority={index < 6}
            />
          ))}
        </div>
      )}
      
      {/* Pagination — ก่อนหน้า / ถัดไป แบบ dashboard */}
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
          <p className="text-sm text-muted-foreground order-2 sm:order-1">
            {tt(`หน้า ${currentPage} จาก ${totalPages}`, `Page ${currentPage} of ${totalPages}`)}
          </p>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                goToPage(Math.max(1, currentPage - 1))
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              disabled={currentPage === 1 || loading}
              className="gap-1 min-w-[100px]"
            >
              <ChevronLeft className="h-4 w-4" />
              {tt("ก่อนหน้า", "Previous")}
            </Button>
            <span className="text-sm font-medium px-2 sm:hidden">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                goToPage(Math.min(totalPages, currentPage + 1))
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              disabled={currentPage === totalPages || loading}
              className="gap-1 min-w-[100px]"
            >
              {tt("ถัดไป", "Next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Item Detail Dialog — ใช้ layout เดียวกับ dashboard + แถบจัดการ admin */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-4xl overflow-hidden border-none shadow-2xl p-0 max-h-[90vh] flex flex-col">
          <DialogTitle className="sr-only">{tt("รายละเอียดโพส", "Post details")}</DialogTitle>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            {selectedItem && (
              <ItemDetailView
                item={selectedItem}
                isModal
                variant="admin"
                onClose={() => setSelectedItem(null)}
                onAdminStatusChange={handleUpdateStatus}
                onAdminDelete={(i) => {
                  setSelectedItem(null)
                  setDeleteDialog({ open: true, itemId: i.id })
                }}
                onAdminItemUpdated={(updated) => {
                  setSelectedItem(updated)
                  refetchItems()
                }}
                adminProcessing={processing}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, itemId: null })}>
        <AlertDialogContent className="max-w-md p-6 sm:p-8">
          <AlertDialogHeader className="gap-4 text-left">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-1.5 pt-0.5">
                <AlertDialogTitle className="text-xl">{tt("ยืนยันการลบ", "Confirm deletion")}</AlertDialogTitle>
                <AlertDialogDescription className="text-base text-muted-foreground">
                  {tt("คุณต้องการลบโพสนี้หรือไม่?", "Do you want to delete this post?")}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="flex gap-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/20 px-4 py-3.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              {tt("การกระทำนี้ไม่สามารถยกเลิกได้ โพสจะถูกลบออกจากระบบอย่างถาวร", "This action cannot be undone. The post will be permanently deleted.")}
            </p>
          </div>
          <AlertDialogFooter className="mt-6 gap-3 sm:gap-3">
            <AlertDialogCancel className="order-2 sm:order-1">{tt("ยกเลิก", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              disabled={processing}
              className="order-1 sm:order-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive"
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tt("ลบโพส", "Delete post")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  )
}
