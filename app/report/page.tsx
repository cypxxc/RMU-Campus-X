"use client"

// React import removed - not needed

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { getItemById } from "@/lib/firestore"
import type { ReportType } from "@/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, Loader2, Info } from "lucide-react"
import { useI18n } from "@/components/language-provider"

// Report reasons by type
const REPORT_REASONS = {
  item_report: [
    { code: "item_fake_info", th: "ข้อมูลสิ่งของไม่ถูกต้องหรือเท็จ", en: "Item information is false or inaccurate" },
    { code: "item_wrong_image", th: "รูปภาพไม่ตรงกับของจริง", en: "Images do not match the item" },
    { code: "item_illegal", th: "สิ่งของผิดกฎหมายหรือของต้องห้าม", en: "Illegal or prohibited item" },
    { code: "item_inappropriate", th: "เนื้อหาไม่เหมาะสม", en: "Inappropriate content" },
    { code: "item_scam", th: "แฝงการขายหรือหลอกลวง", en: "Scam or hidden sales intent" },
    { code: "item_spam", th: "โพสต์ซ้ำ / สแปม", en: "Duplicate post / spam" },
    { code: "item_incomplete", th: "รายละเอียดไม่ครบถ้วน", en: "Incomplete details" },
    { code: "other", th: "อื่นๆ (ต้องกรอกรายละเอียด)", en: "Other (details required)" },
  ],
  exchange_report: [
    { code: "exchange_no_show", th: "ไม่มาตามนัด", en: "No-show at meetup" },
    { code: "exchange_breach", th: "ผิดข้อตกลง", en: "Breach of agreement" },
    { code: "exchange_change_terms", th: "เปลี่ยนเงื่อนไขกะทันหัน", en: "Changed terms unexpectedly" },
    { code: "exchange_cancel", th: "ยกเลิกโดยไม่มีเหตุผล", en: "Cancelled without reason" },
    { code: "exchange_suspicious", th: "พฤติกรรมน่าสงสัย", en: "Suspicious behavior" },
    { code: "exchange_inappropriate", th: "สื่อสารไม่เหมาะสม", en: "Inappropriate communication" },
    { code: "other", th: "อื่นๆ (ต้องกรอกรายละเอียด)", en: "Other (details required)" },
  ],
  user_report: [
    { code: "user_impersonation", th: "แอบอ้างบุคคลอื่น", en: "Impersonation" },
    { code: "user_fake_info", th: "ให้ข้อมูลเท็จ", en: "False information" },
    { code: "user_repeated_violation", th: "พฤติกรรมไม่เหมาะสมซ้ำๆ", en: "Repeated misconduct" },
    { code: "user_frequent_cancel", th: "ยกเลิกบ่อยผิดปกติ", en: "Abnormal frequent cancellations" },
    { code: "user_rule_violation", th: "ละเมิดกฎชุมชน", en: "Community rule violation" },
    { code: "user_scammer", th: "ต้องสงสัยว่าเป็นมิจฉาชีพ", en: "Suspected scammer" },
    { code: "other", th: "อื่นๆ (ต้องกรอกรายละเอียด)", en: "Other (details required)" },
  ],
}

