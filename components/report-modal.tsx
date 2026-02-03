"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { useImageUpload } from "@/hooks/use-image-upload"
import Image from "next/image"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Info, X, Plus, AlertTriangle } from "lucide-react"
import { REPORT_REASONS, REPORT_TYPE_LABELS } from "@/lib/constants"

type ReportType = "item_report" | "exchange_report" | "chat_report" | "user_report"

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
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

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
  const isFormValid = reasonCode && confirmed && (!isOtherReason || description.trim())

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

      // Reset form
      setReasonCode("")
      setDescription("")
      clearImages()
      setConfirmed(false)
      setShowConfirmDialog(false)
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

  const handleSubmitClick = () => {
    if (!isFormValid) return
    setShowConfirmDialog(true)
  }

  return (
    <>
      <UnifiedModal
        open={open}
        onOpenChange={onOpenChange}
        size="lg"
        title={REPORT_TYPE_LABELS[reportType] || "รายงาน"}
        description="กรุณาระบุเหตุผลในการรายงาน ข้อมูลของคุณจะถูกเก็บเป็นความลับ"
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
                onClick={handleSubmitClick}
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
          <div className="space-y-6">
            {/* Info Box */}
            <div className="bg-info/10 border border-info/20 rounded-lg p-4 flex gap-3">
              <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
              <div className="text-sm text-foreground">
                <p className="font-medium mb-1">ข้อมูลสำคัญ</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>รายงานจะถูกส่งไปยังทีมงานเพื่อตรวจสอบ</li>
                  <li>การรายงานเท็จอาจถูกดำเนินการ</li>
                  <li>ผลการตรวจสอบจะแจ้งผ่านอีเมล</li>
                </ul>
              </div>
            </div>

            {/* Reason Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                เหตุผลในการรายงาน <span className="text-destructive">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">เลือกเหตุผลที่ตรงกับปัญหาที่พบมากที่สุด</p>
              <RadioGroup value={reasonCode} onValueChange={setReasonCode}>
                <div className="space-y-2">
                  {reasons.map((reason) => (
                    <div key={reason.code} className="flex items-center space-x-2">
                      <RadioGroupItem value={reason.code} id={reason.code} />
                      <Label htmlFor={reason.code} className="font-normal cursor-pointer">
                        {reason.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <Label htmlFor="description" className="text-base font-semibold">
                รายละเอียดเพิ่มเติม {isOtherReason && <span className="text-destructive">*</span>}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isOtherReason
                  ? "กรุณาอธิบายปัญหาที่พบโดยละเอียด"
                  : "ข้อมูลเพิ่มเติมที่จะช่วยให้เราเข้าใจปัญหาได้ดีขึ้น (ไม่บังคับ)"}
              </p>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder="อธิบายรายละเอียดเพิ่มเติม..."
                className="min-h-[100px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/500 ตัวอักษร
              </p>
            </div>

            {/* Evidence Images */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">รูปภาพหลักฐาน (ไม่บังคับ)</Label>
              <p className="text-sm text-muted-foreground">แนบรูปภาพเพื่อประกอบการตรวจสอบ (สูงสุด 5 รูป)</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                    <Image src={image} alt={`Evidence ${index + 1}`} fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {canAddMore && (
                  <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Plus className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-[10px] text-muted-foreground lowercase">เพิ่มรูป</span>
                    <input
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

            {/* Confirmation Checkbox */}
            <div className="flex items-start space-x-2 bg-warning/10 border border-warning/20 rounded-lg p-4">
              <Checkbox id="confirm" checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} />
              <Label htmlFor="confirm" className="text-sm font-normal cursor-pointer leading-relaxed">
                ข้าพเจ้ายืนยันว่าข้อมูลที่ให้ไว้เป็นความจริง และเข้าใจว่าการรายงานเท็จอาจมีผลทางกฎหมาย
              </Label>
            </div>

          </div>
        </UnifiedModal>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการส่งรายงาน</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>คุณกำลังจะส่งรายงาน:</div>
                <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                  <div>
                    <span className="font-medium">ประเภท:</span> {REPORT_TYPE_LABELS[reportType]}
                  </div>
                  <div>
                    <span className="font-medium">เหตุผล:</span> {selectedReason?.label}
                  </div>
                  {description && (
                    <div>
                      <span className="font-medium">รายละเอียด:</span> {description}
                    </div>
                  )}
                  {images.length > 0 && (
                    <div>
                      <span className="font-medium">รูปภาพหลักฐาน:</span> {images.length} รูป
                    </div>
                  )}
                </div>
                <div className="text-muted-foreground">ต้องการดำเนินการต่อหรือไม่?</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังส่ง...
                </>
              ) : (
                "ยืนยันการส่ง"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
