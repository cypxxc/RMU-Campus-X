"use client"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { checkIsFavorite, toggleFavorite } from "@/lib/db/favorites"
import { useToast } from "@/hooks/use-toast"
import type { Item } from "@/types"
import { cn } from "@/lib/utils"

interface FavoriteButtonProps {
  item: Item
  variant?: "icon" | "button"
  className?: string
}

export function FavoriteButton({ item, variant = "icon", className }: FavoriteButtonProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isFavorite, setIsFavorite] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (user && item) {
      checkIsFavorite(user.uid, item.id).then(setIsFavorite)
    }
  }, [user, item])

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        description: "คุณต้องเข้าสู่ระบบเพื่อบันทึกรายการโปรด",
        variant: "destructive"
      })
      return
    }

    setToggling(true)
    try {
      const newState = await toggleFavorite(user.uid, item)
      setIsFavorite(newState)
      
      if (newState) {
        toast({ title: "บันทึกรายการแล้ว", description: "รายการนี้ถูกเพิ่มในรายการโปรดของคุณ" })
      } else {
        toast({ title: "ลบรายการแล้ว", description: "รายการนี้ถูกลบออกจากรายการโปรดของคุณ" })
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast({ 
        title: "เกิดข้อผิดพลาด", 
        description: "ไม่สามารถบันทึกรายการได้", 
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
        {isFavorite ? "บันทึกแล้ว" : "บันทึกรายการ"}
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
      aria-label={isFavorite ? "ลบออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
    >
      <Heart className={cn("h-4 w-4", isFavorite ? "fill-current" : "")} aria-hidden="true" />
    </Button>
  )
}
