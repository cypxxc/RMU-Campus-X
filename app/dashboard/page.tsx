"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { getItems } from "@/lib/firestore"
import type { Item, ItemCategory, ItemStatus } from "@/types"
import { ItemCard } from "@/components/item-card"
import { FilterSidebar } from "@/components/filter-sidebar"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Package, Sparkles, X } from "lucide-react"
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
import debounce from 'lodash/debounce'
import { useInView } from 'react-intersection-observer'
import { toast } from 'sonner'
import { memo } from "react" // Keep memo for MemoizedItemCard

// Memoized Item Card เพื่อป้องกัน re-render
const MemoizedItemCard = memo(ItemCard)

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

  // Infinite scroll states
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const lastDocRef = useRef<any>(null)
  const { ref, inView } = useInView()

  // Debounce search query
  useEffect(() => {
    if (searchQuery !== debouncedSearchQuery) {
      setIsSearching(true)
    }
    
    const handler = debounce(() => {
      setDebouncedSearchQuery(searchQuery)
      setIsSearching(false)
    }, 500)

    handler()

    return () => {
      handler.cancel()
    }
  }, [searchQuery])

  // Memoized loadItems function
  const loadItems = useCallback(async (isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setLoading(true)
        setItems([])
        lastDocRef.current = null
        setHasMore(true)
      } else {
        setLoadingMore(true)
      }

      const filters: { categories?: ItemCategory[]; status?: ItemStatus; searchQuery?: string; lastDoc?: any; pageSize?: number } = {
        pageSize: 12,
      }
      if (categories.length > 0) filters.categories = categories
      if (status !== "all") filters.status = status
      if (debouncedSearchQuery.trim()) filters.searchQuery = debouncedSearchQuery.trim()
      if (!isInitial && lastDocRef.current) filters.lastDoc = lastDocRef.current

      const result = await getItems(filters)
      
      if (result.success && result.data) {
        const newItems = result.data.items
        if (isInitial) {
          setItems(newItems)
        } else {
          setItems(prev => [...prev, ...newItems])
        }
        lastDocRef.current = result.data.lastDoc
        setHasMore(result.data.hasMore)
      } else {
        console.error('[Dashboard] Error:', result.error)
        toast.error('ไม่สามารถโหลดข้อมูลได้')
        setItems([])
        setHasMore(false)
      }
    } catch (error) {
      console.error('[Dashboard] Error:', error)
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล')
      setItems([])
      setHasMore(false)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [categories, status, debouncedSearchQuery]) // lastDoc removed from dependency

  // Initial load and reload on filter/search change
  useEffect(() => {
    loadItems(true)
  }, [categories, status, debouncedSearchQuery]) // Removed loadItems from dependencies

  // Load more items when inView and conditions met
  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore) {
      loadItems(false)
    }
  }, [inView, hasMore, loading, loadingMore, loadItems])

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
              <h2 className="text-sm font-medium text-muted-foreground order-2 sm:order-1 flex items-center gap-2">
                {loading ? (
                  "กำลังโหลด..."
                ) : isSearching ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    กำลังค้นหา...
                  </>
                ) : (
                  debouncedSearchQuery ? `พบ ${items.length} รายการจากคำค้นหา` : `พบ ${items.length} รายการ`
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
            {loading && items.length === 0 ? (
              <ItemCardSkeletonGrid count={6} />
            ) : items.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  {debouncedSearchQuery ? <Search className="h-8 w-8 text-muted-foreground" /> : <Package className="h-8 w-8 text-muted-foreground" />}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {debouncedSearchQuery ? "ไม่พบสิ่งของที่ค้นหา" : "ไม่พบสิ่งของ"}
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  {debouncedSearchQuery ? "ลองค้นหาด้วยคำสำคัญอื่นๆ หรือตรวจสอบคำผิด" : "ลองเปลี่ยนตัวกรองหรือกลับมาดูใหม่ภายหลัง"}
                </p>
                {(categories.length > 0 || status !== "all" || debouncedSearchQuery) && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setCategories([])
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
                      />
                    </BounceWrapper>
                  ))}
                </div>

                {/* Infinite Scroll Loader */}
                {hasMore && items.length > 0 && (
                  <div ref={ref} className="mt-8 flex justify-center py-4">
                     {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
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
