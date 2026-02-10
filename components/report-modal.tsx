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
import { REPORT_REASONS } from "@/lib/constants"
import { resolveImageUrl } from "@/lib/cloudinary-url"
import { useI18n } from "@/components/language-provider"

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
  const { tt } = useI18n()
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

  const reasonLabelMap: Record<string, string> = {
    item_fake_info: tt("ข้อมูลสิ่งของไม่ถูกต้องหรือเท็จ", "False or inaccurate item information"),
    item_inappropriate: tt("เนื้อหาไม่เหมาะสม", "Inappropriate content"),
    item_spam: tt("สแปมโพส", "Spam post"),
    item_illegal: tt("สิ่งของผิดกฎหมาย", "Illegal item"),
    exchange_no_show: tt("ไม่มาตามนัด", "No-show"),
    exchange_wrong_item: tt("สิ่งของไม่ตรงตามที่ตกลง", "Wrong item compared to agreement"),
    exchange_unsafe: tt("พฤติกรรมไม่เหมาะสม", "Unsafe or inappropriate behavior"),
    user_inappropriate: tt("พฤติกรรมไม่เหมาะสม", "Inappropriate behavior"),
    user_spam: tt("สแปมข้อความ", "Spam messages"),
    other: tt("อื่นๆ (โปรดระบุ)", "Other (please specify)"),
  }
  const reasons = (REPORT_REASONS[reportType] || []).map((r) => ({
    ...r,
    label: reasonLabelMap[r.code] || r.label,
  }))
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
        title: tt("ส่งรายงานสำเร็จ", "Report submitted"),
        description: tt("ขอบคุณสำหรับการรายงาน ทีมงานจะตรวจสอบโดยเร็วที่สุด", "Thanks for your report. Our team will review it soon."),
      })

      setReasonCode("")
      setDescription("")
      clearImages()
      onOpenChange(false)
    } catch (error: unknown) {
      console.error("[Report] Error creating report:", error)
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: error instanceof Error ? error.message : tt("ไม่สามารถส่งรายงานได้", "Unable to submit report"),
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
      title={
        reportType === "item_report"
          ? tt("รายงานสิ่งของ", "Item report")
          : reportType === "exchange_report"
            ? tt("รายงานการแลกเปลี่ยน", "Exchange report")
            : tt("รายงานผู้ใช้", "User report")
      }
      description={tt("ข้อมูลของคุณจะถูกเก็บเป็นความลับ", "Your report will be handled confidentially.")}
      icon={<AlertTriangle className="h-5 w-5" />}
      footer={
        <UnifiedModalActions
          onCancel={() => onOpenChange(false)}
          submitText={tt("ส่งรายงาน", "Submit report")}
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
                  {tt("กำลังส่ง...", "Submitting...")}
                </>
              ) : (
                tt("ส่งรายงาน", "Submit report")
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
              {tt("เหตุผลในการรายงาน", "Reason")} <span className="text-destructive">*</span>
            </Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder={tt("เลือกเหตุผลที่ตรงกับปัญหาที่พบ", "Select a reason that matches the issue")} />
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
              {tt("รายละเอียดเพิ่มเติม", "Additional details")} {isOtherReason && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder={isOtherReason ? tt("อธิบายปัญหาที่พบ...", "Describe the issue...") : tt("ไม่บังคับ", "Optional")}
              className="min-h-[72px] resize-none text-sm"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right tabular-nums">
              {tt(`${description.length}/500`, `${description.length}/500`)}
            </p>
          </div>

          {/* รูปหลักฐาน - รูปแบบเดียวกับตอนโพส */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {tt("รูปภาพ", "Images")} <span className="text-muted-foreground font-normal">({images.length}/5)</span>
            </Label>
            <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{tt("ข้อกำหนดรูปภาพ:", "Image requirements:")}</span>{" "}
              {tt("สูงสุด 5 รูป", "Up to 5 images")} • {tt("รูปแบบ JPEG, PNG เท่านั้น", "JPEG, PNG only")} • {tt("ขนาดไม่เกิน ", "Max size ")}
              <strong>10 MB</strong>
              {tt(" ต่อรูป", " per image")}
            </div>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border group">
                  <Image
                    src={resolveImageUrl(img)}
                    alt={tt(`รูปหลักฐานที่ ${index + 1}`, `Evidence image ${index + 1}`)}
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
                </div>
              ))}
              {canAddMore && (
                <label
                  htmlFor="report-modal-image"
                  className="aspect-square border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-1"
                >
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{tt("เพิ่มรูป", "Add image")}</span>
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
                {tt("คลิกเพื่ออัปโหลดรูปภาพ", "Click to upload images")}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">
                {tt("สูงสุด 5 รูป, ไม่เกิน 10 MB ต่อรูป (JPEG, PNG เท่านั้น)", "Up to 5 images, max 10 MB each (JPEG, PNG only)")}
              </span>
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
