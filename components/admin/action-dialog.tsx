"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Ban, ShieldAlert, CheckCircle2, Flag, User as UserIcon } from "lucide-react"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"

interface UserWithReports {
  uid: string
  email: string
  warningCount?: number
  reportsReceived: number
  [key: string]: any
}

interface ActionDialogProps {
  open: boolean
  type: 'warn' | 'suspend' | 'ban' | 'activate' | 'delete' | null
  user: UserWithReports | null
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string, suspendDays?: number) => Promise<void>
}

export function ActionDialog({ open, type, user, onOpenChange, onConfirm }: ActionDialogProps) {
  const [reason, setReason] = useState("")
  const [suspendDays, setSuspendDays] = useState("7")
  const [processing, setProcessing] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setReason("")
      setSuspendDays("7")
      setProcessing(false)
    }
  }, [open])

  const handleConfirm = async () => {
    if (!reason.trim()) return
    if (type === 'suspend' && !suspendDays) return

    setProcessing(true)
    try {
      await onConfirm(reason, type === 'suspend' ? parseInt(suspendDays) : undefined)
    } finally {
      setProcessing(false)
    }
  }

  if (!type) return null

  // Configuration map for different action types
  const config = {
    warn: {
      title: "ออกคำเตือนผู้ใช้",
      description: "ส่งคำเตือนให้ผู้ใช้รับทราบข้อควรปฏิบัติ",
      icon: <AlertTriangle className="h-5 w-5" />,
      headerClass: "bg-yellow-50/80 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/50",
      iconClass: "text-yellow-600 dark:text-yellow-400",
      submitText: "ออกคำเตือน",
      submitVariant: "default" as const, // Yellow not standard, handle via styling if needed or keep default
      impactBorder: "border-yellow-200/80 dark:border-yellow-800/50",
      impactBg: "bg-yellow-50/50 dark:bg-yellow-950/20",
      impactText: "text-yellow-800 dark:text-yellow-300",
    },
    suspend: {
      title: "ระงับการใช้งานชั่วคราว",
      description: "ระงับการเข้าใช้งานระบบตามระยะเวลาที่กำหนด",
      icon: <ShieldAlert className="h-5 w-5" />,
      headerClass: "bg-orange-50/80 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50",
      iconClass: "text-orange-600 dark:text-orange-400",
      submitText: "ระงับผู้ใช้",
      submitVariant: "destructive" as const,
      impactBorder: "border-orange-200/80 dark:border-orange-800/50",
      impactBg: "bg-orange-50/50 dark:bg-orange-950/20",
      impactText: "text-orange-800 dark:text-orange-300",
    },
    ban: {
      title: "แบนผู้ใช้ถาวร",
      description: "ปิดกั้นการเข้าใช้งานระบบอย่างถาวร",
      icon: <Ban className="h-5 w-5" />,
      headerClass: "bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-900/50",
      iconClass: "text-red-600 dark:text-red-400",
      submitText: "แบนถาวร",
      submitVariant: "destructive" as const,
      impactBorder: "border-red-200/80 dark:border-red-800/50",
      impactBg: "bg-red-50/50 dark:bg-red-950/20",
      impactText: "text-red-800 dark:text-red-300",
    },
    delete: {
      title: "ลบข้อมูลผู้ใช้ถาวร",
      description: "ข้อมูลทั้งหมดของผู้ใช้จะถูกลบและไม่สามารถกู้คืนได้",
      icon: <Ban className="h-5 w-5" />,
      headerClass: "bg-red-100/80 dark:bg-red-950/50 border-red-300 dark:border-red-900/80",
      iconClass: "text-red-700 dark:text-red-300",
      submitText: "ยืนยันลบ",
      submitVariant: "destructive" as const,
      impactBorder: "border-red-300/80 dark:border-red-800/80",
      impactBg: "bg-red-100/50 dark:bg-red-950/30",
      impactText: "text-red-900 dark:text-red-200",
    },
    activate: {
      title: "ปลดล็อคบัญชี",
      description: "คืนสิทธิ์การเข้าใช้งานให้ผู้ใช้",
      icon: <CheckCircle2 className="h-5 w-5" />,
      headerClass: "bg-green-50/80 dark:bg-green-950/30 border-green-200 dark:border-green-900/50",
      iconClass: "text-green-600 dark:text-green-400",
      submitText: "ปลดล็อค",
      submitVariant: "default" as const,
      impactBorder: "border-green-200/80 dark:border-green-800/50",
      impactBg: "bg-green-50/50 dark:bg-green-950/20",
      impactText: "text-green-800 dark:text-green-300",
    },
  }

  const currentConfig = config[type]

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={currentConfig.title}
      description={currentConfig.description}
      icon={currentConfig.icon}
      headerClassName={currentConfig.headerClass}
      footer={
        <UnifiedModalActions
          onCancel={() => onOpenChange(false)}
          onSubmit={handleConfirm}
          submitText={currentConfig.submitText}
          submitVariant={currentConfig.submitVariant}
          submitDisabled={processing || !reason.trim() || (type === 'suspend' && !suspendDays)}
          loading={processing}
        />
      }
    >
      <div className="space-y-5">
        
        {/* Section 1: User Info Card */}
        {user && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                ข้อมูลผู้ใช้
              </h4>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">อีเมล</p>
                <p className="font-medium text-foreground mt-0.5">{user.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30 border">
                  <p className="text-xs text-muted-foreground">คำเตือนสะสม</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    (user.warningCount || 0) > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'
                  }`}>
                    {user.warningCount || 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border">
                  <p className="text-xs text-muted-foreground">ถูกรายงาน</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    user.reportsReceived > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                  }`}>
                    {user.reportsReceived}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Reason Form Card */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1">
            เหตุผลการดำเนินการ <span className="text-destructive">*</span>
          </h4>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            placeholder={
              type === 'warn' ? "ระบุเหตุผลที่ออกคำเตือน เช่น พฤติกรรมไม่เหมาะสม, โพสต์เนื้อหาผิดกฎ, ใช้คำหยาบคาย..." :
              type === 'suspend' ? "ระบุเหตุผลที่ระงับ เช่น ละเมิดกฎซ้ำหลายครั้ง, มีพฤติกรรมฉ้อโกง..." :
              type === 'ban' ? "ระบุเหตุผลที่แบน เช่น ฉ้อโกงรุนแรง, คุกคามผู้อื่น, สร้างบัญชีปลอม..." :
              "ระบุเหตุผลที่ปลดล็อค เช่น ครบกำหนดระงับ, ผู้ใช้ยื่นอุทธรณ์..."
            }
            rows={4}
            className="resize-none text-sm"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              💡 เขียนให้ชัดเจนเพื่อบันทึกเป็นประวัติ
            </p>
            <p className={`text-xs tabular-nums ${
              reason.length > 450 ? 'text-destructive font-medium' : 'text-muted-foreground'
            }`}>
              {reason.length}/500
            </p>
          </div>
        </div>

        {/* Section 2.5: Suspend Duration (conditional) */}
        {type === 'suspend' && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b">
              <h4 className="text-sm font-semibold text-foreground">
                ระยะเวลาระงับ <span className="text-destructive">*</span>
              </h4>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-5 gap-2">
                {[1, 3, 7, 14, 30].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant={suspendDays === String(days) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSuspendDays(String(days))}
                    className={`h-9 font-medium ${
                      suspendDays === String(days) 
                        ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                        : 'hover:bg-orange-50 dark:hover:bg-orange-950/30'
                    }`}
                  >
                    {days} วัน
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">หรือกำหนดเอง:</span>
                <Input
                  type="number"
                  value={suspendDays}
                  onChange={(e) => setSuspendDays(e.target.value)}
                  min="1"
                  max="365"
                  className="w-24 h-9 text-center"
                />
                <span className="text-sm text-muted-foreground">วัน</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Impact Warning Card */}
        <div className={`rounded-xl border overflow-hidden ${currentConfig.impactBg} ${currentConfig.impactBorder}`}>
          <div className={`px-4 py-3 border-b flex items-center gap-2 ${currentConfig.impactBorder} bg-white/20`}>
            <Flag className="h-4 w-4 text-muted-foreground opacity-70" />
            <h4 className="text-sm font-semibold">ผลกระทบของการดำเนินการ</h4>
          </div>
          <div className="p-4">
            {type === 'warn' && (
              <ul className={`space-y-2 text-sm ${currentConfig.impactText}`}>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">•</span>
                  <span>ผู้ใช้จะได้รับการแจ้งเตือนผ่าน LINE และในระบบ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">•</span>
                  <span>จำนวนคำเตือนสะสมจะเพิ่มขึ้น 1 ครั้ง</span>
                </li>
              </ul>
            )}
            {type === 'suspend' && (
              <ul className={`space-y-2 text-sm ${currentConfig.impactText}`}>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">•</span>
                  <span>ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้ตลอดระยะเวลาที่กำหนด</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">•</span>
                  <span>โพสและการแลกเปลี่ยนที่มีอยู่จะถูกซ่อนชั่วคราว</span>
                </li>
              </ul>
            )}
            {/* ... other types simplified ... */}
            {(type === 'ban' || type === 'delete') && (
              <ul className={`space-y-2 text-sm ${currentConfig.impactText}`}>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span className="font-medium">การดำเนินการนี้รุนแรงและมีผลระยะยาว</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">•</span>
                  <span>ผู้ใช้จะไม่สามารถเข้าใช้งานระบบได้</span>
                </li>
              </ul>
            )}
            {type === 'activate' && (
              <ul className={`space-y-2 text-sm ${currentConfig.impactText}`}>
                <li className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">✓</span>
                  <span>ผู้ใช้จะสามารถเข้าใช้งานระบบได้ตามปกติ</span>
                </li>
              </ul>
            )}
          </div>
        </div>

      </div>
    </UnifiedModal>
  )
}
