"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { HelpCircle } from "lucide-react"

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

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return
    if (!user) {
      toast({ title: "กรุณาเข้าสู่ระบบ", variant: "destructive" })
      return
    }
    const sub = subject.trim()
    const desc = description.trim()
    if (!sub.length) {
      toast({ title: "กรุณาระบุหัวข้อ", variant: "destructive" })
      return
    }
    if (sub.length > MAX_SUBJECT) {
      toast({ title: "หัวข้อยาวเกินไป (สูงสุด 200 ตัวอักษร)", variant: "destructive" })
      return
    }
    if (!desc.length) {
      toast({ title: "กรุณากรอกรายละเอียด", variant: "destructive" })
      return
    }
    if (desc.length < MIN_DESCRIPTION) {
      toast({
        title: "รายละเอียดสั้นเกินไป",
        description: "กรุณาอธิบายอย่างน้อย 10 ตัวอักษร เพื่อให้ทีมงานช่วยได้ตรงจุด",
        variant: "destructive",
      })
      return
    }
    if (desc.length > MAX_DESCRIPTION) {
      toast({ title: "รายละเอียดยาวเกินไป (สูงสุด 2000 ตัวอักษร)", variant: "destructive" })
      return
    }

    isSubmittingRef.current = true
    setSubmitting(true)

    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: sub,
          category: "general",
          description: desc,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "ไม่สามารถส่งคำร้องได้")
      }

      toast({
        title: "ส่งคำร้องแล้ว",
        description: "ทีมงานจะอ่านและตอบกลับโดยเร็วที่สุด",
      })
      onOpenChange(false)
    } catch (error: unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถส่งคำร้องได้",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
      setTimeout(() => { isSubmittingRef.current = false }, 500)
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
      title="ส่งคำร้องขอความช่วยเหลือ"
      description="ปัญหาที่พบ หรือ ข้อเสนอแนะ"
      icon={<HelpCircle className="h-5 w-5" />}
      footer={
        <UnifiedModalActions
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
          submitText="ส่งคำร้อง"
          submitDisabled={!isFormValid}
          loading={submitting}
        />
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="support-subject" className="text-sm font-medium">
            หัวข้อ <span className="text-destructive">*</span>
          </Label>
          <Input
            id="support-subject"
            placeholder="ระบุ ปัญหา หรือ ข้อเสนอแนะ"
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
            รายละเอียด <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="support-description"
            placeholder="อธิบายเพิ่มเติม (อย่างน้อย 10 ตัวอักษร)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            rows={4}
            maxLength={MAX_DESCRIPTION}
            className="resize-none"
            aria-describedby="support-description-meta"
          />
          <p id="support-description-meta" className="text-xs text-muted-foreground flex justify-between">
            <span>อย่างน้อย {MIN_DESCRIPTION} ตัวอักษร</span>
            <span>{description.length} / {MAX_DESCRIPTION}</span>
          </p>
        </div>
      </div>
    </UnifiedModal>
  )
}
