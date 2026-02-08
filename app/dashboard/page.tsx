"use client"

import { useEffect, useState } from "react"
import type { Item, ItemCategory, ItemStatus } from "@/types"
import { useItems } from "@/hooks/use-items"
import { ItemCard } from "@/components/item-card"
import { FilterSidebar } from "@/components/filter-sidebar"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Package, Sparkles, X, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { ItemDetailView } from "@/components/item-detail-view"
import { AccountStatusBanner } from "@/components/account-status-banner"
import { ItemCardSkeletonGrid } from "@/components/item-card-skeleton"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import debounce from 'lodash/debounce'
import { toast } from 'sonner'
import { memo } from "react"

// Memoized Item Card เพื่อป้องกัน re-render
const MemoizedItemCard = memo(ItemCard)

const PAGE_SIZE = 12

export default function DashboardPage() {
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [status, setStatus] = useState<ItemStatus | "all">("available")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const { user } = useAuth()
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  // Debounce search query
  useEffect(() => {
    if (searchQuery !== debouncedSearchQuery) setIsSearching(true)
    const handler = debounce(() => {
      setDebouncedSearchQuery(searchQuery)
      setIsSearching(false)
    }, 500)
    handler()
    return () => handler.cancel()
  }, [searchQuery])

  const {
    items,
    isLoading,
    isFetching,
    isError,
    error,
    currentPage,
    totalPages,
    totalCount,
    hasMore,
    goToPage,
  } = useItems({
    categories,
    status,
    searchQuery: debouncedSearchQuery,
    pageSize: PAGE_SIZE,
  })

  useEffect(() => {
    if (isError && error) {
      toast.error("ไม่สามารถโหลดข้อมูลได้")
    }
  }, [isError, error])

  const handlePageChange = (newPage: number) => {
    goToPage(newPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleLoadMore = () => {
    goToPage(currentPage + 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const loading = isLoading

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Visual Hierarchy: H1 เด่นกว่า body */}
      <div className="border-b bg-linear-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-10 sm:py-14">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">แพลตฟอร์มแลกเปลี่ยน</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              RMU-Campus X
            </h1>
            <p className="text-muted-foreground max-w-lg text-sm sm:text-base">
              แพลตฟอร์มแลกเปลี่ยนและขอรับสิ่งของ สำหรับนักศึกษาและบุคลากร
              <span className="hidden sm:inline"> มหาวิทยาลัยราชภัฏมหาสารคาม</span>
            </p>
          </div>
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
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
                    <MemoizedItemCard
                      key={item.id}
                      item={item}
                      showRequestButton={!!user}
                      onViewDetails={(item) => setSelectedItem(item)}
                      priority={index < 6}
                    />
                  ))}
                </div>

                {/* โหลดเพิ่ม หรือ Pagination */}
                {hasMore && (
                  <div className="mt-8 flex justify-center">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleLoadMore}
                      disabled={isFetching}
                      className="gap-2 min-w-[160px]"
                    >
                      {isFetching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {isFetching ? "กำลังโหลด..." : "โหลดเพิ่ม"}
                    </Button>
                  </div>
                )}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between border-t pt-4">
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
