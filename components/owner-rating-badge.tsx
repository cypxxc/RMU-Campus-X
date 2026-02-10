"use client"

import { Star } from "lucide-react"
import { useI18n } from "@/components/language-provider"
import { cn } from "@/lib/utils"
import type { Item } from "@/types"

interface OwnerRatingBadgeProps {
  rating?: Item["postedByRating"]
  className?: string
  showCount?: boolean
}

export function OwnerRatingBadge({
  rating,
  className,
  showCount = true,
}: OwnerRatingBadgeProps) {
  const { tt } = useI18n()
  if (!rating || rating.count <= 0) return null

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-amber-500", className)}
      aria-label={tt(
        `คะแนนเฉลี่ย ${rating.average.toFixed(1)} จาก ${rating.count} รีวิว`,
        `Average rating ${rating.average.toFixed(1)} from ${rating.count} reviews`
      )}
    >
      <Star className="h-3.5 w-3.5 fill-current" />
      <span className="font-semibold">{rating.average.toFixed(1)}</span>
      {showCount && <span className="text-muted-foreground">({rating.count})</span>}
    </span>
  )
}
