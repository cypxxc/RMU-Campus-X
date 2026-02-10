"use client"

import { memo } from "react"
import Image from "next/image"
import Link from "next/link"
import { Calendar, MapPin, Package, Trash2 } from "lucide-react"
import { FavoriteButton } from "@/components/favorite-button"
import { useI18n } from "@/components/language-provider"
import { OwnerRatingBadge } from "@/components/owner-rating-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { getItemImageUrls, getItemPrimaryImageUrl } from "@/lib/cloudinary-url"
import { CATEGORY_LABELS } from "@/lib/constants"
import { formatPostedAt, safeToDate } from "@/lib/utils"
import type { Item } from "@/types"

interface ItemCardProps {
  item: Item
  showRequestButton?: boolean
  onViewDetails?: (item: Item) => void
  onDelete?: (item: Item) => void
  priority?: boolean
  variant?: "default" | "admin"
}

export const ItemCard = memo(function ItemCard({
  item,
  showRequestButton: _showRequestButton = true,
  onViewDetails,
  onDelete,
  priority = false,
  variant = "default",
}: ItemCardProps) {
  const { tt } = useI18n()
  const postedDate = safeToDate(item.postedAt, new Date(0))
  const isAdmin = variant === "admin"
  const imageUrls = getItemImageUrls(item)
  const primaryImage = getItemPrimaryImageUrl(item, { width: 400 })

  const statusLabels: Record<string, string> = {
    available: tt("พร้อมให้", "Available"),
    pending: tt("รอดำเนินการ", "Pending"),
    completed: tt("เสร็จสิ้น", "Completed"),
  }

  const statusColors: Record<string, string> = {
    available: "bg-primary/10 text-primary border-primary/20",
    pending: "badge-warning",
    completed: "bg-muted text-muted-foreground border-border",
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (!onViewDetails) return
    e.preventDefault()
    onViewDetails(item)
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

              {imageUrls.length > 1 && (
                <div
                  className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full"
                  aria-label={tt(
                    `มีรูปภาพเพิ่มเติมอีก ${imageUrls.length - 1} รูป`,
                    `${imageUrls.length - 1} more images`
                  )}
                >
                  <span aria-hidden="true">+{imageUrls.length - 1}</span>
                </div>
              )}

              {!isAdmin && (
                <div className="absolute top-2 left-2 z-10 transition-transform duration-200 hover:scale-110">
                  <FavoriteButton item={item} />
                </div>
              )}

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
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
              {item.title || tt("ไม่มีชื่อเรื่อง", "Untitled")}
            </h3>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-xs font-medium ${
              statusColors[item.status] || "bg-muted text-muted-foreground border-border"
            }`}
          >
            {statusLabels[item.status] || tt("ไม่ทราบสถานะ", "Unknown status")}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {item.description || tt("ไม่มีรายละเอียด", "No description")}
        </p>

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
              {tt("รายละเอียดสถานที่:", "Location details:")} {item.locationDetail.trim()}
            </span>
          )}
          <span className="flex items-center gap-1.5" title={postedDate.toISOString()}>
            <Calendar className="h-3.5 w-3.5" />
            {formatPostedAt(postedDate)}
          </span>
        </div>

        <div className="pt-2 mt-1 border-t flex items-center gap-2 relative z-20" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-muted-foreground">{tt("โพสต์โดย:", "Posted by:")}</span>
          <Link
            href={`/profile/${item.postedBy}`}
            className="text-xs font-bold hover:text-primary hover:underline transition-colors inline-flex items-center gap-1.5 flex-wrap"
            title={tt("คลิกเพื่อดูโปรไฟล์", "View profile")}
          >
            <span>
              {item.postedByName || item.postedByEmail?.split("@")[0] || tt("ผู้ใช้งาน", "User")}
            </span>
            <OwnerRatingBadge rating={item.postedByRating} className="text-[11px]" />
          </Link>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 mt-auto flex gap-2 items-center">
        {onViewDetails ? (
          <Button variant="secondary" className="flex-1 font-bold h-9 rounded-lg" onClick={handleCardClick}>
            {tt("ดูรายละเอียด", "View details")}
          </Button>
        ) : (
          <Button asChild className="flex-1 font-bold h-9 rounded-lg" size="sm">
            <Link href={`/item/${item.id}`}>{tt("ดูรายละเอียด", "View details")}</Link>
          </Button>
        )}
        {isAdmin && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDeleteClick}
            title={tt("ลบโพส", "Delete post")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
})
