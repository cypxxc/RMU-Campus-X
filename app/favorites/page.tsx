"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { getFavoriteItems } from "@/lib/db/favorites"
import { ItemCard } from "@/components/item-card"
import { ItemDetailView } from "@/components/item-detail-view"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Heart, AlertCircle } from "lucide-react"
import type { Item } from "@/types"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth()
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
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-32 text-center max-w-md">
        <div className="inline-flex items-center justify-center p-6 bg-muted rounded-full mb-6">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-3">กรุณาเข้าสู่ระบบ</h1>
        <p className="text-muted-foreground mb-8">
          คุณต้องเข้าสู่ระบบเพื่อดูรายการโปรดของคุณ
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/login">ไปหน้าเข้าสู่ระบบ</Link>
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
          <h1 className="text-3xl font-bold">รายการโปรด</h1>
          <p className="text-muted-foreground">รายการที่คุณบันทึกไว้ ({items.length})</p>
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
              <DialogTitle className="sr-only">รายละเอียดสิ่งของ</DialogTitle>
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
        <div className="py-24 text-center bg-muted/20 rounded-2xl border border-dashed">
          <Heart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">ยังไม่มีรายการโปรด</h2>
          <p className="text-muted-foreground mb-6">
            กดปุ่มหัวใจที่รายการสิ่งของเพื่อบันทึกไว้ดูภายหลัง
          </p>
          <Button asChild>
            <Link href="/dashboard">ค้นหาสิ่งของ</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
