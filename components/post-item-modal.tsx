"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { createItem } from "@/lib/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"
import { useToast } from "@/hooks/use-toast"
import { useImageUpload } from "@/hooks/use-image-upload"
import type { ItemCategory } from "@/types"
import { X, Loader2, ImagePlus, Package } from 'lucide-react'
import Image from "next/image"
import { isOnCooldown, getRemainingCooldown, recordAction, loadCooldownFromStorage, formatCooldownTime } from "@/lib/rate-limit"
import { CATEGORY_OPTIONS, LOCATION_OPTIONS } from "@/lib/constants"

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
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Check rate limit
    if (isOnCooldown('createItem', user.uid)) {
      const remaining = getRemainingCooldown('createItem', user.uid)
      toast({
        title: "รอสักครู่",
        description: `กรุณารอ ${formatCooldownTime(remaining)} ก่อนโพสต์สิ่งของถัดไป`,
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
        locationDetail,
        imageUrl: images[0] || "", // First image for backward compatibility
        imageUrls: images,
        status: "available",
        postedBy: user.uid,
        postedByEmail: user.email || "",
        postedByName: userDisplayName || user.displayName || user.email?.split("@")[0] || "",
      })

      // Check if the API call was successful
      if (!result.success) {
        throw new Error(result.error || "ไม่สามารถโพสต์สิ่งของได้")
      }

      toast({
        title: "โพสต์สำเร็จ 🎉",
        description: "สิ่งของของคุณถูกเผยแพร่แล้ว",
      })

      // Record action for rate limiting
      recordAction('createItem', user.uid)
      setCooldownRemaining(getRemainingCooldown('createItem', user.uid))

      // Send LINE notification (async, don't wait)
      try {
        fetch('/api/line/notify-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            itemTitle: title,
            itemId: result.data,
            action: 'posted'
          })
        }).catch(err => console.log('[LINE] Notify item error:', err))
      } catch (lineError) {
        console.log('[LINE] Notify item error:', lineError)
      }

      resetForm()
      onOpenChange(false)
      
      // Reload items - call onSuccess callback or reload page as fallback
      if (onSuccess) {
        onSuccess()
      } else {
        window.location.reload()
      }
    } catch (error: any) {
      console.error("[PostItemModal] Error posting item:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถโพสต์สิ่งของได้",
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
      title="โพสต์สิ่งของ"
      description="แบ่งปันสิ่งของที่ไม่ใช้แล้วกับเพื่อนนักศึกษา"
      icon={<Package className="h-5 w-5" />}
      footer={
        <UnifiedModalActions
          onCancel={handleClose}
          submitText="โพสต์สิ่งของ"
          submitDisabled={loading || !title.trim() || !description.trim()}
          loading={loading}
          submitButton={
            <Button 
              type="button"
              onClick={handleButtonClick}
              disabled={loading || !title.trim() || !description.trim()}
              className="flex-1 font-bold h-11 shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังโพสต์...
                </>
              ) : (
                "โพสต์สิ่งของ"
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
              ชื่อสิ่งของ <span className="text-destructive">*</span>
            </Label>
            <Input
              id="modal-title"
              placeholder="เช่น เสื้อโปโล RMU ไซส์ M"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="modal-description" className="text-sm font-medium">
              รายละเอียด <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="modal-description"
              placeholder="อธิบายสภาพ ประโยชน์ หรือเหตุผลที่ต้องการแบ่งปัน"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              disabled={loading}
              className="resize-none"
            />
          </div>

          {/* Category and Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                หมวดหมู่ <span className="text-destructive">*</span>
              </Label>
              <Select value={category} onValueChange={(value) => setCategory(value as ItemCategory)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => {
                    const IconComponent = option.icon
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <IconComponent className={`h-4 w-4 ${option.color}`} />
                          {option.label}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">สถานที่ <span className="text-destructive">*</span></Label>
              <Select value={location} onValueChange={setLocation} disabled={loading} required>
                <SelectTrigger>
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

          {/* Location Detail & Warning */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="location-detail" className="text-sm font-medium">
                รายละเอียดสถานที่ (เช่น เลขห้อง, ชั้น, หรือจุดนัดพบ)
              </Label>
              <Input
                id="location-detail"
                placeholder="ระบุรายละเอียดเพิ่มเติม..."
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                disabled={loading}
              />
            </div>

            {location === "อื่นๆ (ระบุในรายละเอียด)" && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-amber-500 text-[10px] font-bold">!</span>
                </div>
                <p className="text-xs text-amber-500 leading-tight">
                  <span className="font-bold block mb-0.5">คำเตือน</span>
                  ต้องกำหนดสถานที่นัดรับ <strong>ภายในโรงเรียน/มหาวิทยาลัยเท่านั้น</strong> เพื่อความปลอดภัยของนักศึกษา
                </p>
              </div>
            )}
          </div>

          {/* Image Upload - Multiple Images */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              รูปภาพ <span className="text-muted-foreground font-normal">({images.length}/5)</span>
            </Label>
            
            {/* Image Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border group">
                    <Image src={img} alt={`Preview ${index + 1}`} fill className="object-cover" unoptimized />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                      disabled={loading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                        หลัก
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
                    <span className="text-[10px] text-muted-foreground">เพิ่มรูป</span>
                    <Input 
                      id="modal-image" 
                      type="file" 
                      accept="image/*" 
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
                  คลิกเพื่ออัปโหลดรูปภาพ
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">เลือกได้สูงสุด 5 รูป (PNG, JPG, GIF)</span>
                <Input 
                  id="modal-image-empty" 
                  type="file" 
                  accept="image/*" 
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

