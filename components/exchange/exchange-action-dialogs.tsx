"use client"

import { useState, useEffect } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { XCircle, Trash2 } from "lucide-react"
import { Exchange } from "@/types"

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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                คุณต้องการยกเลิกการแลกเปลี่ยน "{exchange?.itemTitle}" ใช่หรือไม่?
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        {isRequired && (
          <div className="space-y-2">
            <Label htmlFor="cancel-reason" className="text-sm font-medium">
              เหตุผลการยกเลิก <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="กรุณาระบุเหตุผลการยกเลิก..."
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              rows={3}
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground text-right">{reason.length}/300</p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={processing}>ไม่ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={processing || (isRequired && !reason.trim())}
            className="bg-destructive hover:bg-destructive/90"
          >
            {processing ? "กำลังพิจารณา..." : "ยืนยันยกเลิก"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <AlertDialogTitle>ยืนยันการลบแชท</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                คุณต้องการลบแชทการแลกเปลี่ยน "{exchange?.itemTitle}" ใช่หรือไม่?
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
          ⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }} 
            disabled={deleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleting ? "กำลังลบ..." : "ยืนยันลบ"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
