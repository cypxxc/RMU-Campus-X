"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { getFavoriteItems } from "@/lib/db/favorites"
import { ItemCard } from "@/components/item-card"
import { ItemDetailView } from "@/components/item-detail-view"
import { ItemCardSkeletonGrid } from "@/components/item-card-skeleton"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import { Heart, AlertCircle, Package } from "lucide-react"
import type { Item } from "@/types"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useI18n } from "@/components/language-provider"

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth()
  const { tt } = useI18n()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    let cancelled = false
    const loadFavorites = async () => {
      try {
        const favoriteItems = await getFavoriteItems(user.uid)
        if (cancelled) return
        setItems(favoriteItems)
      } catch (error) {
        if (cancelled) return
        console.error("Error loading favorites:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadFavorites()
    return () => { cancelled = true }
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-red-50 text-red-500 rounded-2xl dark:bg-red-950/30 dark:text-red-400">
            <Heart className="h-8 w-8 fill-current" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{tt("รายการโปรด", "Favorites")}</h1>
            <p className="text-muted-foreground">{tt("กำลังโหลด...", "Loading...")}</p>
          </div>
        </div>
        <ItemCardSkeletonGrid count={6} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-32 text-center max-w-md">
        <div className="inline-flex items-center justify-center p-6 bg-muted rounded-full mb-6">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-3">{tt("กรุณาเข้าสู่ระบบ", "Please sign in")}</h1>
        <p className="text-muted-foreground mb-8">
          {tt("คุณต้องเข้าสู่ระบบเพื่อดูรายการโปรดของคุณ", "You need to sign in to view your favorites.")}
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/login">{tt("ไปหน้าเข้าสู่ระบบ", "Go to sign in")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-red-50 text-red-500 rounded-2xl dark:bg-red-950/30 dark:text-red-400">
          <Heart className="h-8 w-8 fill-current" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{tt("รายการโปรด", "Favorites")}</h1>
          <p className="text-muted-foreground">
            {tt(`รายการที่คุณบันทึกไว้ (${items.length})`, `Saved items (${items.length})`)}
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 content-auto">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                showRequestButton={!!user}
                onViewDetails={(item) => setSelectedItem(item)}
              />
            ))}
          </div>
          <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
            <DialogContent className="max-w-4xl overflow-hidden border-none shadow-2xl p-0">
              <DialogTitle className="sr-only">{tt("รายละเอียดสิ่งของ", "Item details")}</DialogTitle>
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
        </>
      ) : (
        <Empty className="py-16 bg-muted/10 border border-dashed rounded-2xl">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="rounded-2xl size-14 [&_svg]:size-8">
              <Heart className="text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>{tt("ยังไม่มีรายการโปรด", "No favorites yet")}</EmptyTitle>
            <EmptyDescription>
              {tt("กดปุ่มหัวใจที่รายการสิ่งของในหน้าหลักเพื่อบันทึกไว้ดูภายหลัง", "Tap the heart icon on items in the dashboard to save them for later.")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <Link href="/dashboard">
                  <Package className="mr-2 h-4 w-4" />
                  {tt("ค้นหาสิ่งของ", "Browse items")}
                </Link>
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      )}
    </div>
  )
}
