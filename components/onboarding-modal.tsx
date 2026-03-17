"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Package, Search, MessageSquare, Handshake } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useI18n } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { authFetchJson } from "@/lib/api-client"

const STEPS = [
  { icon: Package, th: "โพสต์สิ่งของ", en: "Post items" },
  { icon: Search, th: "ค้นหาและขอรับ", en: "Browse and request" },
  { icon: MessageSquare, th: "แชทและนัดรับ", en: "Chat and arrange pickup" },
  { icon: Handshake, th: "ยืนยันการส่งมอบ", en: "Confirm handoff" },
]

interface OnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OnboardingModal({ open, onOpenChange }: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const { markOnboardingSeen } = useAuth()
  const { tt, locale } = useI18n()
  const isTh = locale === "th"

  const current = STEPS[step]
  const Icon = current?.icon ?? Package
  const title = current ? (isTh ? current.th : current.en) : ""

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = async () => {
    setSubmitting(true)
    try {
      await authFetchJson("/api/users/me/complete-onboarding", { method: "POST" })
      markOnboardingSeen?.()
      onOpenChange(false)
    } catch {
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {tt("ยินดีต้อนรับสู่ RMU-Campus X", "Welcome to RMU-Campus X")}
          </DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <p className="text-muted-foreground text-center mb-6">
            {step + 1} / {STEPS.length}
          </p>
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <p className="font-semibold text-lg">{title}</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {step === 0 && (isTh ? "โพสต์สิ่งของที่ไม่ใช้แล้ว หรือขอรับของที่ต้องการจากเพื่อนนักศึกษา" : "Post unused items or request what you need from fellow students")}
              {step === 1 && (isTh ? "ค้นหาในแดชบอร์ด แล้วกดขอรับสิ่งของที่สนใจ เจ้าของจะตอบรับหรือปฏิเสธ" : "Search on the dashboard and request items you like. The owner will accept or reject.")}
              {step === 2 && (isTh ? "แชทกับอีกฝ่ายเพื่อนัดเวลาและสถานที่รับของ" : "Chat with the other party to arrange time and pickup location.")}
              {step === 3 && (isTh ? "เมื่อทั้งสองฝ่ายนัดรับของแล้ว กดปุ่มยืนยันการส่งมอบ/รับของในหน้าแชท" : "When both meet up, click the confirm handoff button in the chat page.")}
            </p>
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {tt("ก่อนหน้า", "Back")}
            </Button>
            {step === 0 && (
              <Button variant="ghost" size="sm" onClick={handleComplete} disabled={submitting}>
                {tt("ข้าม", "Skip")}
              </Button>
            )}
          </div>
          <Button onClick={handleNext} disabled={submitting}>
            {step < STEPS.length - 1
              ? (tt("ถัดไป", "Next") + " ")
              : tt("เริ่มใช้งาน", "Get started")}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
