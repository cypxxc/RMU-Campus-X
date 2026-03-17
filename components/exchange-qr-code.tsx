"use client"

import { QRCodeSVG } from "qrcode.react"
import { useI18n } from "@/components/language-provider"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { QrCode } from "lucide-react"

interface ExchangeQRCodeProps {
  exchangeId: string
}

export function ExchangeQRCode({ exchangeId }: ExchangeQRCodeProps) {
  const { tt } = useI18n()
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const chatUrl = `${baseUrl}/chat/${exchangeId}`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-9 gap-2">
          <QrCode className="h-4 w-4" />
          <span className="hidden sm:inline">{tt("QR Code", "QR Code")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-4">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-center">
            {tt("สแกนเพื่อเปิดหน้าพูดคุย", "Scan to open chat")}
          </p>
          <div className="bg-white p-3 rounded-lg">
            <QRCodeSVG value={chatUrl} size={160} level="M" />
          </div>
          <p className="text-xs text-muted-foreground max-w-[200px] text-center">
            {tt("ใช้เมื่อนัดรับของ เพื่อให้อีกฝ่ายเปิดหน้านี้ได้เร็ว", "Use when meeting up so the other party can open this page quickly.")}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
