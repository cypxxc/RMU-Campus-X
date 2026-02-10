"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
import { Exchange } from "@/types"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"
import { useI18n } from "@/components/language-provider"

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
  isRequester: _isRequester, 
}: CancelExchangeDialogProps) {
  const { tt } = useI18n()
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
    return true // ทุกกรณีต้องระบุเหตุผล เพื่อให้เจ้าของสิ่งของทราบ
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
  const itemLabel = exchange?.itemTitle?.trim()
    ? (exchange.itemTitle.length > 36 ? exchange.itemTitle.slice(0, 36) + "…" : exchange.itemTitle)
    : tt("รายการนี้", "this item")

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={tt("ยืนยันการยกเลิก", "Confirm cancellation")}
      description={tt(`ยกเลิกการแลกเปลี่ยน "${itemLabel}" ใช่หรือไม่?`, `Cancel exchange "${itemLabel}"?`)}
      footer={
        <UnifiedModalActions
          onCancel={() => onOpenChange(false)}
          onSubmit={handleConfirm}
          cancelVariant="outline"
          submitText={processing ? tt("กำลังพิจารณา...", "Processing...") : tt("ยืนยันยกเลิก", "Confirm cancellation")}
          submitVariant="destructive"
          submitDisabled={processing || (isRequired && !reason.trim())}
          loading={processing}
        />
      }
    >
      {isRequired && (
        <div className="space-y-3">
          <Label htmlFor="cancel-reason" className="text-sm font-semibold">
            {tt("เหตุผลการยกเลิก", "Cancellation reason")} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="cancel-reason"
            placeholder={tt("กรุณาระบุเหตุผลการยกเลิก...", "Please provide a reason...")}
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 300))}
            rows={4}
            className="resize-none"
          />
          <p className="text-[11px] text-muted-foreground text-right">{reason.length}/300</p>
        </div>
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
  const { tt } = useI18n()

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={tt("ซ่อนแชทจากรายการ", "Hide chat from list")}
      description={tt(
        `แชทจะหายจากรายการของคุณ แต่อีกฝ่ายยังเห็นประวัติแชทได้ ยืนยันซ่อน "${exchange?.itemTitle}" ใช่หรือไม่?`,
        `This chat will be hidden from your list while still visible to the other party. Hide "${exchange?.itemTitle}"?`
      )}
      icon={<Trash2 className="h-5 w-5" />}
      headerClassName="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20"
      footer={
        <UnifiedModalActions
          onCancel={() => onOpenChange(false)}
          onSubmit={onConfirm}
          submitText={deleting ? tt("กำลังซ่อน...", "Hiding...") : tt("ยืนยันซ่อน", "Confirm hide")}
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
          {tt("การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลแชททั้งหมดจะถูกลบถาวร", "This action cannot be undone. Chat data will be permanently removed.")}
        </div>
      </div>
    </UnifiedModal>
  )
}
