"use client"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { checkIsFavorite, toggleFavorite } from "@/lib/db/favorites"
import { useToast } from "@/hooks/use-toast"
import type { Item } from "@/types"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/language-provider"

interface FavoriteButtonProps {
  item: Item
  variant?: "icon" | "button"
  className?: string
}

export function FavoriteButton({ item, variant = "icon", className }: FavoriteButtonProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { tt } = useI18n()
  const [isFavorite, setIsFavorite] = useState(Boolean(item.isFavorite))
  const [toggling, setToggling] = useState(false)

  const isOwnItem = user && item?.postedBy && String(item.postedBy) === user.uid

  useEffect(() => {
    if (typeof item.isFavorite === "boolean") {
      setIsFavorite(item.isFavorite)
      return
    }

    if (!user?.uid || !item?.id || isOwnItem) {
      setIsFavorite(false)
      return
    }

    let active = true
    checkIsFavorite(user.uid, item.id).then((fav) => {
      if (!active) return
      setIsFavorite(fav)
    })
    return () => {
      active = false
    }
  }, [user?.uid, item?.id, item.isFavorite, isOwnItem])

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isOwnItem) {
      toast({
        title: "Your item",
        description: "You cannot add your own item to favorites.",
      })
      return
    }

    if (!user) {
      toast({
        title: tt("กรุณาเข้าสู่ระบบ", "Please sign in"),
        description: tt("คุณต้องเข้าสู่ระบบเพื่อบันทึกรายการโปรด", "You need to sign in to save favorites."),
        variant: "destructive"
      })
      return
    }

    setToggling(true)
    try {
      const newState = await toggleFavorite(user.uid, item, isFavorite)
      setIsFavorite(newState)
      
      if (newState) {
        toast({ title: tt("บันทึกรายการแล้ว", "Saved"), description: tt("รายการนี้ถูกเพิ่มในรายการโปรดของคุณ", "Item added to your favorites.") })
      } else {
        toast({ title: tt("ลบรายการแล้ว", "Removed"), description: tt("รายการนี้ถูกลบออกจากรายการโปรดของคุณ", "Item removed from your favorites.") })
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast({ 
        title: tt("เกิดข้อผิดพลาด", "Error"), 
        description: tt("ไม่สามารถบันทึกรายการได้", "Unable to update favorite"), 
        variant: "destructive" 
      })
    } finally {
      setToggling(false)
    }
  }

  if (variant === "button") {
    return (
      <Button
        variant="outline"
        size="lg"
        className={cn(
          "gap-2 transition-all", 
          isFavorite ? "text-red-500 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-600" : "hover:text-red-500",
          className
        )}
        onClick={handleToggle}
        disabled={toggling}
      >
        <Heart className={cn("h-5 w-5", isFavorite ? "fill-current" : "")} aria-hidden="true" />
        {isFavorite ? tt("บันทึกแล้ว", "Saved") : tt("บันทึกรายการ", "Save")}
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "rounded-full h-8 w-8 bg-background/80 backdrop-blur-xs shadow-xs hover:bg-background transition-all",
        isFavorite ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500",
        className
      )}
      onClick={handleToggle}
      disabled={toggling}
      aria-label={isFavorite ? tt("ลบออกจากรายการโปรด", "Remove from favorites") : tt("เพิ่มในรายการโปรด", "Add to favorites")}
    >
      <Heart className={cn("h-4 w-4", isFavorite ? "fill-current" : "")} aria-hidden="true" />
    </Button>
  )
}
