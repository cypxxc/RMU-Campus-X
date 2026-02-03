"use client"

import { useState, useRef } from "react"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HelpCircle } from "lucide-react"

import type { SupportTicketCategory } from "@/types"

interface SupportTicketModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const categoryOptions: { value: SupportTicketCategory; label: string; icon: string }[] = [
  { value: "general", label: "คำถามทั่วไป", icon: "❓" },
  { value: "bug", label: "แจ้งข้อผิดพลาด", icon: "🐛" },
  { value: "feature", label: "เสนอแนะฟังก์ชัน", icon: "💡" },
  { value: "account", label: "ปัญหาบัญชี", icon: "👤" },
  { value: "exchange", label: "ปัญหาการแลกเปลี่ยน", icon: "🔄" },
  { value: "other", label: "อื่นๆ", icon: "📦" },
]

export function SupportTicketModal({ open, onOpenChange }: SupportTicketModalProps) {
  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState<SupportTicketCategory>("general")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const isSubmittingRef = useRef(false) // Ref to prevent double submission
  const { user } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async () => {
    // Prevent double submission with ref (works faster than state)
    if (isSubmittingRef.current) {
      console.log("[SupportModal] Prevented double submission")
      return
    }
    
    if (!user) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        variant: "destructive"
      })
      return
    }

    if (!subject.trim() || !description.trim()) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบ",
        description: "หัวข้อและรายละเอียดเป็นข้อมูลที่จำเป็น",
        variant: "destructive"
      })
      return
    }

    // Lock submission
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
          subject: subject.trim(),
          category,
          description: description.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "ไม่สามารถส่งคำร้องได้")
      }

      toast({
        title: "ส่งคำร้องสำเร็จ",
        description: "ทีมงานจะตอบกลับโดยเร็วที่สุด",
      })

      // Reset form and close
      setSubject("")
      setCategory("general")
      setDescription("")
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error?.message || "ไม่สามารถส่งคำร้องได้",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
      // Unlock after a short delay to prevent rapid re-clicks
      setTimeout(() => {
        isSubmittingRef.current = false
      }, 500)
    }
  }

  const isFormValid = subject.trim() !== "" && description.trim() !== ""

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="ส่งคำร้องขอความช่วยเหลือ"
      description="กรอกรายละเอียดปัญหาหรือคำถามของคุณ ทีมงานจะตอบกลับโดยเร็วที่สุด"
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
        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="subject" className="text-sm font-semibold">
            หัวข้อ <span className="text-destructive">*</span>
          </Label>
          <Input
            id="subject"
            placeholder="เช่น ไม่สามารถโพสต์สิ่งของได้"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={submitting}
            className="h-11"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-semibold">
            หมวดหมู่
          </Label>
          <Select 
            value={category} 
            onValueChange={(val) => setCategory(val as SupportTicketCategory)} 
            disabled={submitting}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="เลือกหมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-semibold">
            รายละเอียด <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="อธิบายปัญหาหรือคำถามของคุณให้ละเอียด..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            rows={5}
            className="resize-none"
          />
        </div>
      </div>
    </UnifiedModal>
  )
}
