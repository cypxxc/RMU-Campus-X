"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { HelpCircle, BookOpen, MessageSquare, ExternalLink } from "lucide-react"
import { useI18n } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
type FAQItem = { q: { th: string; en: string }; a: { th: string; en: string } }

const FAQ: FAQItem[] = [
  {
    q: { th: "วิธีสมัครสมาชิก?", en: "How to register?" },
    a: {
      th: "ใช้อีเมล @rmu.ac.th สมัครได้ที่หน้าหลัก จากนั้นยืนยันอีเมลผ่านลิงก์ที่ส่งให้",
      en: "Use your @rmu.ac.th email to register on the landing page, then verify via the link sent to you.",
    },
  },
  {
    q: { th: "วิธีโพสต์สิ่งของ?", en: "How to post an item?" },
    a: {
      th: "กดปุ่ม + โพสต์สิ่งของ กรอกชื่อ รายละเอียด หมวดหมู่ และอัปโหลดรูป (สูงสุด 5 รูป)",
      en: "Click the + Post item button, fill in title, description, category, and upload images (max 5).",
    },
  },
  {
    q: { th: "วิธีขอรับสิ่งของ?", en: "How to request an item?" },
    a: {
      th: "เปิดรายละเอียดสิ่งที่สนใจ แล้วกดปุ่ม ขอรับสิ่งของ เจ้าของจะตอบรับหรือปฏิเสธ",
      en: "Open the item details and click Request item. The owner will accept or reject.",
    },
  },
  {
    q: { th: "ติดตามการแลกเปลี่ยนอย่างไร?", en: "How to track exchanges?" },
    a: {
      th: "ไปที่เมนู การแลกเปลี่ยนของฉัน ดูสถานะและแชทกับอีกฝ่ายได้",
      en: "Go to My exchanges to view status and chat with the other party.",
    },
  },
  {
    q: { th: "ยืนยันการส่งมอบ/รับของอย่างไร?", en: "How to confirm handoff?" },
    a: {
      th: "เมื่อทั้งสองฝ่ายนัดรับของแล้ว กดปุ่ม ยืนยันส่งมอบ/รับของแล้ว ในหน้าแชทการแลกเปลี่ยน",
      en: "After meeting up, both parties click Confirm handoff in the exchange chat page.",
    },
  },
  {
    q: { th: "รายงานปัญหาหรือผู้ใช้ไม่เหมาะสม?", en: "How to report issues?" },
    a: {
      th: "กดไอคอนธงที่รายการหรือโปรไฟล์เพื่อรายงาน หรือใช้เมนู ช่วยเหลือ เพื่อส่งคำร้องถึงทีมงาน",
      en: "Click the flag icon on an item or profile to report, or use the Help menu to submit a support ticket.",
    },
  },
]

interface HelpBotProps {
  onOpenSupport?: () => void
}

export function HelpBot({ onOpenSupport }: HelpBotProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { tt, locale } = useI18n()

  const handleOpenSupport = () => {
    setOpen(false)
    if (onOpenSupport) {
      onOpenSupport()
    } else {
      const base = pathname || "/dashboard"
      const sep = base.includes("?") ? "&" : "?"
      router.push(`${base}${sep}openSupport=1`)
    }
  }
  const isTh = locale === "th"

  const pick = (o: { th: string; en: string }) => (isTh ? o.th : o.en)

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleContent>
          <div className="absolute bottom-14 right-0 w-[min(calc(100vw-2rem),360px)] rounded-2xl border bg-card shadow-2xl overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
              <h3 className="font-bold flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                {tt("ช่วยเหลือ", "Help")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {tt("คำถามที่พบบ่อยและลิงก์ที่มีประโยชน์", "FAQ and useful links")}
              </p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              <Accordion type="single" collapsible>
                {FAQ.map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border-none">
                    <AccordionTrigger className="py-2 px-3 hover:no-underline hover:bg-muted/50 rounded-lg text-left">
                      <span className="text-sm font-medium">{pick(item.q)}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground px-3 pb-2 pl-5">
                      {pick(item.a)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
            <div className="p-3 border-t bg-muted/20 flex flex-col gap-2">
              <a href="/guide">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <BookOpen className="h-4 w-4" />
                  {tt("คู่มือการใช้งาน", "User Guide")}
                  <ExternalLink className="h-3.5 w-3.5 ml-auto" />
                </Button>
              </a>
              <Button variant="default" size="sm" className="w-full gap-2" onClick={handleOpenSupport}>
                <MessageSquare className="h-4 w-4" />
                {tt("ส่งคำร้องขอความช่วยเหลือ", "Submit support ticket")}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
        <CollapsibleTrigger asChild>
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            aria-label={tt("เปิดเมนูช่วยเหลือ", "Open help menu")}
          >
            <HelpCircle className="h-6 w-6" />
          </Button>
        </CollapsibleTrigger>
      </Collapsible>
    </div>
  )
}
