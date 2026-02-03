"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { deleteItem, updateItem, createAdminLog, getItems } from "@/lib/firestore"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Package, Search, Trash2, Clock, CheckCircle2, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { ItemCard } from "@/components/item-card"
import { ItemCardSkeletonGrid } from "@/components/item-card-skeleton"
import { ItemDetailView } from "@/components/item-detail-view"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { BounceWrapper } from "@/components/ui/bounce-wrapper"
import { memo, useRef } from "react"

const MemoizedItemCard = memo(ItemCard)

const statusLabels: Record<string, string> = {
  available: "พร้อมให้",
  pending: "รอดำเนินการ",
  completed: "เสร็จสิ้น",
}

export default function AdminItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; itemId: string | null }>({ open: false, itemId: null })
  const [processing, setProcessing] = useState(false)
  
  // Pagination แบบหน้า (เหมือน dashboard)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20
  const paginationLastIds = useRef<Map<number, string | null>>(new Map([[1, null]]))

  // สถิติโพสแบบ real-time จาก API (โพสทั้งหมด, ใหม่ 24 ชม., พร้อมให้รับ, แลกเปลี่ยนแล้ว)
  const [itemStats, setItemStats] = useState<{
    total: number
    newLast24h: number
    active: number
    completed: number
  } | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

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
      console.error("[AdminItems] Error checking admin:", error)
      router.push("/dashboard")
    }
  }, [router, toast, user])

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
          newLast24h: items.newLast24h ?? 0,
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

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")

  const loadItems = useCallback(async (page: number, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    try {
      if (!silent) setLoading(true)

      const lastId = page === 1 ? undefined : (paginationLastIds.current.get(page) ?? undefined)

      const result = await getItems({
        pageSize,
        lastId,
        searchQuery: debouncedSearchQuery.trim() || undefined,
      })

      if (!result.success && result.error) {
        throw new Error(result.error)
      }

      if (result.data) {
        const data = result.data
        setItems(data.items)
        setTotalCount(data.totalCount ?? 0)
        const count = data.totalCount ?? 0
        setTotalPages(count > 0 ? Math.ceil(count / pageSize) : (data.hasMore ? page + 1 : page))
        if (data.lastId != null && data.hasMore) {
          paginationLastIds.current.set(page + 1, data.lastId)
        }
      }
    } catch (error) {
      console.error("[AdminItems] Error loading items:", error)
      if (!silent) toast({ title: "โหลดข้อมูลล้มเหลว", variant: "destructive" })
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [pageSize, debouncedSearchQuery, toast])

  // Debounce search แล้ว reset หน้า 1
  useEffect(() => {
    const delay = searchQuery ? 500 : 0
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setCurrentPage(1)
      paginationLastIds.current = new Map([[1, null]])
    }, delay)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // โหลดเมื่อเปลี่ยนหน้าหรือคำค้น (หลัง debounce)
  useEffect(() => {
    if (!isAdmin) return
    loadItems(currentPage)
  }, [isAdmin, currentPage, debouncedSearchQuery, loadItems])

  // โหลดสถิติโพสแบบ real-time เมื่อเป็น admin
  useEffect(() => {
    if (!isAdmin || !user) return
    fetchItemStats()
  }, [isAdmin, user, fetchItemStats])

  // อัปเดตอัตโนมัติทุก 30 วินาที (สถิติ + รายการโพส) เฉพาะเมื่อแท็บเปิดอยู่
  useEffect(() => {
    if (!isAdmin) return
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      fetchItemStats()
      loadItems(currentPage, { silent: true })
    }, 30_000)
    return () => clearInterval(interval)
  }, [isAdmin, currentPage, fetchItemStats, loadItems])

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
        description: `ลบโพส: ${itemToDelete?.title || deleteDialog.itemId}`,
        status: 'success',
        metadata: { category: itemToDelete?.category }
      } as any)

      toast({ title: "ลบโพสสำเร็จ" })
      
      // Remove from list locally
      setItems(prev => prev.filter(i => i.id !== deleteDialog.itemId))
      fetchItemStats() // อัปเดตสถิติ real-time
      
      setDeleteDialog({ open: false, itemId: null })
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
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
        description: `เปลี่ยนสถานะเป็น: ${statusLabels[newStatus]}`,
        status: 'success',
        metadata: { 
          from: itemToUpdate?.status,
          to: newStatus 
        }
      } as any)

      toast({ title: `เปลี่ยนสถานะเป็น ${statusLabels[newStatus]}` })
       // Update locally
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i))
      
      if (selectedItem?.id === itemId) {
        setSelectedItem(prev => prev ? { ...prev, status: newStatus } : null)
      }
      fetchItemStats() // อัปเดตสถิติ real-time
      
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
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
           <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => router.push("/admin")}>
              <ArrowLeft className="h-4 w-4" />
           </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              จัดการโพส
            </h1>
            <p className="text-muted-foreground">ดูแลและจัดการโพสในระบบ</p>
          </div>
        </div>
      </div>

      {/* สถิติโพสแบบ real-time จากระบบ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg dark:bg-primary/20">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {itemStats ? itemStats.total : (statsLoading ? "…" : "—")}
              </div>
              <p className="text-xs text-muted-foreground">โพสทั้งหมดในระบบ</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {itemStats ? itemStats.newLast24h : (statsLoading ? "…" : "—")}
              </div>
              <p className="text-xs text-muted-foreground">โพสใหม่ (24 ชม.ล่าสุด)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-green-100 dark:bg-green-950/50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {itemStats ? itemStats.active : (statsLoading ? "…" : "—")}
              </div>
              <p className="text-xs text-muted-foreground">พร้อมให้รับ</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-muted rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {itemStats ? itemStats.completed : (statsLoading ? "…" : "—")}
              </div>
              <p className="text-xs text-muted-foreground">แลกเปลี่ยนแล้ว</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          รายการโพส
          <Badge variant="secondary" className="ml-2 px-3 py-1">
            {totalCount} รายการ
          </Badge>
        </h2>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาโพส..."
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
              {searchQuery ? "ไม่พบโพสที่ค้นหา" : "ยังไม่มีโพสในระบบ"}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery ? "ลองเปลี่ยนคำค้นหาใหม่" : "โพสจากผู้ใช้จะแสดงในหน้านี้"}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                ล้างคำค้นหา
              </Button>
            )}
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 content-auto">
          {items.map((item, index) => (
            <BounceWrapper key={item.id} variant="bounce-up" delay={Math.min(index, 4) * 0.03}>
              <MemoizedItemCard
                item={item}
                variant="admin"
                onViewDetails={(i) => setSelectedItem(i)}
                onDelete={() => setDeleteDialog({ open: true, itemId: item.id })}
                priority={index < 4}
              />
            </BounceWrapper>
          ))}
        </div>
      )}
      
      {/* Pagination — ก่อนหน้า / ถัดไป แบบ dashboard */}
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
          <p className="text-sm text-muted-foreground order-2 sm:order-1">
            หน้า {currentPage} จาก {totalPages}
          </p>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1))
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              disabled={currentPage === 1 || loading}
              className="gap-1 min-w-[100px]"
            >
              <ChevronLeft className="h-4 w-4" />
              ก่อนหน้า
            </Button>
            <span className="text-sm font-medium px-2 sm:hidden">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1))
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              disabled={currentPage === totalPages || loading}
              className="gap-1 min-w-[100px]"
            >
              ถัดไป
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Item Detail Dialog — ใช้ layout เดียวกับ dashboard + แถบจัดการ admin */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-4xl overflow-hidden border-none shadow-2xl p-0 max-h-[90vh] flex flex-col">
          <DialogTitle className="sr-only">รายละเอียดโพส</DialogTitle>
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
                  setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)))
                }}
                adminProcessing={processing}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, itemId: null })}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  คุณต้องการลบโพสนี้หรือไม่?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
            ⚠️ การกระทำนี้ไม่สามารถยกเลิกได้ โพสจะถูกลบออกจากระบบอย่างถาวร
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteItem} 
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              ลบโพส
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  )
}
