"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { createExchange, getUserProfile } from "@/lib/firestore"
import type { Item, User, ItemStatus, ItemCategory } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { HandHeart, Maximize2, Package, MapPin, Calendar, User as UserIcon, AlertTriangle, Info, CheckCircle2, Clock, Trash2 } from "lucide-react"
import { formatPostedAt, safeToDate } from "@/lib/utils"
import { getItemImageUrls, getItemImageUrlAt } from "@/lib/cloudinary-url"
import Image from "next/image"
import Link from "next/link"
const ReportModal = lazy(() => import("@/components/report-modal").then((m) => ({ default: m.ReportModal })))
import { useAccountStatus } from "@/hooks/use-account-status"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"
import { STATUS_COLORS } from "@/lib/constants"
import { FavoriteButton } from "@/components/favorite-button"
import { OwnerRatingBadge } from "@/components/owner-rating-badge"
import { useI18n } from "@/components/language-provider"
import { ItemImageZoom } from "@/components/item-image-zoom"
import { ItemAdminEditDialog, ItemAdminEditButton } from "@/components/item-admin-edit-dialog"

interface ItemDetailViewProps {
  item: Item
  isModal?: boolean
  onClose?: () => void
  /** โหมด admin: ซ่อนปุ่มขอรับ/รายงาน/โปรด แสดงแถบจัดการ (สถานะ, ลบ) */
  variant?: "default" | "admin"
  onAdminStatusChange?: (itemId: string, status: ItemStatus) => void
  onAdminDelete?: (item: Item) => void
  onAdminItemUpdated?: (item: Item) => void
  adminProcessing?: boolean
}

