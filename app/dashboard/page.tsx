"use client"

import { useEffect, useState, useMemo, useCallback, memo } from "react"
import { getItems } from "@/lib/firestore"
import type { Item, ItemCategory, ItemStatus } from "@/types"
import { ItemCard } from "@/components/item-card"
import { FilterSidebar } from "@/components/filter-sidebar"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Package, Sparkles, ChevronLeft, ChevronRight } from "lucide-react"
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

// Memoized Item Card เพื่อป้องกัน re-render
const MemoizedItemCard = memo(ItemCard)

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<ItemCategory | "all">("all")
  const [status, setStatus] = useState<ItemStatus | "all">("available")
  const [searchQuery, setSearchQuery] = useState("")
  const { user } = useAuth()
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  // Memoized loadItems function
  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const filters: { category?: ItemCategory; status?: ItemStatus } = {}
      if (category !== "all") filters.category = category
      if (status !== "all") filters.status = status

      const result = await getItems(filters)
      
      // Handle ApiResponse format
      if (result.success && result.data) {
        setItems(result.data.items)
      } else {
        console.error('[Dashboard] Error:', result.error)
        setItems([])
      }
    } catch (error) {
      console.error('[Dashboard] Error:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [category, status])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Memoized filtered items
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items
    const searchLower = searchQuery.toLowerCase()
    return items.filter(item => 
      item.title.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower)
    )
  }, [items, searchQuery])

  // Memoized pagination
  const { paginatedItems, totalPages } = useMemo(() => {
    const total = Math.ceil(filteredItems.length / itemsPerPage)
    const paginated = filteredItems.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    )
    return { paginatedItems: paginated, totalPages: total }
  }, [filteredItems, currentPage, itemsPerPage])

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [category, status, searchQuery])

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
              RMU Exchange
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
              category={category}
              status={status}
              onCategoryChange={setCategory}
              onStatusChange={setStatus}
            />
          </aside>

          {/* Items Grid */}
          <main className="flex-1 min-w-0">
            {/* Results Header & Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-sm font-medium text-muted-foreground order-2 sm:order-1">
                {loading ? (
                  "กำลังโหลด..."
                ) : (
                  searchQuery ? `พบ ${filteredItems.length} รายการจากคำค้นหา` : `พบ ${items.length} รายการ`
                )}
              </h2>
              
              <div className="relative w-full sm:w-64 order-1 sm:order-2 group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="ค้นหาสิ่งของ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 bg-background border-muted shadow-xs transition-shadow focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  {searchQuery ? <Search className="h-8 w-8 text-muted-foreground" /> : <Package className="h-8 w-8 text-muted-foreground" />}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? "ไม่พบสิ่งของที่ค้นหา" : "ไม่พบสิ่งของ"}
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  {searchQuery ? "ลองค้นหาด้วยคำสำคัญอื่นๆ หรือตรวจสอบคำผิด" : "ลองเปลี่ยนตัวกรองหรือกลับมาดูใหม่ภายหลัง"}
                </p>
                {(category !== "all" || status !== "all" || searchQuery) && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setCategory("all")
                      setStatus("all")
                      setSearchQuery("")
                    }}
                  >
                    ล้างการค้นหาและตัวกรอง
                  </Button>
                )}
              </div>
            ) : (
              /* Items Grid */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {paginatedItems.map((item, index) => (
                    <BounceWrapper 
                      key={item.id} 
                      variant="bounce-up"
                      delay={Math.min(index, 4) * 0.03}
                    >
                      <MemoizedItemCard 
                        item={item} 
                        showRequestButton={!!user} 
                        onViewDetails={(item) => setSelectedItem(item)}
                      />
                    </BounceWrapper>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      ก่อนหน้า
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            className="w-9 h-9 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="gap-1"
                    >
                      ถัดไป
                      <ChevronRight className="h-4 w-4" />
                    </Button>
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
