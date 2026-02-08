"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createExchange, getUserProfile } from "@/lib/firestore"
import type { Item, User, ItemStatus, ItemCategory } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { HandHeart, X, Maximize2, Package, MapPin, Calendar, User as UserIcon, AlertTriangle, Info, CheckCircle2, Clock, Trash2, Pencil } from "lucide-react"
import { formatPostedAt, safeToDate } from "@/lib/utils"
import { getItemImageUrls } from "@/lib/cloudinary-url"
import Image from "next/image"
import Link from "next/link"
import { ReportModal } from "@/components/report-modal"
import { useAccountStatus } from "@/hooks/use-account-status"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, CATEGORY_OPTIONS, LOCATION_OPTIONS } from "@/lib/constants"
import { FavoriteButton } from "@/components/favorite-button"

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
  const [editSaving, setEditSaving] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editCategory, setEditCategory] = useState<ItemCategory>("other")
  const [editLocation, setEditLocation] = useState("")
  const [poster, setPoster] = useState<User | null>(null)
  const [posterLoading, setPosterLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { canExchange } = useAccountStatus()

  // Fetch poster profile only if postedByName is not available (for old items)
  useEffect(() => {
    // If postedByName exists, no need to fetch
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

    // ตรวจสอบสถานะบัญชีก่อนขอแลกเปลี่ยน
    const statusCheck = await canExchange()
    if (!statusCheck.isAllowed) {
      setShowRequestDialog(false)
      return // Toast notification จะแสดงโดย hook อัตโนมัติ
    }

    setRequesting(true)
    try {
      // สร้าง exchange ผ่าน client-side Firestore (มี auth)
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
         throw new Error(response.error || "ไม่สามารถสร้างคำขอได้")
      }
      const exchangeId = response.data

      // สถานะสิ่งของ + การแจ้งเตือนในแอป + LINE ส่งจาก POST /api/exchanges แล้ว

      toast({
        title: "ส่งคำขอสำเร็จ",
        description: "คุณสามารถติดต่อเจ้าของได้ในแชท",
      })

      router.push(`/chat/${exchangeId}`)
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถส่งคำขอได้",
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

  const openEditModal = () => {
    setEditTitle(item.title)
    setEditDescription(item.description || "")
    setEditCategory((item.category as ItemCategory) || "other")
    setEditLocation(item.location || "")
    setShowEditModal(true)
  }

  const handleAdminEditSubmit = async () => {
    if (!item?.id || editSaving) return
    setEditSaving(true)
    try {
      const token = await (async () => {
        const { getAuth } = await import("firebase/auth")
        const auth = getAuth()
        return auth.currentUser?.getIdToken() ?? null
      })()
      if (!token) throw new Error("กรุณาเข้าสู่ระบบใหม่")
      const res = await fetch(`/api/admin/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          category: editCategory,
          location: editLocation.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error?.message || data.error || "แก้ไขไม่สำเร็จ")
      toast({ title: "แก้ไขโพสสำเร็จ เจ้าของจะได้รับการแจ้งเตือน" })
      setShowEditModal(false)
      onAdminItemUpdated?.({ ...item, title: editTitle, description: editDescription, category: editCategory, location: editLocation })
    } catch (e) {
      toast({ title: "แก้ไขไม่สำเร็จ", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setEditSaving(false)
    }
  }

  const allImages = getItemImageUrls(item)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const currentImage = allImages[selectedImageIndex] || null

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
                  unoptimized
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
              {allImages.map((img: string, index: number) => (
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
                  <Image src={img} alt={`รูปที่ ${index + 1}`} fill className="object-cover" unoptimized loading="lazy" />
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
                {STATUS_LABELS[item.status]}
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
                    <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">หมวดหมู่</span>
                    <p className="font-semibold text-base">{CATEGORY_LABELS[item.category]}</p>
                  </div>
                </div>
                
                {item.location && (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center shrink-0 shadow-sm">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">สถานที่นัดรับ</span>
                      <p className="font-semibold text-base wrap-break-word">{item.location}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center shrink-0 shadow-sm">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">โพสต์โดย</span>
                    <p className="font-semibold text-base wrap-break-word">
                      {item.postedByName ? (
                         <Link href={`/profile/${item.postedBy}`} className="hover:text-primary hover:underline transition-colors block">
                           {item.postedByName}
                         </Link>
                      ) : posterLoading ? (
                        <span className="text-muted-foreground">กำลังโหลด...</span>
                      ) : (
                        <Link href={`/profile/${item.postedBy}`} className="hover:text-primary hover:underline transition-colors block">
                           {poster?.displayName || item.postedByEmail.split('@')[0]}
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
                    <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">โพสต์เมื่อ</span>
                    <p className="font-semibold text-base">
                      {formatPostedAt(postedDate)}
                    </p>
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
                ขอรับสิ่งของนี้
              </Button>
              <Button 
                variant="outline" 
                className="h-12 gap-2 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive transition-all" 
                onClick={() => setShowReportModal(true)}
              >
                <AlertTriangle className="h-4 w-4" />
                รายงาน
              </Button>
              <FavoriteButton item={item} variant="button" className="h-12 w-full sm:w-auto" />
            </div>
          )}

          {/* Unavailable Item Message (ซ่อนในโหมด admin) */}
          {!isAdminMode && user && !isOwner && item.status !== "available" && (
            <div className="p-4 rounded-xl bg-muted/50 border text-center" role="status">
              <p className="text-sm text-muted-foreground mb-3">
                {item.status === "pending" && "สิ่งของนี้กำลังอยู่ระหว่างการแลกเปลี่ยน"}
                {item.status === "completed" && "สิ่งของนี้ถูกแลกเปลี่ยนแล้ว"}
              </p>
              <Button variant="outline" className="gap-2" asChild>
                <Link href="/dashboard">
                  <Package className="h-4 w-4" />
                  ดูสิ่งของอื่น
                </Link>
              </Button>
            </div>
          )}

          {!isAdminMode && isOwner && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold text-primary">
                นี่คือสิ่งของของคุณ
              </p>
            </div>
          )}

          {!isAdminMode && !user && (
            <Button className="w-full h-12 font-bold rounded-xl" asChild>
              <Link href="/login">เข้าสู่ระบบเพื่อขอรับสิ่งของ</Link>
            </Button>
          )}

          {/* แถบจัดการ Admin */}
          {isAdminMode && onAdminStatusChange && onAdminDelete && (
            <div className="p-4 border-t bg-muted/20 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={_onClose} className="text-muted-foreground hover:text-foreground">
                ปิด
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={openEditModal} disabled={adminProcessing} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  แก้ไข
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAdminStatusChange(item.id, "available")}
                  disabled={adminProcessing || item.status === "available"}
                  className="border-green-200 hover:bg-green-50 text-green-700 dark:border-green-900 dark:hover:bg-green-950/50 dark:text-green-400"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  พร้อมให้
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAdminStatusChange(item.id, "pending")}
                  disabled={adminProcessing || item.status === "pending"}
                  className="border-blue-200 hover:bg-blue-50 text-blue-700 dark:border-blue-900 dark:hover:bg-blue-950/50 dark:text-blue-400"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  รอดำเนินการ
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="shadow-sm"
                  onClick={() => onAdminDelete(item)}
                  disabled={adminProcessing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  ลบโพส
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Zoom Dialog */}
      <Dialog open={showImageZoom} onOpenChange={setShowImageZoom}>
        <DialogContent className="max-w-[95vw] w-fit p-0 bg-transparent border-none shadow-none flex items-center justify-center" showCloseButton={false}>
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          <div className="relative group">
            {currentImage && (
              <div className="relative max-h-[90vh] max-w-full overflow-hidden rounded-2xl shadow-2xl bg-black/50 backdrop-blur-sm p-1">
                <Image 
                  src={currentImage} 
                  alt={item.title} 
                  width={1200} 
                  height={1200} 
                  className="object-contain max-h-[85vh] w-auto h-auto rounded-xl"
                  unoptimized
                />
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="absolute top-4 right-4 rounded-full h-10 w-10 shadow-lg border border-white/20 bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
                  onClick={() => setShowImageZoom(false)}
                >
                  <X className="h-6 w-6" />
                </Button>
                {/* Image counter */}
                {allImages.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                    {selectedImageIndex + 1} / {allImages.length}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Edit Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 space-y-1 border-b bg-muted/30">
            <DialogTitle className="text-xl font-bold">แก้ไขโพส (ผู้ดูแล)</DialogTitle>
            <DialogDescription asChild>
              <p className="text-sm text-muted-foreground flex items-center gap-2 pt-1">
                <Info className="h-4 w-4 shrink-0 text-primary" />
                เจ้าของโพสจะได้รับการแจ้งเตือนทั้งในเว็บและ LINE
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 px-6 py-5">
            <div className="grid gap-2">
              <Label htmlFor="edit-title" className="text-sm font-medium text-foreground">
                ชื่อสิ่งของ
              </Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="ชื่อสิ่งของ"
                minLength={3}
                maxLength={100}
                className="h-10 border-2 bg-background focus-visible:ring-2"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description" className="text-sm font-medium text-foreground">
                รายละเอียด
              </Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="อธิบายสิ่งของ"
                rows={4}
                minLength={10}
                maxLength={1000}
                className="min-h-[100px] border-2 bg-background focus-visible:ring-2 resize-y"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-foreground">หมวดหมู่</Label>
              <Select value={editCategory} onValueChange={(v) => setEditCategory(v as ItemCategory)}>
                <SelectTrigger className="h-10 border-2 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-foreground">สถานที่นัดรับ</Label>
              <Select value={editLocation || ""} onValueChange={setEditLocation}>
                <SelectTrigger className="h-10 border-2 bg-background">
                  <SelectValue placeholder="เลือกสถานที่" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/20 gap-3 sm:gap-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={editSaving} className="min-w-[100px]">
              ยกเลิก
            </Button>
            <Button
              onClick={handleAdminEditSubmit}
              disabled={editSaving || editTitle.trim().length < 3 || editDescription.trim().length < 10 || !editLocation.trim()}
              className="min-w-[120px]"
            >
              {editSaving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Dialog - Refactored to UnifiedModal */}
      <UnifiedModal
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        size="md"
        title="ยืนยันการขอรับสิ่งของ"
        description={<>คุณต้องการขอรับ <span className="font-bold text-foreground">&quot;{item.title}&quot;</span> ใช่หรือไม่?</>}
        icon={<HandHeart className="h-5 w-5" />}
        footer={
          <UnifiedModalActions
            onCancel={() => setShowRequestDialog(false)}
            onSubmit={handleRequestItem}
            submitText="ยืนยันขอรับสิ่งของ"
            loading={requesting}
            submitDisabled={requesting}
          />
        }
      >
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-sm text-muted-foreground flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              ระบบจะเปิดห้องแชทระหว่างคุณกับเจ้าของสิ่งของโดยอัตโนมัติ เพื่อให้คุณสามารถสอบถามรายละเอียดและนัดหมายการรับของได้
            </span>
          </p>
        </div>
      </UnifiedModal>

      {/* Report Modal */}
      {item && (
        <ReportModal
          open={showReportModal}
          onOpenChange={setShowReportModal}
          reportType="item_report"
          targetId={item.id}
          targetTitle={item.title}
        />
      )}
    </div>
  )

}
