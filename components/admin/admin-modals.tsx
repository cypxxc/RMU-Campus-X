"use client"

import * as React from "react"
import { UnifiedModal } from "@/components/ui/unified-modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertTriangle, Ban, ShieldAlert, CheckCircle2, Loader2, User, X, BellOff, ExternalLink, Calendar, Package, RefreshCw, FileText, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/components/language-provider"
import Link from "next/link"

// ============ Admin Action Modal ============

type ActionType = "warn" | "suspend" | "ban" | "activate" | "delete" | "confirm"

interface AdminActionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: ActionType
  title?: string
  description?: string
  targetName?: string
  onConfirm: (data: { reason: string; days?: number }) => Promise<void>
  processing?: boolean
  requireReason?: boolean
  showDaysInput?: boolean
  defaultDays?: number
}

const actionConfig = {
  warn: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    buttonVariant: "outline" as const,
    buttonClass: "border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950",
    title: { th: "ออกคำเตือน", en: "Issue warning" },
    description: { th: "ผู้ใช้จะได้รับการแจ้งเตือนคำเตือนนี้", en: "The user will receive this warning notification." },
    confirmText: { th: "ออกคำเตือน", en: "Issue warning" },
  },
  suspend: {
    icon: ShieldAlert,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    buttonVariant: "outline" as const,
    buttonClass: "border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950",
    title: { th: "ระงับการใช้งานชั่วคราว", en: "Temporary suspension" },
    description: { th: "ผู้ใช้จะไม่สามารถใช้งานระบบได้ตามระยะเวลาที่กำหนด", en: "The user cannot use the system for the selected duration." },
    confirmText: { th: "ระงับผู้ใช้", en: "Suspend user" },
  },
  ban: {
    icon: Ban,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    buttonVariant: "destructive" as const,
    buttonClass: "",
    title: { th: "แบนถาวร", en: "Permanent ban" },
    description: { th: "ผู้ใช้จะถูกระงับการใช้งานอย่างถาวร", en: "The user will be permanently blocked." },
    confirmText: { th: "แบนถาวร", en: "Ban permanently" },
  },
  activate: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    buttonVariant: "default" as const,
    buttonClass: "bg-green-600 hover:bg-green-700",
    title: { th: "ปลดล็อคบัญชี", en: "Reactivate account" },
    description: { th: "ผู้ใช้จะสามารถกลับมาใช้งานได้ตามปกติ", en: "The user will regain normal access." },
    confirmText: { th: "ปลดล็อค", en: "Reactivate" },
  },
  delete: {
    icon: X,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    buttonVariant: "destructive" as const,
    buttonClass: "",
    title: { th: "ลบข้อมูล", en: "Delete data" },
    description: { th: "การกระทำนี้ไม่สามารถย้อนกลับได้", en: "This action cannot be undone." },
    confirmText: { th: "ยืนยันลบ", en: "Confirm delete" },
  },
  confirm: {
    icon: CheckCircle2,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    buttonVariant: "default" as const,
    buttonClass: "",
    title: { th: "ยืนยันการดำเนินการ", en: "Confirm action" },
    description: { th: "กรุณายืนยันการดำเนินการนี้", en: "Please confirm this operation." },
    confirmText: { th: "ยืนยัน", en: "Confirm" },
  },
}