function ReportContent() {
  const searchParams = useSearchParams()
  const itemId = searchParams.get("itemId")
  const exchangeId = searchParams.get("exchangeId")
  const chatId = searchParams.get("chatId")
  const userId = searchParams.get("userId")
  
  const [reportType, setReportType] = useState<ReportType>("item_report")
  const [reasonCode, setReasonCode] = useState("")
  const [description, setDescription] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [item, setItem] = useState<any>(null)
  
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { tt } = useI18n()

  // Determine report type from URL params
  useEffect(() => {
    if (exchangeId) setReportType("exchange_report")
    else if (userId || chatId) setReportType("user_report")
    else setReportType("item_report")
  }, [itemId, exchangeId, chatId, userId])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    if (itemId) {
      loadItem()
    }
  }, [itemId, user, authLoading])

  const loadItem = async () => {
    if (!itemId) return

    try {
      const result = await getItemById(itemId)
      
      // Handle ApiResponse format
      if (result.success && result.data) {
        setItem(result.data)
      }
    } catch (error: unknown) {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: error instanceof Error ? error.message : tt("ไม่สามารถโหลดข้อมูลได้", "Unable to load data"),
        variant: "destructive",
      })
    }
  }

  const reportTypeLabels: Record<ReportType, string> = {
    item_report: tt("รายงานสิ่งของ", "Item report"),
    exchange_report: tt("รายงานการแลกเปลี่ยน", "Exchange report"),
    user_report: tt("รายงานผู้ใช้", "User report"),
  }
  const currentReasons = (REPORT_REASONS[reportType] || []).map((r) => ({ ...r, label: tt(r.th, r.en) }))
  const selectedReason = currentReasons.find((r) => r.code === reasonCode)
  const isOtherReason = reasonCode === "other"
  const isFormValid = reasonCode && (isOtherReason ? description.trim().length > 0 : true) && confirmed

  const handleReasonChange = (code: string) => {
    setReasonCode(code)
    if (code !== "other") {
      setDescription("")
    }
  }

  const handleSubmitClick = () => {
    if (!isFormValid) return
    setShowConfirmDialog(true)
  }

  const handleConfirmSubmit = async () => {
    if (!user) return

    setLoading(true)
    setShowConfirmDialog(false)

    try {
      const reportData: Record<string, unknown> = {
        reportType,
        reasonCode,
        reason: selectedReason?.label || "",
        description: description.trim() || tt("ไม่มีรายละเอียดเพิ่มเติม", "No additional details"),
        targetId: itemId || exchangeId || chatId || userId || "",
        targetTitle: item?.title || "",
      }

      // Add type-specific fields
      if (reportType === "item_report" && item) {
        reportData.itemId = item.id
        reportData.itemTitle = item.title
        reportData.itemStatus = item.status
      }

      const token = await user.getIdToken()
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reportData),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || tt("ไม่สามารถส่งรายงานได้", "Unable to submit report"))
      }

      toast({
        title: tt("รายงานสำเร็จ", "Report submitted"),
        description: tt("รายงานของคุณจะถูกตรวจสอบโดยผู้ดูแลระบบ", "Your report will be reviewed by the admin team."),
      })

      router.push("/dashboard")
    } catch (error: unknown) {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: error instanceof Error ? error.message : tt("ไม่สามารถส่งรายงานได้", "Unable to submit report"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-2xl">{tt("รายงานปัญหา", "Report issue")}</CardTitle>
                <CardDescription>
                  {item?.title || tt("กรุณากรอกข้อมูลด้านล่างเพื่อส่งรายงาน", "Please complete the form below to submit your report.")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Report Type */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{tt("ประเภทการรายงาน", "Report type")}</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)} disabled={!!itemId || !!exchangeId || !!chatId || !!userId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="item_report">{tt("รายงานสิ่งของ", "Item report")}</SelectItem>
                  <SelectItem value="exchange_report">{tt("รายงานการแลกเปลี่ยน", "Exchange report")}</SelectItem>
                  <SelectItem value="user_report">{tt("รายงานผู้ใช้", "User report")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{tt("เลือกประเภทของปัญหาที่คุณต้องการรายงาน", "Select the type of issue you want to report.")}</p>
            </div>

            {/* Reason */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{tt("เหตุผลในการรายงาน", "Reason")} *</Label>
              <RadioGroup value={reasonCode} onValueChange={handleReasonChange}>
                {currentReasons.map((reason) => (
                  <div key={reason.code} className="flex items-center space-x-2">
                    <RadioGroupItem value={reason.code} id={reason.code} />
                    <Label htmlFor={reason.code} className="font-normal cursor-pointer">
                      {reason.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <Label htmlFor="description" className="text-base font-semibold">
                {tt("รายละเอียดเพิ่มเติม", "Additional details")} {isOtherReason && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="description"
                placeholder={
                  isOtherReason
                    ? tt("กรุณาอธิบายปัญหาโดยละเอียด...", "Please explain the issue in detail...")
                    : tt("ข้อมูลเพิ่มเติม (ถ้ามี)", "Additional info (optional)")
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                maxLength={500}
                required={isOtherReason}
              />
              <p className="text-sm text-muted-foreground">{tt(`${description.length}/500 ตัวอักษร`, `${description.length}/500 characters`)}</p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">{tt("ข้อมูลสำคัญ", "Important information")}</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>{tt("รายงานจะถูกตรวจสอบโดยผู้ดูแลระบบ", "Reports are reviewed by administrators.")}</li>
                  <li>{tt("การรายงานเท็จอาจส่งผลต่อบัญชีของคุณ", "False reporting may impact your account.")}</li>
                  <li>{tt("คุณจะได้รับการแจ้งเตือนเมื่อมีการดำเนินการ", "You will be notified when action is taken.")}</li>
                </ul>
              </div>
            </div>

            {/* Confirmation */}
            <div className="flex items-start space-x-2">
              <Checkbox id="confirm" checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} />
              <Label htmlFor="confirm" className="text-sm font-normal cursor-pointer leading-relaxed">
                {tt("ฉันยืนยันว่าข้อมูลที่ให้ไว้เป็นความจริง และเข้าใจว่าการรายงานเท็จอาจส่งผลต่อบัญชีของฉัน", "I confirm this information is accurate and understand that false reporting may affect my account.")}
              </Label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="flex-1">
                {tt("ยกเลิก", "Cancel")}
              </Button>
              <Button onClick={handleSubmitClick} disabled={!isFormValid || loading} variant="destructive" className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tt("กำลังส่ง...", "Submitting...")}
                  </>
                ) : (
                  tt("ส่งรายงาน", "Submit report")
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{tt("ยืนยันการส่งรายงาน", "Confirm report submission")}</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <div>{tt("คุณกำลังจะส่งรายงาน:", "You are about to submit:")}</div>
                  <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                    <div>
                      <strong>{tt("ประเภท:", "Type:")}</strong> {reportTypeLabels[reportType]}
                    </div>
                    <div>
                      <strong>{tt("เหตุผล:", "Reason:")}</strong> {selectedReason?.label}
                    </div>
                    {description && (
                      <div>
                        <strong>{tt("รายละเอียด:", "Details:")}</strong> {description.substring(0, 100)}
                        {description.length > 100 && "..."}
                      </div>
                    )}
                  </div>
                  <div className="text-destructive font-medium">{tt("การดำเนินการนี้ไม่สามารถย้อนกลับได้", "This action cannot be undone.")}</div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tt("ยกเลิก", "Cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSubmit} className="bg-destructive hover:bg-destructive/90">
                {tt("ยืนยันส่งรายงาน", "Confirm submission")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  )
}
