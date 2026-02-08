"use client"

import { memo } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Item } from "@/types"
import { Package, MapPin, Calendar, Trash2 } from 'lucide-react'
import { formatPostedAt, safeToDate } from "@/lib/utils"
import { getItemImageUrls, getItemPrimaryImageUrl } from "@/lib/cloudinary-url"
import Image from "next/image"
import Link from "next/link"
import { FavoriteButton } from "@/components/favorite-button"
import { CATEGORY_LABELS } from "@/lib/constants"

interface ItemCardProps {
  item: Item
  showRequestButton?: boolean
  onViewDetails?: (item: Item) => void
  onDelete?: (item: Item) => void
  priority?: boolean
  /** โหมด admin: ซ่อนปุ่มโปรด, แสดงปุ่มลบ */
  variant?: 'default' | 'admin'
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
export const ItemCard = memo(function ItemCard({ item, showRequestButton: _showRequestButton = true, onViewDetails, onDelete, priority = false, variant = 'default' }: ItemCardProps) {
  const postedDate = safeToDate(item.postedAt, new Date(0))
  const isAdmin = variant === 'admin'
  const imageUrls = getItemImageUrls(item)
  const primaryImage = getItemPrimaryImageUrl(item)

  const handleCardClick = (e: React.MouseEvent) => {
    if (onViewDetails) {
      e.preventDefault()
      onViewDetails(item)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(item)
  }

  return (
    <Card 
      className="group overflow-hidden card-hover cursor-pointer hover:border-primary/30 transition-all duration-200"
      onClick={handleCardClick}
    >
      <CardHeader className="p-0">
        <div className="block">
          {primaryImage ? (
            <div className="relative aspect-4/3 w-full bg-muted overflow-hidden">
              <Image 
                src={primaryImage} 
                alt={item.title} 
                fill 
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={priority}
                loading={priority ? "eager" : "lazy"}
              />
              {/* Image count badge */}
              {imageUrls.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full" aria-label={`มีรูปภาพเพิ่มเติมอีก ${imageUrls.length - 1} รูป`}>
                  <span aria-hidden="true">+{imageUrls.length - 1}</span>
                </div>
              )}
              {/* Favorite Button (ซ่อนในโหมด admin) */}
              {!isAdmin && (
                <div className="absolute top-2 left-2 z-10 transition-transform duration-200 hover:scale-110">
                  <FavoriteButton item={item} />
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ) : (
            <div className="relative aspect-4/3 w-full bg-muted flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              {!isAdmin && (
                <div className="absolute top-2 left-2 z-10 transition-transform duration-200 hover:scale-110">
                  <FavoriteButton item={item} />
                </div>
              )}
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
            {CATEGORY_LABELS[item.category]}
          </span>
          {item.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {item.location}
            </span>
          )}
          {item.locationDetail?.trim() && (
            <span className="w-full basis-full text-muted-foreground/90 line-clamp-1" title={item.locationDetail.trim()}>
              รายละเอียดสถานที่: {item.locationDetail.trim()}
            </span>
          )}
          <span className="flex items-center gap-1.5" title={postedDate.toISOString()}>
            <Calendar className="h-3.5 w-3.5" />
            {formatPostedAt(postedDate)}
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
            {item.postedByName || item.postedByEmail?.split("@")[0] || "ผู้ใช้งาน"}
          </Link>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 mt-auto flex gap-2 items-center">
        {onViewDetails ? (
          <Button variant="secondary" className="flex-1 font-bold h-9 rounded-lg" onClick={handleCardClick}>
            ดูรายละเอียด
          </Button>
        ) : (
          <Button asChild className="flex-1 font-bold h-9 rounded-lg" size="sm">
            <Link href={`/item/${item.id}`}>ดูรายละเอียด</Link>
          </Button>
        )}
        {isAdmin && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDeleteClick}
            title="ลบโพส"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
})
