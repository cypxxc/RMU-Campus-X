"use client"

import Link from "next/link"
import {
  AlertTriangle,
  BookOpen,
  FileText,
  Handshake,
  Heart,
  MessageCircle,
  ShieldCheck,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useI18n } from "@/components/language-provider"

type LocalizedText = { th: string; en: string }

type GuidelineSection = {
  id: string
  icon: LucideIcon
  title: LocalizedText
  points: LocalizedText[]
}

const GUIDELINES_LAST_UPDATED: LocalizedText = {
  th: "10 กุมภาพันธ์ 2569",
  en: "February 10, 2026",
}

const SECTIONS: GuidelineSection[] = [
  {
    id: "intro",
    icon: BookOpen,
    title: { th: "บทนำ", en: "Introduction" },
    points: [
      {
        th: "RMU-Campus X คือชุมชนสำหรับการแบ่งปันและแลกเปลี่ยนสิ่งของในมหาวิทยาลัย",
        en: "RMU-Campus X is a campus community for sharing and exchanging items.",
      },
      {
        th: "ทุกคนมีส่วนช่วยให้ชุมชนปลอดภัยและเป็นมิตรผ่านพฤติกรรมที่รับผิดชอบ",
        en: "Everyone helps keep the community safe and respectful through responsible behavior.",
      },
    ],
  },
  {
    id: "dos",
    icon: Handshake,
    title: { th: "สิ่งที่ควรทำ", en: "What you should do" },
    points: [
      { th: "สื่อสารด้วยความสุภาพและตรงไปตรงมา", en: "Communicate politely and clearly." },
      { th: "อธิบายสภาพสิ่งของตามความจริง พร้อมรูปที่ชัดเจน", en: "Describe item condition honestly with clear photos." },
      { th: "ตอบกลับแชทภายในเวลาที่เหมาะสม", en: "Respond to chats in a timely manner." },
      { th: "ยืนยันสถานะการแลกเปลี่ยนเมื่อดำเนินการเสร็จจริง", en: "Confirm exchange status only when completed." },
    ],
  },
  {
    id: "donts",
    icon: AlertTriangle,
    title: { th: "สิ่งที่ไม่ควรทำ", en: "What you must avoid" },
    points: [
      { th: "ห้ามโพสต์สิ่งของผิดกฎหมาย อันตราย หรือเนื้อหาไม่เหมาะสม", en: "Do not post illegal/dangerous items or inappropriate content." },
      { th: "ห้ามสแปม โพสต์ซ้ำ หรือจงใจให้ข้อมูลเท็จ", en: "Do not spam, duplicate-post, or provide misleading information." },
      { th: "ห้ามคุกคาม ดูหมิ่น หรือกดดันผู้ใช้รายอื่น", en: "Do not harass, insult, or intimidate other users." },
      { th: "ห้ามนัดรับในจุดเสี่ยงหรือไม่ปลอดภัย", en: "Do not arrange pickup in unsafe locations." },
    ],
  },
  {
    id: "safety",
    icon: ShieldCheck,
    title: { th: "ความปลอดภัยในการนัดรับ", en: "Meetup safety" },
    points: [
      { th: "นัดในพื้นที่สาธารณะภายในมหาวิทยาลัยที่มีผู้คน", en: "Meet in public, populated campus areas." },
      { th: "หากไม่มั่นใจ ให้พาเพื่อนไปด้วยหรือแจ้งคนใกล้ชิด", en: "If unsure, bring a friend or inform someone you trust." },
      { th: "ตรวจสอบรายการก่อนส่งมอบและบันทึกหลักฐานที่จำเป็น", en: "Inspect items before handoff and keep necessary proof." },
      { th: "หากรู้สึกไม่ปลอดภัย ให้ยกเลิกนัดทันที", en: "If you feel unsafe, cancel the meetup immediately." },
    ],
  },
  {
    id: "reporting",
    icon: MessageCircle,
    title: { th: "การรายงานและบทลงโทษ", en: "Reporting and enforcement" },
    points: [
      { th: "ใช้ปุ่มรายงานเมื่อพบพฤติกรรมหรือเนื้อหาที่ผิดกติกา", en: "Use the report feature when you find rule violations." },
      { th: "ทีมงานจะตรวจสอบและดำเนินการตามความเหมาะสม", en: "The admin team will review and take appropriate action." },
      { th: "อาจมีการเตือน ระงับ หรือแบน ตามระดับความรุนแรงของการละเมิด", en: "Actions may include warnings, suspension, or ban depending on severity." },
    ],
  },
]

function pickText(value: LocalizedText, locale: "th" | "en") {
  return locale === "th" ? value.th : value.en
}

export default function GuidelinesPage() {
  const { locale, tt } = useI18n()

  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 max-w-3xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-4">
          <BookOpen className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold mb-2">{tt("แนวทางชุมชน", "Community Guidelines")}</h1>
        <p className="text-muted-foreground mb-2">
          {tt(
            "แนวทางเพื่อให้ชุมชน RMU-Campus X ปลอดภัย เป็นมิตร และใช้งานได้อย่างยั่งยืน",
            "Guidelines to keep RMU-Campus X safe, respectful, and sustainable."
          )}
        </p>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {tt("อัปเดตล่าสุด:", "Last updated:")} {pickText(GUIDELINES_LAST_UPDATED, locale)}
        </p>
      </div>

      <nav className="mb-10 rounded-lg border bg-muted/30 p-4" aria-label={tt("สารบัญ", "Table of contents")}>
        <p className="text-sm font-medium text-muted-foreground mb-3">{tt("สารบัญ", "Table of contents")}</p>
        <ul className="space-y-1.5 text-sm">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="text-primary hover:underline">
                {pickText(section.title, locale)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <section key={section.id} id={section.id} className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                {pickText(section.title, locale)}
              </h2>
              <ul className="list-disc list-outside ml-4 space-y-2 text-muted-foreground leading-relaxed">
                {section.points.map((point, index) => (
                  <li key={index}>{pickText(point, locale)}</li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <div className="mt-8 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground flex items-start gap-2">
        <Heart className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <p>
          {tt("การใช้งานระบบหมายถึงยอมรับ ", "Using this platform means accepting ")}
          <Link href="/terms" className="text-primary hover:underline font-medium">
            {tt("ข้อกำหนดการใช้งาน", "Terms of Service")}
          </Link>
          {tt(" และ ", " and ")}
          <Link href="/privacy" className="text-primary hover:underline font-medium">
            {tt("นโยบายความเป็นส่วนตัว", "Privacy Policy")}
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
