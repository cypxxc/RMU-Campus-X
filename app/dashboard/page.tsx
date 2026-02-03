"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { getItems } from "@/lib/firestore"
import type { Item, ItemCategory, ItemStatus } from "@/types"
import { ItemCard } from "@/components/item-card"
import { FilterSidebar } from "@/components/filter-sidebar"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Package, Sparkles, X, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { ItemDetailView } from "@/components/item-detail-view"
import { AccountStatusBanner } from "@/components/account-status-banner"
import { BounceWrapper } from "@/components/ui/bounce-wrapper"
import { ItemCardSkeletonGrid } from "@/components/item-card-skeleton"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import debounce from 'lodash/debounce'
import { toast } from 'sonner'
import { memo } from "react"

// Memoized Item Card เพื่อป้องกัน re-render
const MemoizedItemCard = memo(ItemCard)

const PAGE_SIZE = 12

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [status, setStatus] = useState<ItemStatus | "all">("available")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const { user } = useAuth()
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  // Pagination states (lastId สำหรับ API)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const paginationLastIds = useRef<Map<number, string | null>>(new Map([[1, null]]))
  const [totalPages, setTotalPages] = useState(1)

  // Debounce search query
  useEffect(() => {
    if (searchQuery !== debouncedSearchQuery) {
      setIsSearching(true)
    }
    
    const handler = debounce(() => {
      setDebouncedSearchQuery(searchQuery)
      setIsSearching(false)
      setCurrentPage(1) // Reset to first page on search
    }, 500)

    handler()

    return () => {
      handler.cancel()
    }
  }, [searchQuery])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
    paginationLastIds.current = new Map([[1, null]])
  }, [categories, status])

  // Load items logic (ใช้ API – lastId สำหรับ pagination)
  const loadItems = useCallback(async (page: number, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    try {
      if (!silent) setLoading(true)

      const lastId = page === 1 ? null : paginationLastIds.current.get(page) ?? undefined

      const filters = {
        pageSize: PAGE_SIZE,
        lastId: lastId ?? undefined,
        categories: categories.length > 0 ? categories : undefined,
        status: status !== "all" ? status : undefined,
        searchQuery: debouncedSearchQuery.trim() || undefined,
      }

      const result = await getItems(filters)

      if (result.success && result.data) {
        setItems(result.data.items)

        const count = result.data.totalCount || 0
        setTotalCount(count)
        setTotalPages(count > 0 ? Math.ceil(count / PAGE_SIZE) : (result.data.hasMore ? page + 1 : page))

        if (result.data.lastId != null && result.data.hasMore) {
          paginationLastIds.current.set(page + 1, result.data.lastId)
        }
      } else {
        if (!silent) {
          console.error("[Dashboard] Error:", result.error)
          toast.error("ไม่สามารถโหลดข้อมูลได้")
        }
        setItems([])
        setTotalCount(0)
      }
    } catch (error) {
      if (!silent) {
        console.error("[Dashboard] Error:", error)
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล")
      }
      setItems([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [categories, status, debouncedSearchQuery])

  // Load items when page or dependencies change
  useEffect(() => {
    loadItems(currentPage)
  }, [loadItems, currentPage])

  // อัปเดตอัตโนมัติเมื่อเปิดแท็บอยู่ (ไม่ต้องกดรีเฟรช)
  const POLL_INTERVAL_MS = 25_000 // 25 วินาที
  useEffect(() => {
    if (typeof document === "undefined") return
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return
      loadItems(currentPage, { silent: true })
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadItems(currentPage, { silent: true })
      }
    }, POLL_INTERVAL_MS)
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      clearInterval(interval)
    }
  }, [loadItems, currentPage])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b bg-linear-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <BounceWrapper variant="bounce-in" className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">แพลตฟอร์มแลกเปลี่ยน</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              RMU-Campus X
            </h1>
            <p className="text-muted-foreground max-w-lg">
              แพลตฟอร์มแลกเปลี่ยนและขอรับสิ่งของสำหรับนักศึกษา
              <span className="hidden sm:inline"> มหาวิทยาลัยราชภัฏมหาสารคาม</span>
            </p>
          </BounceWrapper>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Account Status Banner */}
        {user && <AccountStatusBanner />}
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Desktop */}
          <aside className="lg:w-64 shrink-0">
            <FilterSidebar
              categories={categories}
              status={status}
              onCategoriesChange={setCategories}
              onStatusChange={setStatus}
            />
          </aside>

          {/* Items Grid */}
          <main className="flex-1 min-w-0">
            {/* Results Header & Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-sm font-medium text-muted-foreground order-2 sm:order-1 flex items-center gap-2" role="status" aria-live="polite">
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    กำลังโหลด...
                  </>
                ) : isSearching ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    กำลังค้นหา...
                  </>
                ) : (
                  <>
                    {debouncedSearchQuery ? `พบ ${totalCount} รายการจากคำค้นหา` : `ทั้งหมด ${totalCount} รายการ`}
                    {totalCount > 0 && <span className="hidden sm:inline">• หน้า {currentPage}/{totalPages}</span>}
                  </>
                )}
              </h2>
              
              <div className="relative w-full sm:w-64 order-1 sm:order-2 group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="ค้นหาสิ่งของ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-10 bg-background border-muted shadow-xs transition-shadow focus-visible:ring-primary/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="ล้างคำค้นหา"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Loading State - Skeleton */}
            {loading ? (
              <ItemCardSkeletonGrid count={6} />
            ) : items.length === 0 ? (
              /* Empty State */
              <Empty className="py-16 bg-muted/10 border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="rounded-2xl size-14 [&_svg:not([class*='size-'])]:size-7">
                    {debouncedSearchQuery ? (
                      <Search className="h-7 w-7 text-muted-foreground" />
                    ) : (
                      <Package className="h-7 w-7 text-muted-foreground" />
                    )}
                  </EmptyMedia>
                  <EmptyTitle>
                    {debouncedSearchQuery ? "ไม่พบสิ่งของที่ค้นหา" : "ไม่พบสิ่งของ"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {debouncedSearchQuery
                      ? "ลองค้นหาด้วยคำสำคัญอื่นๆ หรือตรวจสอบคำผิด"
                      : "ลองเปลี่ยนตัวกรองหรือกลับมาดูใหม่ภายหลัง"}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                    {(categories.length > 0 || status !== "all" || debouncedSearchQuery) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCategories([])
                          setStatus("all")
                          setSearchQuery("")
                        }}
                      >
                        ล้างการค้นหาและตัวกรอง
                      </Button>
                    )}
                    {user && !debouncedSearchQuery && (
                      <Button
                        variant="default"
                        onClick={() => {
                          // Trigger post item modal - look for the header button
                          const postButton = document.querySelector('[data-post-item-trigger]') as HTMLButtonElement
                          postButton?.click()
                        }}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        โพสต์สิ่งของ
                      </Button>
                    )}
                  </div>
                </EmptyContent>
              </Empty>
            ) : (
              /* Items Grid */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 content-auto">
                  {items.map((item, index) => (
                    <BounceWrapper 
                      key={item.id} 
                      variant="bounce-up"
                      delay={Math.min(index, 4) * 0.03}
                    >
                      <MemoizedItemCard 
                        item={item} 
                        showRequestButton={!!user} 
                        onViewDetails={(item) => setSelectedItem(item)}
                        priority={index < 4}
                      />
                    </BounceWrapper>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-between border-t pt-4">
                    <p className="text-sm text-muted-foreground hidden sm:block">
                      หน้า {currentPage} จาก {totalPages}
                    </p>
                    <div className="flex items-center gap-2 mx-auto sm:mx-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="gap-1 min-w-[100px]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        ก่อนหน้า
                      </Button>
                      <span className="text-sm font-medium sm:hidden">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                        className="gap-1 min-w-[100px]"
                      >
                        ถัดไป
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Item Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-4xl overflow-hidden border-none shadow-2xl p-0">
          <DialogTitle className="sr-only">Item Details</DialogTitle>
          <div className="p-4 sm:p-6 md:p-8">
            {selectedItem && (
              <ItemDetailView 
                item={selectedItem} 
                isModal={true} 
                onClose={() => setSelectedItem(null)} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