export function AdminActionModal({
  open,
  onOpenChange,
  type,
  title,
  description,
  targetName,
  onConfirm,
  processing = false,
  requireReason = true,
  showDaysInput = false,
  defaultDays = 7,
}: AdminActionModalProps) {
  const [reason, setReason] = React.useState("")
  const [days, setDays] = React.useState(defaultDays.toString())
  const { tt } = useI18n()

  const config = actionConfig[type]
  const Icon = config.icon

  const handleConfirm = async () => {
    await onConfirm({ reason, days: showDaysInput ? parseInt(days) : undefined })
    setReason("")
    setDays(defaultDays.toString())
  }

  const isValid = !requireReason || reason.trim().length > 0

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={title || tt(config.title.th, config.title.en)}
      description={
        targetName ? (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground font-medium">{tt("เป้าหมาย:", "Target:")}</span>
            <Badge
              variant="outline"
             className="font-mono text-xs font-normal border-primary/20 bg-primary/5 text-primary"
            >
              {targetName}
            </Badge>
          </div>
        ) : (
          tt("ดำเนินการจัดการระบบ", "Run administrative action")
        )
      }
      icon={<Icon className={cn("h-6 w-6", config.color)} />}
      headerClassName={cn(config.bgColor, config.borderColor, "border-b")}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={processing}
            className="h-11 px-6"
          >
            {tt("ยกเลิก", "Cancel")}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={processing || !isValid}
            className={cn(
              config.buttonClass,
              "h-11 px-8 min-w-[140px] font-semibold"
            )}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {tt("กำลังบันทึก...", "Saving...")}
              </>
            ) : (
              <>{tt(config.confirmText.th, config.confirmText.en)}</>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Info Alert */}
        <div
          className={cn(
            "p-5 rounded-xl border flex gap-4 items-start",
            config.bgColor,
            config.borderColor
          )}
        >
          <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.color)} />
          <div className="space-y-1">
            <p className={cn("font-medium", config.color)}>{tt(config.title.th, config.title.en)}</p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {description || tt(config.description.th, config.description.en)}
            </p>
          </div>
        </div>

        {/* Days Input */}
        {showDaysInput && (
          <div className="space-y-3">
            <Label
              htmlFor="days"
              className="text-base font-semibold flex items-center justify-between"
            >
              <span>{tt("ระยะเวลาการระงับ", "Suspension duration")}</span>
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-md">
                {tt("หน่วย: วัน", "Unit: day")}
              </span>
            </Label>
            <div className="relative">
              <Input
                id="days"
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                min="1"
                max="365"
                className="h-12 pl-4 pr-12 font-mono text-lg"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">
                {tt("วัน", "day")}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {tt("กำหนดจำนวนวันที่ต้องการระงับการใช้งาน หลังจากครบกำหนดระบบจะปลดล็อคให้อัตโนมัติ", "Set how many days to suspend. Access will be restored automatically when time expires.")}
            </p>
          </div>
        )}

        {/* Reason Input */}
        {requireReason && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="reason" className="text-sm font-semibold">
                {tt("เหตุผลการดำเนินการ", "Reason")} <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">{tt(`${reason.length} ตัวอักษร`, `${reason.length} chars`)}</span>
            </div>

            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={tt("อธิบายเหตุผลอย่างละเอียด...", "Describe the reason in detail...")}
              rows={4}
              className="resize-y min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-3 w-3" />
              {tt("ข้อมูลนี้จะถูกบันทึกใน Admin Logs และแจ้งเตือนไปยังผู้ใช้", "This information will be stored in admin logs and sent to the user.")}
            </p>
          </div>
        )}
      </div>
    </UnifiedModal>
  )
}

// ============ User Detail Modal ============

interface UserStats {
  status: string
  warningCount: number
  reportsReceived: number
  reportsFiled: number
}

interface Warning {
  id: string
  reason: string
  action: string
  issuedByEmail: string
  issuedAt: any
}

export interface AdminUserNotificationItem {
  id: string
  title: string
  message: string
  type?: string
  isRead?: boolean
  createdAt?: Date | null
}

export interface UserDetailExtra {
  displayName?: string
  createdAt?: string
  itemsPosted?: number
  exchangesCompleted?: number
  reportsReceived?: number
  suspendedUntil?: string | null
  bannedReason?: string | null
}

interface UserDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
  stats: UserStats
  user: any
  userDetail?: UserDetailExtra | null
  warnings?: Warning[]
  notifications?: AdminUserNotificationItem[]
  deletingNotifications?: boolean
  onDeleteSelectedNotifications?: (notificationIds: string[]) => void
  onAction: (type: ActionType) => void
  getStatusBadge: (user: any) => React.ReactNode
  formatDate?: (date: any) => string
}

