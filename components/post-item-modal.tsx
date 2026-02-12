"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth-provider"
import { createItem } from "@/lib/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useQueryClient } from "@tanstack/react-query"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"
import { useToast } from "@/hooks/use-toast"
import { useImageUpload } from "@/hooks/use-image-upload"
import type { ItemCategory } from "@/types"
import { X, Loader2, ImagePlus, Package, MapPin } from "lucide-react"
import Image from "next/image"
import { isOnCooldown, getRemainingCooldown, recordAction, loadCooldownFromStorage, formatCooldownTime } from "@/lib/rate-limit"
import { CATEGORY_LABELS, CATEGORY_OPTIONS, LOCATION_OPTIONS } from "@/lib/constants"
import { resolveImageUrl } from "@/lib/cloudinary-url"
import { useI18n } from "@/components/language-provider"

interface PostItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void // Callback when item is successfully posted
}

export function PostItemModal({ open, onOpenChange, onSuccess }: PostItemModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<ItemCategory>("other")
  const [location, setLocation] = useState("")
  const [locationDetail, setLocationDetail] = useState("")
  const [loading, setLoading] = useState(false)
  const [userDisplayName, setUserDisplayName] = useState<string>("")
  const { user } = useAuth()
  const { toast } = useToast()
  const { tt } = useI18n()
  const queryClient = useQueryClient()
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const categoryLabelByValue: Record<ItemCategory, string> = {
    electronics: tt(CATEGORY_LABELS.electronics.th, CATEGORY_LABELS.electronics.en),
    books: tt(CATEGORY_LABELS.books.th, CATEGORY_LABELS.books.en),
    furniture: tt(CATEGORY_LABELS.furniture.th, CATEGORY_LABELS.furniture.en),
    clothing: tt(CATEGORY_LABELS.clothing.th, CATEGORY_LABELS.clothing.en),
    sports: tt(CATEGORY_LABELS.sports.th, CATEGORY_LABELS.sports.en),
    other: tt(CATEGORY_LABELS.other.th, CATEGORY_LABELS.other.en),
  }
  
  // Refs for form fields - used for auto-focus on validation errors
  const titleRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  // Use the shared image upload hook
  const { 
    images, 
    isUploading, 
    handleFileChange: handleImageChange, 
    removeImage, 
    clearImages,
    canAddMore 
  } = useImageUpload({ 
    maxImages: 5, 
    folder: "item" 
  })

  // Load user profile and cooldown from storage on mount
  useEffect(() => {
    if (user) {
      loadCooldownFromStorage('createItem', user.uid)
      setCooldownRemaining(getRemainingCooldown('createItem', user.uid))
      
      // Fetch user's displayName from Firestore
      const fetchUserName = async () => {
        try {
          const { getUserProfile } = await import("@/lib/firestore")
          const profile = await getUserProfile(user.uid)
          if (profile?.displayName) {
            setUserDisplayName(profile.displayName)
          } else {
            setUserDisplayName(user.displayName || user.email?.split("@")[0] || "")
          }
        } catch {
          setUserDisplayName(user.displayName || user.email?.split("@")[0] || "")
        }
      }
      fetchUserName()
    }
  }, [user])

  // Update cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const interval = setInterval(() => {
      const remaining = user ? getRemainingCooldown('createItem', user.uid) : 0
      setCooldownRemaining(remaining)
    }, 1000)
    return () => clearInterval(interval)
  }, [cooldownRemaining, user])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setCategory("other")
    setLocation("")
    setLocationDetail("")
    clearImages()
  }

  const handleClose = () => {
    if (!loading && !isUploading) {
      resetForm()
      onOpenChange(false)
    }
  }

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setErrors({})

    // Validate with Zod
    const { itemSchema } = await import("@/lib/schemas")
    const validationResult = itemSchema.safeParse({
      title,
      description,
      category,
      location,
      locationDetail: locationDetail || undefined,
    })

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {}
      validationResult.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message
      })
      setErrors(fieldErrors)
      
      // Auto-focus on first field with error for better UX
      if (fieldErrors.title) {
        titleRef.current?.focus()
      } else if (fieldErrors.description) {
        descriptionRef.current?.focus()
      }
      
      // Force loading false just in case
      setLoading(false)
      return
    }

    // Check rate limit
    if (isOnCooldown('createItem', user.uid)) {
      const remaining = getRemainingCooldown('createItem', user.uid)
      toast({
        title: tt("รอสักครู่", "Please wait"),
        description: tt(
          `กรุณารอ ${formatCooldownTime(remaining)} ก่อนโพสต์สิ่งของถัดไป`,
          `Please wait ${formatCooldownTime(remaining)} before posting another item.`
        ),
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const result = await createItem({
        title,
        description,
        category,
        location,
        locationDetail: locationDetail.trim() || undefined,
        imagePublicIds: images,
        status: "available",
        postedBy: user.uid,
        postedByEmail: user.email || "",
        postedByName: userDisplayName || user.displayName || user.email?.split("@")[0] || "",
      })

      // Check if the API call was successful
      if (!result.success) {
        throw new Error(result.error || tt("ไม่สามารถโพสต์สิ่งของได้", "Unable to post item"))
      }

      toast({
        title: tt("โพสต์สำเร็จ 🎉", "Posted successfully 🎉"),
        description: tt("สิ่งของของคุณถูกเผยแพร่แล้ว", "Your item is now published."),
      })

      // Record action for rate limiting
      recordAction('createItem', user.uid)
      setCooldownRemaining(getRemainingCooldown('createItem', user.uid))

      // Send LINE notification (async, don't wait)
      try {
        user.getIdToken().then(token => {
          fetch("/api/line/notify-item", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: user.uid,
              itemTitle: title,
              itemId: result.data,
              action: "posted",
            }),
          }).catch((err) => console.log("[LINE] Notify item error:", err))
        })
      } catch (lineError) {
        console.log('[LINE] Notify item error:', lineError)
      }

      resetForm()
      onOpenChange(false)

      // Refresh dashboard items list immediately (react-query cache)
      await queryClient.invalidateQueries({ queryKey: ["items"] })
      
      // Reload items - call onSuccess callback to refresh list
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : tt("ไม่สามารถโพสต์สิ่งของได้", "Unable to post item")
      console.error("[PostItemModal] Error posting item:", error)
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Direct click handler for submit button (since Portal renders outside form)
  const handleButtonClick = () => {
    handleSubmit({ preventDefault: () => {} } as React.FormEvent)
  }

  return (
    <UnifiedModal
      open={open}
      onOpenChange={handleClose}
      size="lg"
      fixedHeight
      maxHeight="90dvh"
      title={tt("โพสต์สิ่งของ", "Post item")}
      icon={<Package className="h-5 w-5" />}
      footer={
        <UnifiedModalActions
          onCancel={handleClose}
          submitText={tt("โพสต์สิ่งของ", "Post item")}
          submitDisabled={loading || !title.trim() || !description.trim() || !location.trim()}
          loading={loading}
          submitButton={
            <Button 
              type="button"
              onClick={handleButtonClick}
              disabled={loading || !title.trim() || !description.trim() || !location.trim()}
              className="flex-1 font-bold h-11 shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tt("กำลังโพสต์...", "Posting...")}
                </>
              ) : (
                tt("โพสต์สิ่งของ", "Post item")
              )}
            </Button>
          }
        />
        }
      >
        <div className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="modal-title" className="text-sm font-medium">
              {tt("ชื่อสิ่งของ", "Item name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              ref={titleRef}
              id="modal-title"
              placeholder={tt("เช่น เสื้อโปโล RMU ไซส์ M", "e.g. RMU polo shirt size M")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
              aria-describedby={errors.title ? "title-error" : undefined}
              className={errors.title ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.title && <p id="title-error" role="alert" className="text-xs text-destructive">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="modal-description" className="text-sm font-medium">
              {tt("รายละเอียด", "Description")} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              ref={descriptionRef}
              id="modal-description"
              placeholder={tt(
                "อธิบายสภาพ ประโยชน์ หรือเหตุผลที่ต้องการแบ่งปัน",
                "Describe condition, usefulness, or why you want to share this item"
              )}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              disabled={loading}
              aria-describedby={errors.description ? "description-error" : undefined}
              className={`resize-none ${errors.description ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            <p className="text-xs text-muted-foreground">
              {tt("รายละเอียดที่ดีจะช่วยเพิ่มโอกาสในการแลกเปลี่ยน", "A clear description improves exchange success.")}
            </p>
            {errors.description && <p id="description-error" role="alert" className="text-xs text-destructive">{errors.description}</p>}
          </div>

          {/* หมวดหมู่ */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {tt("หมวดหมู่", "Category")} <span className="text-destructive">*</span>
            </Label>
            <Select value={category} onValueChange={(value) => setCategory(value as ItemCategory)} disabled={loading}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => {
                  const IconComponent = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <IconComponent className={`h-4 w-4 ${option.color}`} />
                        {categoryLabelByValue[option.value]}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* สถานที่นัดรับ - รูปแบบเดียวกับหน้าแก้ไขสิ่งของในโปรไฟล์ */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {tt("สถานที่นัดรับ", "Pickup location")} <span className="text-destructive">*</span>
            </Label>
            <Select value={location} onValueChange={setLocation} disabled={loading} required>
              <SelectTrigger className={`w-full ${errors.location ? "border-destructive ring-destructive" : ""}`}>
                <SelectValue placeholder={tt("เลือกสถานที่", "Select location")} />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_OPTIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder={tt("รายละเอียดสถานที่ (ไม่บังคับ)", "Location detail (optional)")}
              value={locationDetail}
              onChange={(e) => setLocationDetail(e.target.value.slice(0, 200))}
              maxLength={200}
              className="mt-1"
              disabled={loading}
            />
            {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
          </div>

          {location === "อื่นๆ (ภายในมหาวิทยาลัย)" && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-amber-500 text-[10px] font-bold">!</span>
              </div>
              <p className="text-xs text-amber-500 leading-tight">
                <span className="font-bold block mb-0.5">{tt("คำเตือน", "Warning")}</span>
                {tt("ต้องนัดรับ ", "Pickup must be ")}
                <strong>{tt("ภายในมหาวิทยาลัยเท่านั้น", "on campus only")}</strong>
                {tt(" เพื่อความปลอดภัย", " for safety.")}
              </p>
            </div>
          )}

          {/* Image Upload - Multiple Images */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {tt("รูปภาพ", "Images")} <span className="text-muted-foreground font-normal">({images.length}/5)</span>
            </Label>
            <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{tt("ข้อกำหนดรูปภาพ:", "Image requirements:")}</span>{" "}
              {tt("สูงสุด 5 รูป", "Up to 5 images")} • {tt("รูปแบบ JPEG, PNG เท่านั้น", "JPEG, PNG only")} •{" "}
              {tt("ขนาดไม่เกิน ", "Max size ")}
              <strong>10 MB</strong>
              {tt(" ต่อรูป", " per image")}
            </div>

            {/* Image Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border group">
                    <Image
                      src={resolveImageUrl(img)}
                      alt={tt(`รูปตัวอย่างที่ ${index + 1}`, `Preview image ${index + 1}`)}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                      disabled={loading}
                      aria-label={tt(`ลบรูปภาพที่ ${index + 1}`, `Remove image ${index + 1}`)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                        {tt("หลัก", "Primary")}
                      </span>
                    )}
                  </div>
                ))}
                
                {/* Add More Button */}
                {canAddMore && (
                  <label
                    htmlFor="modal-image"
                    className="aspect-square border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-1"
                  >
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{tt("เพิ่มรูป", "Add image")}</span>
                    <Input 
                      id="modal-image" 
                      type="file" 
                      accept="image/jpeg,image/png" 
                      multiple
                      className="hidden" 
                      onChange={handleImageChange}
                      disabled={loading || isUploading} 
                    />
                  </label>
                )}
              </div>
            )}
            
            {/* Empty State - Upload Area */}
            {images.length === 0 && (
              <label
                htmlFor="modal-image-empty"
                className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all group"
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-2 group-hover:bg-primary/10 transition-colors">
                  <ImagePlus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {tt("คลิกเพื่ออัปโหลดรูปภาพ", "Click to upload images")}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  {tt("สูงสุด 5 รูป, ไม่เกิน 10 MB ต่อรูป (JPEG, PNG เท่านั้น)", "Up to 5 images, max 10 MB each (JPEG, PNG only)")}
                </span>
                <Input 
                  id="modal-image-empty" 
                  type="file" 
                  accept="image/jpeg,image/png" 
                  multiple
                  className="hidden" 
                  onChange={handleImageChange}
                  disabled={loading || isUploading} 
                />
              </label>
            )}
          </div>

        </div>
      </UnifiedModal>
  )
}

