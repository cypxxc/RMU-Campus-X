"use client"

import { Loader2 } from "lucide-react"
import { useI18n } from "@/components/language-provider"

export default function Loading() {
  const { tt } = useI18n()

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{tt("กำลังโหลด...", "Loading...")}</p>
    </div>
  )
}
