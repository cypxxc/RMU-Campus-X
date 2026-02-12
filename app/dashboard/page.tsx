"use client"

import { memo, useEffect, useState } from "react"
import debounce from "lodash/debounce"
import { ChevronLeft, ChevronRight, Loader2, Package, Search, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import type { Item, ItemCategory, ItemStatus } from "@/types"
import { useAuth } from "@/components/auth-provider"
import { FilterSidebar } from "@/components/filter-sidebar"
import { useI18n } from "@/components/language-provider"
import { ItemCard } from "@/components/item-card"
import { ItemCardSkeletonGrid } from "@/components/item-card-skeleton"
import { ItemDetailView } from "@/components/item-detail-view"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { useItems } from "@/hooks/use-items"

const MemoizedItemCard = memo(ItemCard)
const PAGE_SIZE = 12

export default function DashboardPage() {
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [status, setStatus] = useState<ItemStatus | "all">("available")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const { user, loading: authLoading } = useAuth()
  const { tt } = useI18n()

  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)
    handler()
    return () => handler.cancel()
  }, [searchQuery])

  const {
    items,
    isLoading,
    isError,
    error,
    currentPage,
    totalPages,
    totalCount,
    goToPage,
  } = useItems({
    categories,
    status,
    searchQuery: debouncedSearchQuery,
    pageSize: PAGE_SIZE,
    enabled: !!user,
  })

  const showItemsLoading = (authLoading && !user) || isLoading
  const isSearching = searchQuery !== debouncedSearchQuery

  useEffect(() => {
    if (isError && error) {
      toast.error(tt("ไม่สามารถโหลดข้อมูลได้", "Unable to load items"))
    }
  }, [error, isError, tt])

  const handlePageChange = (newPage: number) => {
    goToPage(newPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-linear-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-10 sm:py-14">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">
                {tt("แพลตฟอร์มแลกเปลี่ยน", "Exchange platform")}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              RMU-Campus X
            </h1>
            <p className="text-muted-foreground max-w-lg text-sm sm:text-base">
              {tt(
                "แพลตฟอร์มแลกเปลี่ยนและขอรับสิ่งของ สำหรับนักศึกษาและบุคลากรมหาวิทยาลัยราชภัฏมหาสารคาม",
                "A platform to share and request useful items for RMU students and staff."
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 shrink-0">
            <FilterSidebar
              categories={categories}
              status={status}
              onCategoriesChange={setCategories}
              onStatusChange={setStatus}
            />
          </aside>

          <main className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <h2 className="text-sm font-medium text-muted-foreground order-2 sm:order-1 flex items-center gap-2" role="status" aria-live="polite">
                {showItemsLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {tt("กำลังโหลด...", "Loading...")}
                  </>
                ) : isSearching ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {tt("กำลังค้นหา...", "Searching...")}
                  </>
                ) : (
                  <>
                    {debouncedSearchQuery
                      ? tt(`พบ ${totalCount} รายการจากคำค้นหา`, `${totalCount} results found`)
                      : tt(`ทั้งหมด ${totalCount} รายการ`, `${totalCount} total items`)}
                    {totalCount > 0 && (
                      <span className="hidden sm:inline">
                        • {tt(`หน้า ${currentPage}/${totalPages}`, `Page ${currentPage}/${totalPages}`)}
                      </span>
                    )}
                  </>
                )}
              </h2>

              <div className="relative w-full sm:w-64 order-1 sm:order-2 group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder={tt("ค้นหาสิ่งของ...", "Search items...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-10 bg-background border-muted shadow-xs transition-shadow focus-visible:ring-primary/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={tt("ล้างคำค้นหา", "Clear search")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {showItemsLoading ? (
              <ItemCardSkeletonGrid count={6} />
            ) : items.length === 0 ? (
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
                    {debouncedSearchQuery
                      ? tt("ไม่พบสิ่งของที่ค้นหา", "No matching items")
                      : tt("ไม่พบสิ่งของ", "No items found")}
                  </EmptyTitle>
                  <EmptyDescription>
                    {debouncedSearchQuery
                      ? tt(
                          "ลองค้นหาด้วยคำสำคัญอื่นๆ หรือตรวจสอบคำผิด",
                          "Try another keyword or check spelling."
                        )
                      : tt(
                          "ลองเปลี่ยนตัวกรองหรือกลับมาดูใหม่ภายหลัง",
                          "Try changing filters or come back later."
                        )}
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
                        {tt("ล้างการค้นหาและตัวกรอง", "Clear search and filters")}
                      </Button>
                    )}
                    {user && !debouncedSearchQuery && (
                      <Button
                        variant="default"
                        onClick={() => {
                          const postButton = document.querySelector(
                            "[data-post-item-trigger]"
                          ) as HTMLButtonElement | null
                          postButton?.click()
                        }}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        {tt("โพสต์สิ่งของ", "Post item")}
                      </Button>
                    )}
                  </div>
                </EmptyContent>
              </Empty>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 content-auto">
                  {items.map((item, index) => (
                    <MemoizedItemCard
                      key={item.id}
                      item={item}
                      showRequestButton={!!user}
                      onViewDetails={(selected) => setSelectedItem(selected)}
                      priority={index < 6}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between border-t pt-4">
                    <p className="text-sm text-muted-foreground hidden sm:block">
                      {tt(`หน้า ${currentPage} จาก ${totalPages}`, `Page ${currentPage} of ${totalPages}`)}
                    </p>
                    <div className="flex items-center gap-2 mx-auto sm:mx-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || showItemsLoading}
                        className="gap-1 min-w-[100px]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        {tt("ก่อนหน้า", "Previous")}
                      </Button>
                      <span className="text-sm font-medium sm:hidden">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || showItemsLoading}
                        className="gap-1 min-w-[100px]"
                      >
                        {tt("ถัดไป", "Next")}
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

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-4xl overflow-hidden border-none shadow-2xl p-0">
          <DialogTitle className="sr-only">{tt("รายละเอียดสิ่งของ", "Item details")}</DialogTitle>
          <div className="p-4 sm:p-6 md:p-8">
            {selectedItem && (
              <ItemDetailView item={selectedItem} isModal onClose={() => setSelectedItem(null)} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