function formatDateStr(iso: string | undefined, locale: "th" | "en"): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleString(locale === "th" ? "th-TH" : "en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
  } catch {
    return iso
  }
}

export function UserDetailModal({
  open,
  onOpenChange,
  email,
  stats,
  user,
  userDetail = null,
  warnings = [],
  notifications = [],
  deletingNotifications = false,
  onDeleteSelectedNotifications,
  onAction,
  getStatusBadge,
  formatDate,
}: UserDetailModalProps) {
  const uid = user?.uid
  const { locale, tt } = useI18n()
  const [selectedNotificationIds, setSelectedNotificationIds] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!open) {
      setSelectedNotificationIds([])
      return
    }
    const availableIds = new Set(notifications.map((n) => n.id))
    setSelectedNotificationIds((prev) => prev.filter((id) => availableIds.has(id)))
  }, [open, notifications])

  const allNotificationsSelected =
    notifications.length > 0 && selectedNotificationIds.length === notifications.length

  const handleToggleNotification = (id: string, checked: boolean) => {
    setSelectedNotificationIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)
    )
  }

  const handleToggleAllNotifications = () => {
    setSelectedNotificationIds(allNotificationsSelected ? [] : notifications.map((n) => n.id))
  }

  const handleDeleteSelected = () => {
    if (!onDeleteSelectedNotifications || selectedNotificationIds.length === 0) return
    onDeleteSelectedNotifications(selectedNotificationIds)
  }

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={tt("จัดการผู้ใช้", "Manage user")}
      description={
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded-md inline-block mt-1">
          {email}
        </span>
      }
      icon={<User className="h-6 w-6" />}
      footer={
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
          {/* Left group: Warn + Suspend */}
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex gap-2">
            <Button
              variant="outline"
              onClick={() => onAction("warn")}
              className="gap-2 border-amber-500/30 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-500/50 dark:hover:bg-amber-950/50 dark:hover:text-amber-400"
            >
              <AlertTriangle className="h-4 w-4" />
              {tt("ออกคำเตือน", "Issue warning")}
            </Button>
            <Button
              variant="outline"
              onClick={() => onAction("suspend")}
              disabled={stats.status === "SUSPENDED"}
              className="gap-2 border-orange-500/30 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-500/50 dark:hover:bg-orange-950/50 dark:hover:text-orange-400"
            >
              <ShieldAlert className="h-4 w-4" />
              {tt("ระงับชั่วคราว", "Suspend")}
            </Button>
          </div>

          <div className="w-full h-px bg-border sm:hidden" />

          {/* Right group: Ban + Activate */}
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex gap-2">
            <Button
              variant="destructive"
              onClick={() => onAction("ban")}
              disabled={stats.status === "BANNED"}
              className="gap-2"
            >
              <Ban className="h-4 w-4" />
              {tt("แบนถาวร", "Ban permanently")}
            </Button>
             <Button
              variant="destructive"
              onClick={() => onAction("delete")}
              className="gap-2 bg-red-800 hover:bg-red-900 border-2 border-red-900/50"
            >
              <X className="h-4 w-4" />
              {tt("ลบข้อมูล", "Delete data")}
            </Button>
            <Button
              variant="default"
              onClick={() => onAction("activate")}
              disabled={stats.status === "ACTIVE"}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              {tt("ปลดล็อค", "Reactivate")}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ข้อมูลผู้ใช้ (จาก API detail) */}
        {(userDetail || uid) && (
          <div>
            <h3 className="font-semibold text-sm text-foreground/80 mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {tt("ข้อมูลผู้ใช้", "User info")}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {userDetail?.displayName != null && (
                <div className="p-3 rounded-lg bg-muted/30 border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{tt("ชื่อที่แสดง", "Display name")}</p>
                  <p className="font-medium truncate">{userDetail.displayName || "—"}</p>
                </div>
              )}
              {userDetail?.createdAt != null && (
                <div className="p-3 rounded-lg bg-muted/30 border flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{tt("สร้างบัญชีเมื่อ", "Created at")}</p>
                    <p className="font-medium">{formatDateStr(userDetail.createdAt, locale)}</p>
                  </div>
                </div>
              )}
              {userDetail?.itemsPosted != null && (
                <div className="p-3 rounded-lg bg-muted/30 border flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{tt("จำนวนโพสต์", "Posts")}</p>
                    <p className="font-medium">{userDetail.itemsPosted}</p>
                  </div>
                </div>
              )}
              {userDetail?.exchangesCompleted != null && (
                <div className="p-3 rounded-lg bg-muted/30 border flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{tt("แลกเปลี่ยนสำเร็จ", "Completed exchanges")}</p>
                    <p className="font-medium">{userDetail.exchangesCompleted}</p>
                  </div>
                </div>
              )}
            </div>
            {(userDetail?.suspendedUntil || userDetail?.bannedReason) && (
              <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 text-sm">
                {userDetail.bannedReason && (
                  <p><span className="font-medium text-foreground">{tt("เหตุผลแบน:", "Ban reason:")}</span> <span className="text-muted-foreground">{userDetail.bannedReason}</span></p>
                )}
                {userDetail.suspendedUntil && !userDetail.bannedReason && (
                  <p><span className="font-medium text-foreground">{tt("ระงับจนถึง:", "Suspended until:")}</span> <span className="text-muted-foreground">{formatDateStr(userDetail.suspendedUntil, locale)}</span></p>
                )}
              </div>
            )}
            {uid && (
              <div className="mt-3">
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <Link href={`/profile/${uid}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {tt("ดูโปรไฟล์สาธารณะ", "View public profile")}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}

        <Separator className="opacity-50" />

        {/* Stats Grid */}
        <div>
          <h3 className="font-semibold text-sm text-foreground/80 mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {tt("ภาพรวมบัญชี", "Account overview")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center bg-card border hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                {tt("สถานะ", "Status")}
              </p>
              <div className="flex justify-center scale-110">{getStatusBadge(user)}</div>
            </Card>
            <Card className="p-4 text-center bg-card border hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                {tt("คำเตือนสะสม", "Warnings")}
              </p>
              <p
                className={cn(
                  "text-3xl font-extrabold",
                  stats.warningCount > 0 ? "text-amber-500" : "text-foreground"
                )}
              >
                {stats.warningCount}
              </p>
            </Card>
            <Card className={cn(
              "p-4 text-center bg-card border hover:shadow-md transition-shadow",
              stats.reportsReceived > 0 && "hover:border-primary/50"
            )}>
              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                {tt("ถูกรายงาน", "Reported")}
              </p>
              <p
                className={cn(
                  "text-3xl font-extrabold",
                  stats.reportsReceived > 0 ? "text-destructive" : "text-foreground"
                )}
              >
                {stats.reportsReceived}
              </p>
              {stats.reportsReceived > 0 && uid && (
                <Button variant="ghost" size="sm" className="mt-2 h-8 gap-1.5 text-primary" asChild>
                  <Link href={`/admin/reports?reportedUserId=${uid}`} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4" />
                    {tt("ดูรายงานที่ถูกรายงาน", "View related reports")}
                  </Link>
                </Button>
              )}
            </Card>
            <Card className="p-4 text-center bg-card border hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                {tt("แจ้งรายงาน", "Reports filed")}
              </p>
              <p className="text-3xl font-extrabold text-foreground">{stats.reportsFiled}</p>
            </Card>
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* Warning History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-foreground/80 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {tt(`ประวัติการถูกแจ้งเตือน (${warnings.length})`, `Warning history (${warnings.length})`)}
            </h3>
          </div>

          {warnings.length > 0 ? (
            <div className="border rounded-lg bg-muted/20 overflow-hidden">
              <div className="max-h-[250px] overflow-y-auto p-1 space-y-1">
                {warnings.map((warning) => (
                  <div
                    key={warning.id}
                    className="p-3 bg-card border rounded-md hover:bg-muted/50 transition-colors flex items-start gap-3 group"
                  >
                    <div className="mt-1">
                      <AlertTriangle className="h-4 w-4 text-amber-500 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold h-5 px-1.5 border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"
                        >
                          {warning.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatDate && formatDate(warning.issuedAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground leading-relaxed">
                        &quot;{warning.reason}&quot;
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {tt("โดย", "By")} {warning.issuedByEmail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/10 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-green-500/50 mb-2" />
              <p className="text-sm">{tt("ไม่มีประวัติคำเตือน", "No warning history")}</p>
              <p className="text-xs opacity-70">{tt("ผู้ใช้นี้มีพฤติกรรมดีเยี่ยม", "This user has an excellent record")}</p>
            </div>
          )}
        </div>

        <Separator className="opacity-50" />

        {/* User Notifications (selective delete) */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold text-sm text-foreground/80 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              {tt(`การแจ้งเตือนผู้ใช้ (${notifications.length})`, `User notifications (${notifications.length})`)}
            </h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={notifications.length === 0}
                onClick={handleToggleAllNotifications}
              >
                {allNotificationsSelected ? tt("ยกเลิกเลือกทั้งหมด", "Deselect all") : tt("เลือกทั้งหมด", "Select all")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="gap-2"
                disabled={
                  deletingNotifications ||
                  selectedNotificationIds.length === 0 ||
                  !onDeleteSelectedNotifications
                }
                onClick={handleDeleteSelected}
              >
                <Trash2 className="h-4 w-4" />
                {deletingNotifications
                  ? tt("กำลังลบ...", "Deleting...")
                  : tt(`ลบที่เลือก (${selectedNotificationIds.length})`, `Delete selected (${selectedNotificationIds.length})`)}
              </Button>
            </div>
          </div>

          {notifications.length > 0 ? (
            <div className="border rounded-lg bg-muted/20 overflow-hidden">
              <div className="max-h-[260px] overflow-y-auto p-1 space-y-1">
                {notifications.map((notification) => {
                  const isChecked = selectedNotificationIds.includes(notification.id)
                  const createdAt = notification.createdAt
                    ? formatDate
                      ? formatDate(notification.createdAt)
                      : notification.createdAt.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                    : "—"

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 bg-card border rounded-md transition-colors",
                        isChecked ? "border-destructive/40 bg-destructive/5" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleToggleNotification(notification.id, checked === true)
                          }
                          aria-label={`select-notification-${notification.id}`}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <Badge
                              variant={notification.isRead ? "outline" : "secondary"}
                              className="text-[10px] h-5 px-1.5"
                            >
                              {notification.type || tt("ระบบ", "system")}
                            </Badge>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {createdAt}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground">{notification.title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/10 text-muted-foreground">
              <BellOff className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">{tt("ไม่พบการแจ้งเตือนของผู้ใช้", "No user notifications found")}</p>
            </div>
          )}
        </div>
      </div>
    </UnifiedModal>
  )
}

// ============ Info Card (for modals) ============

interface InfoCardProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  variant?: "default" | "success" | "warning" | "danger" | "info"
}

const variantStyles = {
  default: "bg-muted/50",
  success: "bg-green-500/10 border-green-500/30",
  warning: "bg-amber-500/10 border-amber-500/30",
  danger: "bg-red-500/10 border-red-500/30",
  info: "bg-blue-500/10 border-blue-500/30",
}

export function InfoCard({ icon, label, value, variant = "default" }: InfoCardProps) {
  return (
    <Card className={cn("p-3 border", variantStyles[variant])}>
      <div className="flex items-center gap-3">
        <div className="shrink-0 opacity-70">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <div className="font-medium truncate">{value}</div>
        </div>
      </div>
    </Card>
  )
}

// ============ Empty State ============

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && React.isValidElement(icon) && (
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          {React.cloneElement(icon as React.ReactElement<any>, {
            className: "h-10 w-10 text-muted-foreground/50",
          })}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
