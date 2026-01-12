"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { getFavoriteItems } from "@/lib/db/favorites"
import { ItemCard } from "@/components/item-card"
import { Loader2, Heart, AlertCircle } from "lucide-react"
import type { Item } from "@/types"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BounceWrapper } from "@/components/ui/bounce-wrapper"

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    const loadFavorites = async () => {
      try {
        const favoriteItems = await getFavoriteItems(user.uid)
        setItems(favoriteItems)
      } catch (error) {
        console.error("Error loading favorites:", error)
      } finally {
        setLoading(false)
      }
    }

    loadFavorites()
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
      <BounceWrapper variant="bounce-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
            <Heart className="h-8 w-8 fill-current" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">รายการโปรด</h1>
            <p className="text-muted-foreground">รายการที่คุณบันทึกไว้ ({items.length})</p>
          </div>
        </div>
      </BounceWrapper>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 content-auto">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
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
