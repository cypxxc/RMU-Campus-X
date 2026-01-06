"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { XCircle, Trash2 } from "lucide-react"
import { Exchange } from "@/types"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"

interface CancelExchangeDialogProps {
  exchange: Exchange | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => Promise<void>
  isRequester: boolean
}

export function CancelExchangeDialog({ 
  exchange, 
  open, 
  onOpenChange, 
  onConfirm, 
  isRequester 
}: CancelExchangeDialogProps) {
  const [reason, setReason] = useState("")
  const [processing, setProcessing] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setReason("")
      setProcessing(false)
    }
  }, [open])

  const requiresReason = () => {
    if (!exchange) return false
    if (!isRequester) return true // Owner always needs reason
    return ["accepted", "in_progress"].includes(exchange.status)
  }

  const handleConfirm = async () => {
    if (requiresReason() && !reason.trim()) return

    setProcessing(true)
    try {
      await onConfirm(reason)
      onOpenChange(false)
    } finally {
      setProcessing(false)
    }
  }

  const isRequired = requiresReason()

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="ยืนยันการยกเลิก"
      description={`คุณต้องการยกเลิกการแลกเปลี่ยน "${exchange?.itemTitle}" ใช่หรือไม่?`}
      icon={<XCircle className="h-5 w-5" />}
      headerClassName="border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20"
      footer={
        <UnifiedModalActions
          onCancel={() => onOpenChange(false)}
          onSubmit={handleConfirm}
          submitText={processing ? "กำลังพิจารณา..." : "ยืนยันยกเลิก"}
          submitVariant="destructive"
          submitDisabled={processing || (isRequired && !reason.trim())}
          loading={processing}
        />
      }
    >
      {isRequired && (
        <div className="space-y-3">
          <Label htmlFor="cancel-reason" className="text-sm font-semibold">
            เหตุผลการยกเลิก <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="cancel-reason"
            placeholder="กรุณาระบุเหตุผลการยกเลิก..."
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 300))}
            rows={4}
            className="resize-none"
          />
          <p className="text-[11px] text-muted-foreground text-right">{reason.length}/300</p>
        </div>
      )}
      {!isRequired && (
        <p className="text-sm text-muted-foreground">
          คุณสามารถยกเลิกการแลกเปลี่ยนนี้ได้เนื่องจากยังอยู่ในสถานะรอดำเนินการ
        </p>
      )}
    </UnifiedModal>
  )
}

interface DeleteExchangeDialogProps {
  exchange: Exchange | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  deleting: boolean
}

export function DeleteExchangeDialog({
  exchange,
  open,
  onOpenChange,
  onConfirm,
  deleting
}: DeleteExchangeDialogProps) {
  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="ยืนยันการลบแชท"
      description={`คุณต้องการลบแชทการแลกเปลี่ยน "${exchange?.itemTitle}" ใช่หรือไม่?`}
      icon={<Trash2 className="h-5 w-5" />}
      headerClassName="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20"
      footer={
        <UnifiedModalActions
          onCancel={() => onOpenChange(false)}
          onSubmit={onConfirm}
          submitText={deleting ? "กำลังลบ..." : "ยืนยันลบ"}
          submitVariant="destructive"
          submitDisabled={deleting}
          loading={deleting}
        />
      }
    >
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-3">
        <div className="bg-destructive/10 p-2 rounded-full shrink-0">
          <Trash2 className="h-4 w-4 text-destructive" />
        </div>
        <div className="text-sm text-destructive font-medium">
          การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลแชททั้งหมดจะถูกลบถาวร
        </div>
      </div>
    </UnifiedModal>
  )
}
