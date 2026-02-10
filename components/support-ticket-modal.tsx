"use client"

import { useEffect, useRef, useState } from "react"
import { HelpCircle } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useI18n } from "@/components/language-provider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"
import { useToast } from "@/hooks/use-toast"

const MIN_DESCRIPTION = 10
const MAX_SUBJECT = 200
const MAX_DESCRIPTION = 2000

interface SupportTicketModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SupportTicketModal({ open, onOpenChange }: SupportTicketModalProps) {
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const { tt } = useI18n()

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return

    if (!user) {
      toast({ title: tt("กรุณาเข้าสู่ระบบ", "Please sign in"), variant: "destructive" })
      return
    }

    const normalizedSubject = subject.trim()
    const normalizedDescription = description.trim()

    if (!normalizedSubject.length) {
      toast({ title: tt("กรุณาระบุหัวข้อ", "Please enter subject"), variant: "destructive" })
      return
    }

    if (normalizedSubject.length > MAX_SUBJECT) {
      toast({
        title: tt(
          "หัวข้อยาวเกินไป (สูงสุด 200 ตัวอักษร)",
          "Subject is too long (max 200 characters)"
        ),
        variant: "destructive",
      })
      return
    }

    if (!normalizedDescription.length) {
      toast({ title: tt("กรุณากรอกรายละเอียด", "Please enter details"), variant: "destructive" })
      return
    }

    if (normalizedDescription.length < MIN_DESCRIPTION) {
      toast({
        title: tt("รายละเอียดสั้นเกินไป", "Description is too short"),
        description: tt(
          "กรุณาอธิบายอย่างน้อย 10 ตัวอักษร เพื่อให้ทีมงานช่วยได้ตรงจุด",
          "Please provide at least 10 characters so support can help effectively."
        ),
        variant: "destructive",
      })
      return
    }

    if (normalizedDescription.length > MAX_DESCRIPTION) {
      toast({
        title: tt(
          "รายละเอียดยาวเกินไป (สูงสุด 2000 ตัวอักษร)",
          "Description is too long (max 2000 characters)"
        ),
        variant: "destructive",
      })
      return
    }

    isSubmittingRef.current = true
    setSubmitting(true)

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: normalizedSubject,
          category: "general",
          description: normalizedDescription,
        }),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload?.error || tt("ไม่สามารถส่งคำร้องได้", "Unable to send ticket"))
      }

      toast({
        title: tt("ส่งคำร้องแล้ว", "Ticket submitted"),
        description: tt(
          "ทีมงานจะอ่านและตอบกลับโดยเร็วที่สุด",
          "Support team will review and reply as soon as possible."
        ),
      })
      onOpenChange(false)
    } catch (error: unknown) {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description:
          error instanceof Error ? error.message : tt("ไม่สามารถส่งคำร้องได้", "Unable to send ticket"),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
      setTimeout(() => {
        isSubmittingRef.current = false
      }, 500)
    }
  }

  const isFormValid =
    subject.trim().length > 0 &&
    description.trim().length >= MIN_DESCRIPTION &&
    subject.trim().length <= MAX_SUBJECT &&
    description.trim().length <= MAX_DESCRIPTION

  useEffect(() => {
    if (!open) {
      setSubject("")
      setDescription("")
    }
  }, [open])

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={tt("ส่งคำร้องขอความช่วยเหลือ", "Submit support ticket")}
      description={tt("ปัญหาที่พบ หรือ ข้อเสนอแนะ", "Issue report or feedback")}
      icon={<HelpCircle className="h-5 w-5" />}
      footer={
        <UnifiedModalActions
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
          submitText={tt("ส่งคำร้อง", "Submit")}
          submitDisabled={!isFormValid}
          loading={submitting}
        />
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="support-subject" className="text-sm font-medium">
            {tt("หัวข้อ", "Subject")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="support-subject"
            placeholder={tt("ระบุ ปัญหา หรือ ข้อเสนอแนะ", "Summarize your issue or suggestion")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={submitting}
            maxLength={MAX_SUBJECT}
            className="h-11"
            aria-describedby="support-subject-count"
          />
          <p id="support-subject-count" className="text-xs text-muted-foreground text-right">
            {subject.length} / {MAX_SUBJECT}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="support-description" className="text-sm font-medium">
            {tt("รายละเอียด", "Details")} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="support-description"
            placeholder={tt(
              "อธิบายเพิ่มเติม (อย่างน้อย 10 ตัวอักษร)",
              "Provide details (minimum 10 characters)"
            )}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            rows={4}
            maxLength={MAX_DESCRIPTION}
            className="resize-none"
            aria-describedby="support-description-meta"
          />
          <p id="support-description-meta" className="text-xs text-muted-foreground flex justify-between">
            <span>
              {tt("อย่างน้อย", "At least")} {MIN_DESCRIPTION} {tt("ตัวอักษร", "characters")}
            </span>
            <span>
              {description.length} / {MAX_DESCRIPTION}
            </span>
          </p>
        </div>
      </div>
    </UnifiedModal>
  )
}
