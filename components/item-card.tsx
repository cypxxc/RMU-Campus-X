"use client"

import { memo } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Item } from "@/types"
import { Package, MapPin, Calendar } from 'lucide-react'
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import Image from "next/image"
import Link from "next/link"
import { FavoriteButton } from "@/components/favorite-button"

interface ItemCardProps {
  item: Item
  showRequestButton?: boolean
  onViewDetails?: (item: Item) => void
  priority?: boolean
}

const categoryLabels: Record<string, string> = {
  electronics: "อิเล็กทรอนิกส์",
  books: "หนังสือ",
  furniture: "เฟอร์นิเจอร์",
  clothing: "เสื้อผ้า",
  sports: "กีฬา",
  other: "อื่นๆ",
}

const statusLabels: Record<string, string> = {
  available: "พร้อมให้",
  pending: "รอดำเนินการ",
  completed: "เสร็จสิ้น",
}

const statusColors: Record<string, string> = {
  available: "bg-primary/10 text-primary border-primary/20",
  pending: "badge-warning",
  completed: "bg-muted text-muted-foreground border-border",
}

// ✅ Memoized to prevent re-renders when parent re-renders
export const ItemCard = memo(function ItemCard({ item, showRequestButton: _showRequestButton = true, onViewDetails, priority = false }: ItemCardProps) {
  const postedDate = item.postedAt?.toDate?.() || new Date()

  const handleCardClick = (e: React.MouseEvent) => {
    if (onViewDetails) {
      e.preventDefault()
      onViewDetails(item)
    }
  }

  return (
    <Card 
      className="group overflow-hidden card-hover animate-fade-in cursor-pointer hover:border-primary/30 transition-all duration-300"
      onClick={handleCardClick}
    >
      <CardHeader className="p-0">
        <div className="block">
          {(item.imageUrls?.[0] || item.imageUrl) ? (
            <div className="relative aspect-4/3 w-full bg-muted overflow-hidden">
              <Image 
                src={item.imageUrls?.[0] || item.imageUrl || "/placeholder.svg"} 
                alt={item.title} 
                fill 
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={priority}
              />
              {/* Image count badge */}
              {item.imageUrls && item.imageUrls.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full" aria-label={`มีรูปภาพเพิ่มเติมอีก ${item.imageUrls.length - 1} รูป`}>
                  <span aria-hidden="true">+{item.imageUrls.length - 1}</span>
                </div>
              )}
              {/* Favorite Button */}
              <div className="absolute top-2 left-2 z-10 transition-transform duration-200 hover:scale-110">
                <FavoriteButton item={item} />
              </div>
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ) : (
            <div className="relative aspect-4/3 w-full bg-muted flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
               <div className="absolute top-2 left-2 z-10 transition-transform duration-200 hover:scale-110">
                <FavoriteButton item={item} />
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Title and Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
              {item.title || "ไม่มีชื่อเรื่อง"}
            </h3>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-xs font-medium ${statusColors[item.status] || "bg-muted text-muted-foreground border-border"}`}
          >
            {statusLabels[item.status] || "ไม่ทราบสถานะ"}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {item.description || "ไม่มีรายละเอียด"}
        </p>

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            {categoryLabels[item.category]}
          </span>
          {item.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {item.location}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatDistanceToNow(postedDate, { addSuffix: true, locale: th })}
          </span>
        </div>

        {/* Poster Info */}
        <div className="pt-2 mt-1 border-t flex items-center gap-2 relative z-20" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-muted-foreground">โพสต์โดย:</span>
          <Link 
            href={`/profile/${item.postedBy}`}
            className="text-xs font-bold hover:text-primary hover:underline transition-colors flex items-center gap-1"
            title="คลิกเพื่อดูโปรไฟล์"
          >
            {item.postedByName || "ผู้ใช้งาน"}
          </Link>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 mt-auto">
        {onViewDetails ? (
          <Button variant="secondary" className="w-full font-bold h-9 rounded-lg" onClick={handleCardClick}>
            ดูรายละเอียด
          </Button>
        ) : (
          <Button asChild className="w-full font-bold h-9 rounded-lg" size="sm">
            <Link href={`/item/${item.id}`}>ดูรายละเอียด</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
})
