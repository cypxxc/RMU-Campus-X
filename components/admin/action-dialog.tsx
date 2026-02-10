"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, Ban, ShieldAlert, CheckCircle2, BellOff, User as UserIcon } from "lucide-react"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"
import { useI18n } from "@/components/language-provider"

export type SuspendDuration = { value: number; unit: "minute" | "hour" | "day" }

export interface UserWithReports {
  uid: string
  email: string
  warningCount?: number
  reportsReceived: number
}

interface ActionDialogProps {
  open: boolean
  type: 'warn' | 'suspend' | 'ban' | 'activate' | 'delete' | 'clearNotifications' | null
  user: UserWithReports | null
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string, suspendDuration?: SuspendDuration) => Promise<void>
}

export function ActionDialog({ open, type, user, onOpenChange, onConfirm }: ActionDialogProps) {
  const [reason, setReason] = useState("")
  const [durationValue, setDurationValue] = useState("7")
  const [durationUnit, setDurationUnit] = useState<"minute" | "hour" | "day">("day")
  const [processing, setProcessing] = useState(false)
  const { tt } = useI18n()

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setReason("")
      setDurationValue("7")
      setDurationUnit("day")
      setProcessing(false)
    }
  }, [open])

  const handleDurationChange = (value: string, unit?: "minute" | "hour" | "day") => {
    setDurationValue(value)
    if (unit !== undefined) setDurationUnit(unit)
  }

  const suspendDurationValid =
    type !== "suspend" ||
    (durationValue.trim() !== "" &&
      !Number.isNaN(Number(durationValue)) &&
      Number(durationValue) > 0)

  const handleConfirm = async () => {
    if (!reason.trim()) return
    if (type === "suspend" && !suspendDurationValid) return

    let suspendDuration: SuspendDuration | undefined
    if (type === "suspend") {
      const val = Math.floor(Number(durationValue))
      if (val <= 0) return
      suspendDuration = { value: val, unit: durationUnit }
    }

    setProcessing(true)
    try {
      await onConfirm(reason, suspendDuration)
    } finally {
      setProcessing(false)
    }
  }

  if (!type) return null

  // Configuration map for different action types (minimal UI: title + icon only)
  const config = {
    warn: {
      title: tt("ออกคำเตือนผู้ใช้", "Issue warning"),
      icon: <AlertTriangle className="h-5 w-5" />,
      headerClass: "bg-yellow-50/80 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/50",
      submitText: tt("ออกคำเตือน", "Issue warning"),
      submitVariant: "default" as const,
    },
    suspend: {
      title: tt("ระงับการใช้งานชั่วคราว", "Temporary suspension"),
      icon: <ShieldAlert className="h-5 w-5" />,
      headerClass: "bg-orange-50/80 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50",
      submitText: tt("ระงับผู้ใช้", "Suspend user"),
      submitVariant: "destructive" as const,
    },
    ban: {
      title: tt("แบนผู้ใช้ถาวร", "Ban user permanently"),
      icon: <Ban className="h-5 w-5" />,
      headerClass: "bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-900/50",
      submitText: tt("แบนถาวร", "Ban permanently"),
      submitVariant: "destructive" as const,
    },
    delete: {
      title: tt("ลบข้อมูลผู้ใช้ถาวร", "Delete user data permanently"),
      icon: <Ban className="h-5 w-5" />,
      headerClass: "bg-red-100/80 dark:bg-red-950/50 border-red-300 dark:border-red-900/80",
      submitText: tt("ยืนยันลบ", "Confirm delete"),
      submitVariant: "destructive" as const,
    },
    activate: {
      title: tt("ปลดล็อคบัญชี", "Reactivate account"),
      icon: <CheckCircle2 className="h-5 w-5" />,
      headerClass: "bg-green-50/80 dark:bg-green-950/30 border-green-200 dark:border-green-900/50",
      submitText: tt("ปลดล็อค", "Reactivate"),
      submitVariant: "default" as const,
    },
    clearNotifications: {
      title: tt("ลบการแจ้งเตือนผู้ใช้", "Delete user notifications"),
      icon: <BellOff className="h-5 w-5" />,
      headerClass: "bg-slate-50/80 dark:bg-slate-950/30 border-slate-200 dark:border-slate-900/50",
      submitText: tt("ลบการแจ้งเตือน", "Delete notifications"),
      submitVariant: "destructive" as const,
    },
  }

  const currentConfig = config[type]

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={currentConfig.title}
      icon={currentConfig.icon}
      headerClassName={currentConfig.headerClass}
      footer={
        <UnifiedModalActions
          onCancel={() => onOpenChange(false)}
          onSubmit={handleConfirm}
          submitText={currentConfig.submitText}
          submitVariant={currentConfig.submitVariant}
          submitDisabled={processing || !reason.trim() || (type === "suspend" && !suspendDurationValid)}
          loading={processing}
        />
      }
    >
      <div className="space-y-4">
        {/* User: email only */}
        {user && (
          <div className="flex items-center gap-2 text-sm">
            <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{tt("อีเมล", "Email")}</span>
            <span className="font-medium text-foreground truncate">{user.email}</span>
          </div>
        )}

        {/* Reason (required) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {tt("เหตุผล", "Reason")} <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            placeholder={
              type === 'clearNotifications'
                ? tt("ระบุเหตุผลในการลบการแจ้งเตือน", "Provide reason for deleting notifications")
                : tt("ระบุเหตุผล", "Provide reason")
            }
            rows={3}
            className="resize-none text-sm"
          />
          <p className={`text-right text-xs tabular-nums ${
            reason.length > 450 ? 'text-destructive font-medium' : 'text-muted-foreground'
          }`}>
            {reason.length}/500
          </p>
        </div>

        {/* Suspend duration: ระบุเอง (นาที / ชั่วโมง / วัน) */}
        {type === "suspend" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {tt("ระยะเวลาระงับ", "Suspension duration")} <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={durationValue}
                onChange={(e) => handleDurationChange(e.target.value)}
                min="1"
                max={durationUnit === "day" ? 365 : durationUnit === "hour" ? 720 : 10080}
                placeholder={tt("จำนวน", "Amount")}
                className="w-20 h-9 text-center tabular-nums"
              />
              <Select
                value={durationUnit}
                onValueChange={(v) => handleDurationChange(durationValue, v as "minute" | "hour" | "day")}
              >
                <SelectTrigger className="w-28 h-9" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minute">{tt("นาที", "Minute")}</SelectItem>
                  <SelectItem value="hour">{tt("ชั่วโมง", "Hour")}</SelectItem>
                  <SelectItem value="day">{tt("วัน", "Day")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

      </div>
    </UnifiedModal>
  )
}
