"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Loader2, AlertTriangle, Ban, ShieldAlert, CheckCircle2, Flag, User as UserIcon } from "lucide-react"

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header - Fixed with semantic color */}
        <DialogHeader className={`px-6 py-4 border-b ${
          type === 'warn' ? 'bg-yellow-50/80 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/50' :
          type === 'suspend' ? 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50' :
          type === 'ban' ? 'bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-900/50' :
          type === 'delete' ? 'bg-red-100/80 dark:bg-red-950/50 border-red-300 dark:border-red-900/80' :
          'bg-green-50/80 dark:bg-green-950/30 border-green-200 dark:border-green-900/50'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
              type === 'warn' ? 'bg-yellow-100 dark:bg-yellow-900/50' :
              type === 'suspend' ? 'bg-orange-100 dark:bg-orange-900/50' :
              type === 'ban' ? 'bg-red-100 dark:bg-red-900/50' :
              type === 'delete' ? 'bg-red-200 dark:bg-red-900' :
              'bg-green-100 dark:bg-green-900/50'
            }`}>
              {type === 'warn' && <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />}
              {type === 'suspend' && <ShieldAlert className="h-6 w-6 text-orange-600 dark:text-orange-400" />}
              {type === 'ban' && <Ban className="h-6 w-6 text-red-600 dark:text-red-400" />}
              {type === 'delete' && <Ban className="h-6 w-6 text-red-700 dark:text-red-300" />}
              {type === 'activate' && <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {type === 'warn' && "ออกคำเตือนผู้ใช้"}
                {type === 'suspend' && "ระงับการใช้งานชั่วคราว"}
                {type === 'ban' && "แบนผู้ใช้ถาวร"}
                {type === 'activate' && "ปลดล็อคบัญชี"}
                {type === 'delete' && "ลบข้อมูลผู้ใช้ถาวร"}
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {type === 'warn' && "ส่งคำเตือนให้ผู้ใช้รับทราบข้อควรปฏิบัติ"}
                {type === 'suspend' && "ระงับการเข้าใช้งานระบบตามระยะเวลาที่กำหนด"}
                {type === 'ban' && "ปิดกั้นการเข้าใช้งานระบบอย่างถาวร"}
                {type === 'activate' && "คืนสิทธิ์การเข้าใช้งานให้ผู้ใช้"}
                {type === 'delete' && "ข้อมูลทั้งหมดของผู้ใช้จะถูกลบและไม่สามารถกู้คืนได้"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body - Scrollable with sections */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          
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
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b">
              <h4 className="text-sm font-semibold text-foreground">
                เหตุผลการดำเนินการ <span className="text-destructive">*</span>
              </h4>
            </div>
            <div className="p-4 space-y-3">
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
                      className={`h-10 font-medium ${
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
          <div className={`rounded-xl border overflow-hidden ${
            type === 'warn' 
              ? 'bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200/80 dark:border-yellow-800/50' :
            type === 'suspend' 
              ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200/80 dark:border-orange-800/50' :
            type === 'ban' 
              ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200/80 dark:border-red-800/50' :
            'bg-green-50/50 dark:bg-green-950/20 border-green-200/80 dark:border-green-800/50'
          }`}>
            <div className={`px-4 py-3 border-b flex items-center gap-2 ${
              type === 'warn' 
                ? 'bg-yellow-100/50 dark:bg-yellow-900/20 border-yellow-200/80 dark:border-yellow-800/50' :
              type === 'suspend' 
                ? 'bg-orange-100/50 dark:bg-orange-900/20 border-orange-200/80 dark:border-orange-800/50' :
              type === 'ban' 
                ? 'bg-red-100/50 dark:bg-red-900/20 border-red-200/80 dark:border-red-800/50' :
              'bg-green-100/50 dark:bg-green-900/20 border-green-200/80 dark:border-green-800/50'
            }`}>
              <Flag className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">ผลกระทบของการดำเนินการ</h4>
            </div>
            <div className="p-4">
              {type === 'warn' && (
                <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-300">
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>ผู้ใช้จะได้รับการแจ้งเตือนผ่าน LINE และในระบบ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>จำนวนคำเตือนสะสมจะเพิ่มขึ้น 1 ครั้ง</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>หากมีคำเตือนมากเกินไป อาจถูกระงับหรือแบนในอนาคต</span>
                  </li>
                </ul>
              )}
              {type === 'suspend' && (
                <ul className="space-y-2 text-sm text-orange-800 dark:text-orange-300">
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้ตลอดระยะเวลาที่กำหนด</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>สิ่งของและการแลกเปลี่ยนที่มีอยู่จะถูกซ่อนชั่วคราว</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>หลังครบกำหนด บัญชีจะกลับมาใช้งานได้ตามปกติ</span>
                  </li>
                </ul>
              )}
              {type === 'ban' && (
                <ul className="space-y-2 text-sm text-red-800 dark:text-red-300">
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <span className="font-medium">การแบนเป็นการถาวร ไม่สามารถยกเลิกได้ง่าย</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>ผู้ใช้จะไม่สามารถเข้าใช้งานระบบได้อีก</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>สิ่งของและข้อมูลของผู้ใช้จะถูกซ่อนถาวร</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>พฤติกรรมนี้จะถูกบันทึกเป็นประวัติ</span>
                  </li>
                </ul>
              )}
              {type === 'delete' && (
                <ul className="space-y-2 text-sm text-red-900 dark:text-red-200">
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <span className="font-bold">การลบนี้ถูกต้องถาวร!</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>ข้อมูลผู้ใช้, สิ่งของ, และประวัติการแลกเปลี่ยนจะหายไป</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>รายงานที่เกี่ยวข้องกับผู้ใช้นี้จะถูกลบ (แก้ปัญหา Ghost)</span>
                  </li>
                </ul>
              )}
              {type === 'activate' && (
                <ul className="space-y-2 text-sm text-green-800 dark:text-green-300">
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">✓</span>
                    <span>ผู้ใช้จะสามารถเข้าใช้งานระบบได้ตามปกติ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">✓</span>
                    <span>สิ่งของและการแลกเปลี่ยนจะกลับมาแสดงผล</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">✓</span>
                    <span>ประวัติการถูกระงับจะยังคงบันทึกไว้ในระบบ</span>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Fixed with prominent action button */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/20 gap-3 sm:gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={processing}
            className="min-w-[100px]"
          >
            ยกเลิก
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={processing || !reason.trim() || (type === 'suspend' && !suspendDays)}
            className={`min-w-[140px] font-semibold shadow-md ${
              type === 'warn' 
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
              type === 'suspend' 
                ? 'bg-orange-500 hover:bg-orange-600 text-white' :
              type === 'ban' 
                ? 'bg-red-600 hover:bg-red-700 text-white' :
              type === 'delete'
                ? 'bg-destructive/90 hover:bg-destructive text-white ring-2 ring-destructive/20' :
              'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {type === 'warn' && (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                ออกคำเตือน
              </>
            )}
            {type === 'suspend' && (
              <>
                <ShieldAlert className="h-4 w-4 mr-2" />
                ระงับผู้ใช้
              </>
            )}
            {type === 'ban' && (
              <>
                <Ban className="h-4 w-4 mr-2" />
                แบนถาวร
              </>
            )}
            {type === 'delete' && (
              <>
                <Ban className="h-4 w-4 mr-2" />
                ยืนยันลบ
              </>
            )}
            {type === 'activate' && (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                ปลดล็อค
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
