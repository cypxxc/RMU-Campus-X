"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  AlertTriangle,
  Ban,
  CheckCircle2,
  History,
  Clock
} from "lucide-react"
import type { User as UserType, UserStatus, UserWarning } from "@/types"
import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"

interface UserDetailPanelProps {
  user: UserType | null
  warnings: UserWarning[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange?: (userId: string, newStatus: UserStatus, reason: string, duration?: number) => void
}

const statusConfig: Record<UserStatus, { label: string; color: string; icon: any }> = {
  ACTIVE: { label: "ใช้งานปกติ", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  WARNING: { label: "คำเตือน", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertTriangle },
  SUSPENDED: { label: "ระงับ", color: "bg-orange-100 text-orange-800 border-orange-200", icon: Shield },
  BANNED: { label: "แบน", color: "bg-red-100 text-red-800 border-red-200", icon: Ban },
}

export function UserDetailPanel({
  user,
  warnings,
  open,
  onOpenChange,
  onStatusChange,
}: UserDetailPanelProps) {
  const [selectedAction, setSelectedAction] = useState<"warn" | "suspend" | "ban" | "activate" | "">("")
  const [reason, setReason] = useState("")
  const [suspendMinutes, setSuspendMinutes] = useState("30")

  if (!user) return null

  const config = statusConfig[user.status]
  const StatusIcon = config.icon
  const createdAt = (user.createdAt as any)?.toDate?.() || new Date()

  const handleAction = () => {
    if (!selectedAction || !reason.trim()) return
    
    let duration: number | undefined
    if (selectedAction === "suspend") {
      duration = parseInt(suspendMinutes)
    }

    if (onStatusChange) {
      const statusMap = {
        warn: "WARNING" as UserStatus,
        suspend: "SUSPENDED" as UserStatus,
        ban: "BANNED" as UserStatus,
        activate: "ACTIVE" as UserStatus,
      }
      onStatusChange(user.uid, statusMap[selectedAction], reason, duration)
      setSelectedAction("")
      setReason("")
      setSuspendMinutes("30")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <SheetTitle className="text-2xl flex items-center gap-2">
                <User className="h-6 w-6" />
                {user.displayName || "ไม่ระบุชื่อ"}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {user.email}
              </SheetDescription>
            </div>
            <Badge className={`${config.color} gap-1`} variant="outline">
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* User Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                User ID
              </Label>
              <p className="text-sm font-mono bg-muted/50 p-2 rounded">{user.uid}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                สมัครเมื่อ
              </Label>
              <p className="text-sm font-medium">
                {formatDistanceToNow(createdAt, { locale: th, addSuffix: true })}
              </p>
            </div>
          </div>

          <Separator />

          {/* Warnings History */}
          {warnings.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <History className="h-5 w-5" />
                ประวัติการเตือน ({warnings.length})
              </Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {warnings.map((warning, index) => {
                  const warnedAt = (warning.issuedAt as any)?.toDate?.() || new Date()
                  return (
                    <div key={index} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-900">{warning.reason}</p>
                          <p className="text-xs text-amber-700 mt-1">
                            โดย: {warning.issuedByEmail}
                          </p>
                        </div>
                        <div className="text-xs text-amber-600 shrink-0">
                          {formatDistanceToNow(warnedAt, { locale: th, addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">การจัดการสิทธิ์</Label>
            
            {/* Action Selection */}
            <div className="space-y-2">
              <Label htmlFor="action">เลือกการดำเนินการ</Label>
              <Select value={selectedAction} onValueChange={(value: any) => setSelectedAction(value)}>
                <SelectTrigger id="action">
                  <SelectValue placeholder="เลือกการดำเนินการ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warn">ออกคำเตือน</SelectItem>
                  <SelectItem value="suspend">ระงับการใช้งาน</SelectItem>
                  <SelectItem value="ban">แบนถาวร</SelectItem>
                  {user.status !== "ACTIVE" && (
                    <SelectItem value="activate">ปลดล็อค/เปิดใช้งาน</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Suspend Duration */}
            {selectedAction === "suspend" && (
              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  ระยะเวลาระงับ (นาที)
                </Label>
                <Select value={suspendMinutes} onValueChange={setSuspendMinutes}>
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 นาที</SelectItem>
                    <SelectItem value="60">1 ชั่วโมง</SelectItem>
                    <SelectItem value="1440">1 วัน</SelectItem>
                    <SelectItem value="10080">7 วัน</SelectItem>
                    <SelectItem value="43200">30 วัน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reason */}
            {selectedAction && (
              <div className="space-y-2">
                <Label htmlFor="reason">เหตุผล *</Label>
                <Textarea
                  id="reason"
                  placeholder="ระบุเหตุผลในการดำเนินการ..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {/* Submit Button */}
            {selectedAction && (
              <Button 
                className="w-full"
                onClick={handleAction}
                disabled={!reason.trim()}
                variant={selectedAction === "ban" ? "destructive" : "default"}
              >
                ยืนยันการดำเนินการ
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
