"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createExchange, updateItem, createNotification, getUserProfile } from "@/lib/firestore"
import type { Item, User } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Package, MapPin, Calendar, User as UserIcon, Loader2, AlertTriangle, HandHeart, X, Maximize2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import Image from "next/image"
import Link from "next/link"
import { ReportModal } from "@/components/report-modal"
import { useAccountStatus } from "@/hooks/use-account-status"

interface ItemDetailViewProps {
  item: Item
  isModal?: boolean
  onClose?: () => void
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

export function ItemDetailView({ item, isModal = false, onClose: _onClose }: ItemDetailViewProps) {
  const [requesting, setRequesting] = useState(false)
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showImageZoom, setShowImageZoom] = useState(false)
  const [poster, setPoster] = useState<User | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { canExchange } = useAccountStatus()

  // Fetch poster profile
  useEffect(() => {
    const loadPoster = async () => {
      if (item.postedBy) {
        try {
          const profile = await getUserProfile(item.postedBy)
          if (profile) setPoster(profile)
        } catch (err) {
          console.error("Failed to load poster profile:", err)
        }
      }
    }
    loadPoster()
  }, [item.postedBy])

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
      const exchangeId = await createExchange({
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

      await updateItem(item.id, { status: "pending" })
      
      await createNotification({
        userId: item.postedBy,
        title: "มีผู้ขอรับสิ่งของของคุณ",
        message: `คุณมีผู้ขอรับสิ่งของ: ${item.title}`,
        type: "exchange",
        relatedId: exchangeId,
        senderId: user.uid,
      })

      // ส่ง LINE notification แยกทาง API (ไม่ต้อง auth)
      try {
        await fetch("/api/line/notify-exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerId: item.postedBy,
            itemTitle: item.title,
            requesterName: user.displayName || user.email?.split("@")[0] || "ผู้ใช้",
            exchangeId,
          }),
        })
      } catch (lineError) {
        console.error("LINE notification error:", lineError)
        // ไม่ต้อง fail ถ้า LINE ส่งไม่ได้
      }

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

  const postedDate = item.postedAt?.toDate?.() || new Date()
  const isOwner = user?.uid === item.postedBy

  // Get images array (new format) or fallback to single imageUrl (old format)
  const allImages = item.imageUrls?.length ? item.imageUrls : (item.imageUrl ? [item.imageUrl] : [])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const currentImage = allImages[selectedImageIndex] || null

  return (
    <div className={`w-full ${isModal ? "" : "container mx-auto px-4 py-6 sm:py-8 max-w-5xl"}`}>
      <div className={`grid grid-cols-1 ${isModal ? "md:grid-cols-2 gap-6" : "lg:grid-cols-2 gap-6 lg:gap-8"} animate-fade-in`}>
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
                  <Image src={img} alt={`รูปที่ ${index + 1}`} fill className="object-cover" unoptimized />
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
                className={`shrink-0 text-[10px] font-bold px-2 py-0.5 mt-1 ${statusColors[item.status]}`}
              >
                {statusLabels[item.status]}
              </Badge>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.description}</p>
          </div>

          {/* Info Card */}
          <Card className="border-border/60 bg-muted/20 shadow-none">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-9 w-9 rounded-xl bg-background border flex items-center justify-center shrink-0 shadow-sm">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">หมวดหมู่</span>
                    <p className="font-semibold">{categoryLabels[item.category]}</p>
                  </div>
                </div>
                
                {item.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-9 w-9 rounded-xl bg-background border flex items-center justify-center shrink-0 shadow-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">สถานที่</span>
                      <p className="font-semibold truncate max-w-[150px]">{item.location}</p>
                      {item.locationDetail && (
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 max-w-[150px] line-clamp-1 italic">
                          {item.locationDetail}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-9 w-9 rounded-xl bg-background border flex items-center justify-center shrink-0 shadow-sm">
                    <UserIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">โพสต์โดย</span>
                    <p className="font-semibold truncate max-w-[150px]">
                      {poster?.displayName || item.postedByEmail.split('@')[0]}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-9 w-9 rounded-xl bg-background border flex items-center justify-center shrink-0 shadow-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">โพสต์เมื่อ</span>
                    <p className="font-semibold">
                      {formatDistanceToNow(postedDate, { addSuffix: true, locale: th })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {user && !isOwner && item.status === "available" && (
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
            </div>
          )}

          {isOwner && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold text-primary">
                นี่คือสิ่งของของคุณ
              </p>
            </div>
          )}

          {!user && (
            <Button className="w-full h-12 font-bold rounded-xl" asChild>
              <Link href="/login">เข้าสู่ระบบเพื่อขอรับสิ่งของ</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Image Zoom Dialog */}
      <Dialog open={showImageZoom} onOpenChange={setShowImageZoom}>
        <DialogContent className="max-w-[95vw] w-fit p-0 bg-transparent border-none shadow-none flex items-center justify-center">
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

      {/* Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <HandHeart className="text-primary h-6 w-6" />
              ยืนยันการขอรับสิ่งของ
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              คุณต้องการขอรับ <span className="font-bold text-foreground">"{item.title}"</span> ใช่หรือไม่? 
              <br />
              ระบบจะเปิดแชทให้คุณติดต่อกับเจ้าของได้ทันทีเพื่อตกลงวันเวลาในการรับของ
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-1 pt-4">
            <Button variant="ghost" className="font-bold" onClick={() => setShowRequestDialog(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleRequestItem} disabled={requesting} className="gap-2 font-bold px-8">
              {requesting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังดำเนินการ...
                </>
              ) : (
                "ยืนยันขอรับสิ่งของ"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
