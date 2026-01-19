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

// Report reasons by type
const REPORT_REASONS = {
  item_report: [
    { code: "item_fake_info", label: "ข้อมูลสิ่งของไม่ถูกต้องหรือเท็จ" },
    { code: "item_wrong_image", label: "รูปภาพไม่ตรงกับของจริง" },
    { code: "item_illegal", label: "สิ่งของผิดกฎหมายหรือของต้องห้าม" },
    { code: "item_inappropriate", label: "เนื้อหาไม่เหมาะสม" },
    { code: "item_scam", label: "แฝงการขายหรือหลอกลวง" },
    { code: "item_spam", label: "โพสต์ซ้ำ / สแปม" },
    { code: "item_incomplete", label: "รายละเอียดไม่ครบถ้วน" },
    { code: "other", label: "อื่นๆ (ต้องกรอกรายละเอียด)" },
  ],
  exchange_report: [
    { code: "exchange_no_show", label: "ไม่มาตามนัด" },
    { code: "exchange_breach", label: "ผิดข้อตกลง" },
    { code: "exchange_change_terms", label: "เปลี่ยนเงื่อนไขกะทันหัน" },
    { code: "exchange_cancel", label: "ยกเลิกโดยไม่มีเหตุผล" },
    { code: "exchange_suspicious", label: "พฤติกรรมน่าสงสัย" },
    { code: "exchange_inappropriate", label: "สื่อสารไม่เหมาะสม" },
    { code: "other", label: "อื่นๆ (ต้องกรอกรายละเอียด)" },
  ],
  chat_report: [
    { code: "chat_abusive", label: "ใช้คำหยาบหรือคุกคาม" },
    { code: "chat_sexual", label: "คุกคามทางเพศ" },
    { code: "chat_threat", label: "ข่มขู่" },
    { code: "chat_spam", label: "ส่งสแปมหรือลิงก์อันตราย" },
    { code: "chat_phishing", label: "หลอกขอข้อมูลส่วนตัว" },
    { code: "chat_inappropriate", label: "เนื้อหาไม่เหมาะสม" },
    { code: "other", label: "อื่นๆ (ต้องกรอกรายละเอียด)" },
  ],
  user_report: [
    { code: "user_impersonation", label: "แอบอ้างบุคคลอื่น" },
    { code: "user_fake_info", label: "ให้ข้อมูลเท็จ" },
    { code: "user_repeated_violation", label: "พฤติกรรมไม่เหมาะสมซ้ำๆ" },
    { code: "user_frequent_cancel", label: "ยกเลิกบ่อยผิดปกติ" },
    { code: "user_rule_violation", label: "ละเมิดกฎชุมชน" },
    { code: "user_scammer", label: "ต้องสงสัยว่าเป็นมิจฉาชีพ" },
    { code: "other", label: "อื่นๆ (ต้องกรอกรายละเอียด)" },
  ],
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  item_report: "รายงานสิ่งของ",
  exchange_report: "รายงานการแลกเปลี่ยน",
  chat_report: "รายงานแชท",
  user_report: "รายงานผู้ใช้",
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

  // Determine report type from URL params
  useEffect(() => {
    if (exchangeId) setReportType("exchange_report")
    else if (chatId) setReportType("chat_report")
    else if (userId) setReportType("user_report")
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
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error?.message || "ไม่สามารถโหลดข้อมูลได้",
        variant: "destructive",
      })
    }
  }

  const currentReasons = REPORT_REASONS[reportType] || []
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
      const reportData: any = {
        reportType,
        reasonCode,
        reason: selectedReason?.label || "",
        description: description.trim() || "ไม่มีรายละเอียดเพิ่มเติม",
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
        throw new Error(err?.error || "ไม่สามารถส่งรายงานได้")
      }

      toast({
        title: "รายงานสำเร็จ",
        description: "รายงานของคุณจะถูกตรวจสอบโดยผู้ดูแลระบบ",
      })

      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error?.message || "ไม่สามารถส่งรายงานได้",
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
                <CardTitle className="text-2xl">รายงานปัญหา</CardTitle>
                <CardDescription>
                  {item?.title || "กรุณากรอกข้อมูลด้านล่างเพื่อส่งรายงาน"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Report Type */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">ประเภทการรายงาน</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)} disabled={!!itemId || !!exchangeId || !!chatId || !!userId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="item_report">รายงานสิ่งของ</SelectItem>
                  <SelectItem value="exchange_report">รายงานการแลกเปลี่ยน</SelectItem>
                  <SelectItem value="chat_report">รายงานแชท</SelectItem>
                  <SelectItem value="user_report">รายงานผู้ใช้</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">เลือกประเภทของปัญหาที่คุณต้องการรายงาน</p>
            </div>

            {/* Reason */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">เหตุผลในการรายงาน *</Label>
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
                รายละเอียดเพิ่มเติม {isOtherReason && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="description"
                placeholder={isOtherReason ? "กรุณาอธิบายปัญหาโดยละเอียด..." : "ข้อมูลเพิ่มเติม (ถ้ามี)"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                maxLength={500}
                required={isOtherReason}
              />
              <p className="text-sm text-muted-foreground">{description.length}/500 ตัวอักษร</p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">ข้อมูลสำคัญ</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>รายงานจะถูกตรวจสอบโดยผู้ดูแลระบบ</li>
                  <li>การรายงานเท็จอาจส่งผลต่อบัญชีของคุณ</li>
                  <li>คุณจะได้รับการแจ้งเตือนเมื่อมีการดำเนินการ</li>
                </ul>
              </div>
            </div>

            {/* Confirmation */}
            <div className="flex items-start space-x-2">
              <Checkbox id="confirm" checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} />
              <Label htmlFor="confirm" className="text-sm font-normal cursor-pointer leading-relaxed">
                ฉันยืนยันว่าข้อมูลที่ให้ไว้เป็นความจริง และเข้าใจว่าการรายงานเท็จอาจส่งผลต่อบัญชีของฉัน
              </Label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="flex-1">
                ยกเลิก
              </Button>
              <Button onClick={handleSubmitClick} disabled={!isFormValid || loading} variant="destructive" className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังส่ง...
                  </>
                ) : (
                  "ส่งรายงาน"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันการส่งรายงาน</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <div>คุณกำลังจะส่งรายงาน:</div>
                  <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                    <div>
                      <strong>ประเภท:</strong> {REPORT_TYPE_LABELS[reportType]}
                    </div>
                    <div>
                      <strong>เหตุผล:</strong> {selectedReason?.label}
                    </div>
                    {description && (
                      <div>
                        <strong>รายละเอียด:</strong> {description.substring(0, 100)}
                        {description.length > 100 && "..."}
                      </div>
                    )}
                  </div>
                  <div className="text-destructive font-medium">การดำเนินการนี้ไม่สามารถย้อนกลับได้</div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSubmit} className="bg-destructive hover:bg-destructive/90">
                ยืนยันส่งรายงาน
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