export function ItemDetailView({
  item,
  isModal = false,
  onClose: _onClose,
  variant = "default",
  onAdminStatusChange,
  onAdminDelete,
  onAdminItemUpdated,
  adminProcessing = false,
}: ItemDetailViewProps) {
  const [requesting, setRequesting] = useState(false)
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showImageZoom, setShowImageZoom] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [poster, setPoster] = useState<User | null>(null)
  const [posterLoading, setPosterLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { canExchange } = useAccountStatus()
  const { locale, tt } = useI18n()

  // Fetch poster profile only if postedByName is not available (for old items)
  useEffect(() => {
    setPoster(null)
    if (item.postedByName) {
      setPosterLoading(false)
      return
    }
    const loadPoster = async () => {
      setPosterLoading(true)
      if (item.postedBy) {
        try {
          const profile = await getUserProfile(item.postedBy)
          if (profile) setPoster(profile)
        } catch (err) {
          console.error("Failed to load poster profile:", err)
        }
      }
      setPosterLoading(false)
    }
    loadPoster()
  }, [item.postedBy, item.postedByName])

  const handleRequestItem = async () => {
    if (!user || !item) return
    const statusCheck = await canExchange()
    if (!statusCheck.isAllowed) {
      setShowRequestDialog(false)
      return
    }
    setRequesting(true)
    try {
      const response = await createExchange({
        itemId: item.id,
        itemTitle: item.title,
        ownerId: item.postedBy,
        ownerEmail: item.postedByEmail,
        requesterId: user.uid,
        requesterEmail: user.email || "",
        status: "pending",
        ownerConfirmed: false,
        requesterConfirmed: false,
      })
      if (!response.success || !response.data) {
         throw new Error(response.error || tt("ไม่สามารถสร้างคำขอได้", "Unable to create request"))
      }
      const exchangeId = response.data
      toast({
        title: tt("ส่งคำขอสำเร็จ", "Request sent"),
        description: tt("คุณสามารถติดต่อเจ้าของได้ในแชท", "You can contact the owner in chat."),
      })
      router.push(`/chat/${exchangeId}`)
    } catch (error: unknown) {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: error instanceof Error ? error.message : tt("ไม่สามารถส่งคำขอได้", "Unable to send request"),
        variant: "destructive",
      })
    } finally {
      setRequesting(false)
      setShowRequestDialog(false)
    }
  }

  const postedDate = safeToDate(item.postedAt, new Date(0))
  const isOwner = user?.uid === item.postedBy
  const isAdminMode = variant === "admin"
  const ownerDisplayName = item.postedByName || poster?.displayName || item.postedByEmail.split("@")[0] || tt("ผู้ใช้งาน", "User")
  const ownerRating = item.postedByRating ?? poster?.rating
  const categoryLabelByValue: Record<ItemCategory, string> = {
    electronics: tt("อิเล็กทรอนิกส์", "Electronics"),
    books: tt("หนังสือ", "Books"),
    furniture: tt("เฟอร์นิเจอร์", "Furniture"),
    clothing: tt("เสื้อผ้า", "Clothing"),
    sports: tt("อุปกรณ์กีฬา", "Sports"),
    other: tt("อื่นๆ", "Other"),
  }
  const statusLabelByValue: Record<ItemStatus, string> = {
    available: tt("พร้อมให้", "Available"),
    pending: tt("รอดำเนินการ", "Pending"),
    completed: tt("เสร็จสิ้น", "Completed"),
  }
  const postedAtText =
    locale === "th"
      ? formatPostedAt(postedDate)
      : postedDate.getTime() > 0
        ? new Intl.DateTimeFormat("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(postedDate)
        : "—"

  const allImages = getItemImageUrls(item)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const currentImage = getItemImageUrlAt(item, selectedImageIndex, { width: 1200 }) || allImages[selectedImageIndex] || null

  return (
    <div className={`w-full ${isModal ? "" : "container mx-auto px-4 py-6 sm:py-8 max-w-5xl"}`}>
      <div className={`grid grid-cols-1 ${isModal ? "md:grid-cols-2 gap-6" : "lg:grid-cols-2 gap-6 lg:gap-8"}`}>
        {/* Image Section */}
        <div className="space-y-3">
          {/* Main Image */}
          <div 
            className="relative aspect-square w-full bg-muted rounded-2xl overflow-hidden shadow-soft group cursor-zoom-in"
            onClick={() => currentImage && setShowImageZoom(true)}
          >
            {currentImage ? (
              <>
                <Image 
                  src={currentImage} 
                  alt={item.title} 
                  fill 
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10 drop-shadow-md" />
                </div>
              </>
            ) : (
              <Package className="h-24 w-24 text-muted-foreground/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            )}
          </div>
          
          {/* Thumbnail Gallery */}
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((_img: string, index: number) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    selectedImageIndex === index 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Image
                    src={getItemImageUrlAt(item, index, { width: 200 })}
                    alt={tt(`รูปที่ ${index + 1}`, `Image ${index + 1}`)}
                    fill
                    className="object-cover"
                    loading="lazy"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className={`space-y-6 ${isModal ? "pt-2" : ""}`}>
          {/* Title and Status */}
          <div className={isModal ? "pr-10" : ""}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className={`${isModal ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"} font-bold text-balance leading-tight`}>{item.title}</h1>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] font-bold px-2 py-0.5 mt-1 ${STATUS_COLORS[item.status]}`}
              >
                {statusLabelByValue[item.status]}
              </Badge>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.description}</p>
          </div>

          {/* Info Card */}
          <Card className="border-border/60 bg-muted/20 shadow-none">
            <CardContent className="p-4 space-y-4">
              <div className={`grid gap-4 ${isModal ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center shrink-0 shadow-sm">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">{tt("หมวดหมู่", "Category")}</span>
                    <p className="font-semibold text-base">{categoryLabelByValue[item.category]}</p>
                  </div>
                </div>
                
                {item.location && (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center shrink-0 shadow-sm">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">{tt("สถานที่นัดรับ", "Pickup location")}</span>
                      <p className="font-semibold text-base wrap-break-word">{item.location}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center shrink-0 shadow-sm">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">{tt("โพสต์โดย", "Posted by")}</span>
                    <p className="font-semibold text-base wrap-break-word">
                      {posterLoading && !item.postedByName ? (
                        <span className="text-muted-foreground">{tt("กำลังโหลด...", "Loading...")}</span>
                      ) : (
                        <Link href={`/profile/${item.postedBy}`} className="hover:text-primary hover:underline transition-colors inline-flex items-center gap-1.5 flex-wrap">
                           <span>{ownerDisplayName}</span>
                           <OwnerRatingBadge rating={ownerRating} className="text-xs" />
                        </Link>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center shrink-0 shadow-sm">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">{tt("โพสต์เมื่อ", "Posted at")}</span>
                    <p className="font-semibold text-base">{postedAtText}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons (ซ่อนในโหมด admin) */}
          {!isAdminMode && user && !isOwner && item.status === "available" && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="flex-1 h-12 text-base font-bold gap-2 rounded-xl shadow-md" 
                onClick={() => setShowRequestDialog(true)} 
                disabled={requesting}
              >
                <HandHeart className="h-5 w-5" />
                {tt("ขอรับสิ่งของนี้", "Request this item")}
              </Button>
              <Button 
                variant="outline" 
                className="h-12 gap-2 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive transition-all" 
                onClick={() => setShowReportModal(true)}
              >
                <AlertTriangle className="h-4 w-4" />
                {tt("รายงาน", "Report")}
              </Button>
              <FavoriteButton item={item} variant="button" className="h-12 w-full sm:w-auto" />
            </div>
          )}

          {/* Unavailable Item Message */}
          {!isAdminMode && user && !isOwner && item.status !== "available" && (
            <div className="p-4 rounded-xl bg-muted/50 border text-center" role="status">
              <p className="text-sm text-muted-foreground mb-3">
                {item.status === "pending" && tt("สิ่งของนี้กำลังอยู่ระหว่างการแลกเปลี่ยน", "This item is currently in exchange.")}
                {item.status === "completed" && tt("สิ่งของนี้ถูกแลกเปลี่ยนแล้ว", "This item has been exchanged.")}
              </p>
              <Button variant="outline" className="gap-2" asChild>
                <Link href="/dashboard">
                  <Package className="h-4 w-4" />
                  {tt("ดูสิ่งของอื่น", "Browse other items")}
                </Link>
              </Button>
            </div>
          )}

          {!isAdminMode && isOwner && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold text-primary">
                {tt("นี่คือสิ่งของของคุณ", "This is your item")}
              </p>
            </div>
          )}

          {!isAdminMode && !user && (
            <Button className="w-full h-12 font-bold rounded-xl" asChild>
              <Link href="/login">{tt("เข้าสู่ระบบเพื่อขอรับสิ่งของ", "Sign in to request this item")}</Link>
            </Button>
          )}

          {/* Admin Toolbar */}
          {isAdminMode && onAdminStatusChange && onAdminDelete && (
            <div className="p-4 border-t bg-muted/20 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={_onClose} className="text-muted-foreground hover:text-foreground">
                {tt("ปิด", "Close")}
              </Button>
              <div className="flex flex-wrap gap-2">
                <ItemAdminEditButton onClick={() => setShowEditModal(true)} disabled={adminProcessing} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAdminStatusChange(item.id, "available")}
                  disabled={adminProcessing || item.status === "available"}
                  className="border-green-200 hover:bg-green-50 text-green-700 dark:border-green-900 dark:hover:bg-green-950/50 dark:text-green-400"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {tt("พร้อมให้", "Available")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAdminStatusChange(item.id, "pending")}
                  disabled={adminProcessing || item.status === "pending"}
                  className="border-blue-200 hover:bg-blue-50 text-blue-700 dark:border-blue-900 dark:hover:bg-blue-950/50 dark:text-blue-400"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {tt("รอดำเนินการ", "Pending")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="shadow-sm"
                  onClick={() => onAdminDelete(item)}
                  disabled={adminProcessing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {tt("ลบโพส", "Delete post")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Zoom Dialog */}
      <ItemImageZoom
        open={showImageZoom}
        onOpenChange={setShowImageZoom}
        imageUrl={currentImage}
        title={item.title}
        currentIndex={selectedImageIndex}
        totalImages={allImages.length}
      />

      {/* Admin Edit Dialog */}
      <ItemAdminEditDialog
        item={item}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onItemUpdated={onAdminItemUpdated}
        categoryLabels={categoryLabelByValue}
      />

      {/* Request Dialog */}
      <UnifiedModal
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        size="md"
        title={tt("ยืนยันการขอรับสิ่งของ", "Confirm item request")}
        description={
          <>
            {tt("คุณต้องการขอรับ ", "Do you want to request ")}
            <span className="font-bold text-foreground">&quot;{item.title}&quot;</span>
            {tt(" ใช่หรือไม่?", "?")}
          </>
        }
        icon={<HandHeart className="h-5 w-5" />}
        footer={
          <UnifiedModalActions
            onCancel={() => setShowRequestDialog(false)}
            onSubmit={handleRequestItem}
            submitText={tt("ยืนยันขอรับสิ่งของ", "Confirm request")}
            loading={requesting}
            submitDisabled={requesting}
          />
        }
      >
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-sm text-muted-foreground flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {tt(
                "ระบบจะเปิดห้องแชทระหว่างคุณกับเจ้าของสิ่งของโดยอัตโนมัติ เพื่อให้คุณสามารถสอบถามรายละเอียดและนัดหมายการรับของได้",
                "A chat room between you and the owner will be opened automatically so you can discuss details and schedule pickup."
              )}
            </span>
          </p>
        </div>
      </UnifiedModal>

      {/* Report Modal */}
      {item && (
        <Suspense fallback={null}>
          <ReportModal
            open={showReportModal}
            onOpenChange={setShowReportModal}
            reportType="item_report"
            targetId={item.id}
            targetTitle={item.title}
          />
        </Suspense>
      )}
    </div>
  )
}
