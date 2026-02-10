"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import { getItemById } from "@/lib/firestore"
import type { Item } from "@/types"
import { Button } from "@/components/ui/button"
import { Loader2, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ItemDetailView } from "@/components/item-detail-view"
import Link from "next/link"
import { useI18n } from "@/components/language-provider"

export default function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { tt } = useI18n()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getItemById(id)
      .then((result) => {
        if (cancelled) return
        if (result.success && result.data) {
          setItem(result.data)
        } else {
          setItem(null)
          toast({
            title: tt("เกิดข้อผิดพลาด", "Error"),
            description: result.error || tt("ไม่สามารถโหลดข้อมูลสิ่งของได้", "Unable to load item data"),
            variant: "destructive",
          })
        }
      })
      .catch((error) => {
        if (cancelled) return
        console.error("[ItemDetail] Error:", error)
        setItem(null)
        toast({
          title: tt("เกิดข้อผิดพลาด", "Error"),
          description: tt("ไม่สามารถโหลดข้อมูลสิ่งของได้", "Unable to load item data"),
          variant: "destructive",
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id, toast, tt])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">{tt("ไม่พบสิ่งของ", "Item not found")}</h2>
          <p className="text-muted-foreground text-sm mb-4">{tt("สิ่งของนี้อาจถูกลบหรือไม่มีอยู่", "This item may have been removed or does not exist.")}</p>
          <Button asChild>
            <Link href="/dashboard">{tt("กลับไปหน้าแรก", "Back to dashboard")}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        <ItemDetailView item={item} />
      </div>
    </div>
  )
}
