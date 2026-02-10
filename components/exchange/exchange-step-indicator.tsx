"use client"

import { Check } from "lucide-react"
import type { ExchangeStatus } from "@/types"
import { normalizeExchangePhaseStatus } from "@/lib/exchange-state-machine"
import type { Locale } from "@/lib/i18n/config"

const STEP_ORDER: ExchangeStatus[] = ["pending", "in_progress", "completed"]

function stepIndex(status: ExchangeStatus): number {
  const i = STEP_ORDER.indexOf(normalizeExchangePhaseStatus(status))
  return i >= 0 ? i : 0
}

interface ExchangeStepIndicatorProps {
  status: ExchangeStatus
  ownerConfirmed?: boolean
  requesterConfirmed?: boolean
  className?: string
  locale?: Locale
}

export function ExchangeStepIndicator({
  status,
  ownerConfirmed = false,
  requesterConfirmed = false,
  className = "",
  locale = "th",
}: ExchangeStepIndicatorProps) {
  const labelByStatus: Record<ExchangeStatus, string> = {
    pending: locale === "th" ? "รอตอบรับ" : "Pending",
    accepted: locale === "th" ? "กำลังดำเนินการ" : "In progress",
    in_progress: locale === "th" ? "กำลังดำเนินการ" : "In progress",
    completed: locale === "th" ? "เสร็จสิ้น" : "Completed",
    cancelled: locale === "th" ? "ยกเลิกแล้ว" : "Cancelled",
    rejected: locale === "th" ? "ปฏิเสธแล้ว" : "Rejected",
  }
  const steps = STEP_ORDER.map((stepStatus) => ({
    status: stepStatus,
    label: labelByStatus[stepStatus],
  }))
  const effectiveStatus = normalizeExchangePhaseStatus(status)
  const currentIdx = stepIndex(effectiveStatus)
  const isCompleted = effectiveStatus === "completed"
  const waitingOther =
    effectiveStatus === "in_progress" &&
    (ownerConfirmed || requesterConfirmed) &&
    !isCompleted

  return (
    <div
      className={`flex items-center gap-1 sm:gap-2 ${className}`}
      role="list"
      aria-label={locale === "th" ? "ขั้นตอนการแลกเปลี่ยน" : "Exchange progress steps"}
    >
      {steps.map((step, idx) => {
        const isActive = idx === currentIdx
        const isPast = idx < currentIdx || (isCompleted && idx === currentIdx)
        const isLast = idx === steps.length - 1

        return (
          <div key={step.status} className="flex items-center" role="listitem">
            <div
              className={`
                flex items-center justify-center rounded-full w-7 h-7 sm:w-8 sm:h-8 text-xs font-bold shrink-0
                ${isPast ? "bg-green-500 text-white" : ""}
                ${isActive && !isPast ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : ""}
                ${!isActive && !isPast ? "bg-muted text-muted-foreground" : ""}
              `}
              aria-current={isActive ? "step" : undefined}
            >
              {isPast ? <Check className="h-4 w-4" strokeWidth={2.5} /> : idx + 1}
            </div>
            <span
              className={`ml-1.5 text-xs sm:text-sm hidden sm:inline ${
                isActive ? "font-semibold text-foreground" : isPast ? "text-muted-foreground" : "text-muted-foreground/70"
              }`}
            >
              {step.label}
            </span>
            {!isLast && (
              <div
                className={`w-4 sm:w-6 h-0.5 mx-0.5 sm:mx-1 ${idx < currentIdx ? "bg-green-500" : "bg-muted"}`}
                aria-hidden
              />
            )}
          </div>
        )
      })}
      {waitingOther && (
        <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse" role="status">
          {locale === "th" ? "รออีกฝ่ายยืนยัน" : "Waiting for the other party"}
        </span>
      )}
    </div>
  )
}
