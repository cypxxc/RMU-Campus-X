"use client"

import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number // 0-5
  max?: number
  size?: number
  readOnly?: boolean
  onChange?: (rating: number) => void
  showValue?: boolean
}

export function StarRating({ 
  rating, 
  max = 5, 
  size = 16, 
  readOnly = false,
  onChange,
  showValue = false
}: StarRatingProps) {
  const stars = Array.from({ length: max }, (_, i) => i + 1)

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readOnly && onChange?.(star)}
          disabled={readOnly}
          className={cn(
            "transition-all",
            readOnly ? "cursor-default" : "cursor-pointer hover:scale-110",
            star <= rating ? "text-yellow-400" : "text-muted-foreground/30"
          )}
        >
          <Star 
            size={size} 
            className={cn(
               star <= rating ? "fill-current" : ""
            )} 
          />
        </button>
      ))}
      {showValue && (
        <span className="ml-2 text-sm font-medium text-muted-foreground">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
