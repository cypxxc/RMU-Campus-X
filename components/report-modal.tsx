"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { useImageUpload } from "@/hooks/use-image-upload"
import Image from "next/image"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2, X, ImagePlus, AlertTriangle } from "lucide-react"
import { REPORT_REASONS, REPORT_TYPE_LABELS } from "@/lib/constants"

type ReportType = "item_report" | "exchange_report" | "user_report"

interface ReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportType: ReportType
  targetId: string
  targetTitle?: string
}

export function ReportModal({ open, onOpenChange, reportType, targetId, targetTitle }: ReportModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [reasonCode, setReasonCode] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  // Use the shared image upload hook
  const { 
    images, 
    isUploading, 
    handleFileChange: handleImageUpload, 
    removeImage, 
    clearImages,
    canAddMore 
  } = useImageUpload({ 
    maxImages: 5, 
    folder: "item" 
  })

  const reasons = REPORT_REASONS[reportType] || []
  const selectedReason = reasons.find((r) => r.code === reasonCode)
  const isOtherReason = reasonCode === "other"
  const isFormValid = reasonCode && (!isOtherReason || description.trim())

  const handleConfirmSubmit = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Import the service dynamically or at the top level (better to dynamic here if we want to keep chunk size small, but top level is cleaner)
      // Since we extracted it to a separate file, we can import it at top level, but for now let's use dynamic import
      // to keep the main bundle light if this modal is lazy loaded
      const { submitReport } = await import("@/lib/services/report-service")
      
      await submitReport({
        reportType,
        targetId,
        targetTitle,
        reasonCode,
        reasonLabel: selectedReason?.label || "",
        description,
        reporterId: user.uid,
        reporterEmail: user.email || "",
        images
      })

      toast({
        title: "ส่งรายงานสำเร็จ",
        description: "ขอบคุณสำหรับการรายงาน ทีมงานจะตรวจสอบโดยเร็วที่สุด",
      })

      setReasonCode("")
      setDescription("")
      clearImages()
      onOpenChange(false)
    } catch (error: any) {
      console.error("[Report] Error creating report:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถส่งรายงานได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (!isFormValid || loading) return
    handleConfirmSubmit()
  }

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={REPORT_TYPE_LABELS[reportType] || "รายงาน"}
      description="ข้อมูลของคุณจะถูกเก็บเป็นความลับ"
      icon={<AlertTriangle className="h-5 w-5" />}
      footer={
        <UnifiedModalActions
          onCancel={() => onOpenChange(false)}
          submitText="ส่งรายงาน"
          submitDisabled={!isFormValid || loading}
          loading={loading}
          submitButton={
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
              className="flex-1 font-bold h-11 shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังส่ง...
                </>
              ) : (
                "ส่งรายงาน"
              )}
            </Button>
          }
        />
      }
    >
      <div className="space-y-5">
        {/* เหตุผล - ใช้ Select แทน radio ลดความรก */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            เหตุผลในการรายงาน <span className="text-destructive">*</span>
          </Label>
          <Select value={reasonCode} onValueChange={setReasonCode}>
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="เลือกเหตุผลที่ตรงกับปัญหาที่พบ" />
            </SelectTrigger>
            <SelectContent>
              {reasons.map((reason) => (
                <SelectItem key={reason.code} value={reason.code}>
                  {reason.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* รายละเอียดเพิ่มเติม */}
        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-sm font-medium text-muted-foreground">
            รายละเอียดเพิ่มเติม {isOtherReason && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder={isOtherReason ? "อธิบายปัญหาที่พบ..." : "ไม่บังคับ"}
            className="min-h-[72px] resize-none text-sm"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right tabular-nums">{description.length}/500</p>
        </div>

        {/* รูปหลักฐาน - รูปแบบเดียวกับตอนโพส */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            รูปภาพ <span className="text-muted-foreground font-normal">({images.length}/5)</span>
          </Label>
          <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">ข้อกำหนดรูปภาพ:</span> สูงสุด 5 รูป • รูปแบบ JPEG, PNG เท่านั้น • ขนาดไม่เกิน <strong>10 MB</strong> ต่อรูป
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border group">
                  <Image src={img} alt={`รูปหลักฐานที่ ${index + 1}`} fill className="object-cover" unoptimized />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                    disabled={loading}
                    aria-label={`ลบรูปภาพที่ ${index + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {canAddMore && (
                <label
                  htmlFor="report-modal-image"
                  className="aspect-square border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-1"
                >
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">เพิ่มรูป</span>
                  <Input
                    id="report-modal-image"
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={loading || isUploading}
                  />
                </label>
              )}
            </div>
          )}

          {images.length === 0 && (
            <label
              htmlFor="report-modal-image-empty"
              className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all group"
            >
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-2 group-hover:bg-primary/10 transition-colors">
                <ImagePlus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                คลิกเพื่ออัปโหลดรูปภาพ
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">สูงสุด 5 รูป, ไม่เกิน 10 MB ต่อรูป (JPEG, PNG เท่านั้น)</span>
              <Input
                id="report-modal-image-empty"
                type="file"
                accept="image/jpeg,image/png"
                multiple
                className="hidden"
                onChange={handleImageUpload}
                disabled={loading || isUploading}
              />
            </label>
          )}
        </div>
      </div>
    </UnifiedModal>
  )
}
