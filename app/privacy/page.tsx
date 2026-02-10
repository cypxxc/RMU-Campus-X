"use client"

import {
  Cookie,
  Database,
  Eye,
  FileText,
  Lock,
  Server,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useI18n } from "@/components/language-provider"

type LocalizedText = { th: string; en: string }

type PrivacySection = {
  id: string
  icon: LucideIcon
  title: LocalizedText
  points: LocalizedText[]
}

const PRIVACY_LAST_UPDATED: LocalizedText = {
  th: "10 กุมภาพันธ์ 2569",
  en: "February 10, 2026",
}

const INTRO_PARAGRAPHS: LocalizedText[] = [
  {
    th: "RMU-Campus X ให้ความสำคัญกับความเป็นส่วนตัวของผู้ใช้งาน นโยบายนี้อธิบายการเก็บ ใช้ และปกป้องข้อมูลของคุณเมื่อใช้งานระบบ",
    en: "RMU-Campus X values your privacy. This policy explains how we collect, use, and protect your information.",
  },
  {
    th: "เราออกแบบระบบโดยยึดหลัก PAPA (Privacy, Accuracy, Property, Accessibility) เพื่อสร้างบริการที่ปลอดภัย โปร่งใส และตรวจสอบได้",
    en: "We design the platform based on PAPA principles (Privacy, Accuracy, Property, Accessibility) for safe and transparent service.",
  },
]

const SECTIONS: PrivacySection[] = [
  {
    id: "data",
    icon: Database,
    title: {
      th: "1) ข้อมูลที่เราเก็บ",
      en: "1) Data we collect",
    },
    points: [
      { th: "ข้อมูลบัญชี: อีเมล @rmu.ac.th ชื่อแสดง และรูปโปรไฟล์", en: "Account data: @rmu.ac.th email, display name, and profile photo." },
      { th: "ข้อมูลการใช้งาน: รายการสิ่งของ การแลกเปลี่ยน แชท และการแจ้งเตือน", en: "Usage data: item listings, exchanges, chat, and notifications." },
      { th: "ข้อมูลสนับสนุน: คำร้องขอความช่วยเหลือและประวัติการติดต่อทีมงาน", en: "Support data: help tickets and communication history." },
    ],
  },
  {
    id: "usage",
    icon: Eye,
    title: {
      th: "2) วัตถุประสงค์การใช้ข้อมูล",
      en: "2) How we use your data",
    },
    points: [
      { th: "ยืนยันตัวตนและป้องกันการใช้งานที่ไม่เหมาะสม", en: "To verify identity and prevent abuse." },
      { th: "ให้บริการโพสต์ ขอรับ แชท และติดตามสถานะการแลกเปลี่ยน", en: "To provide posting, requesting, chat, and exchange tracking." },
      { th: "แจ้งเตือนเหตุการณ์สำคัญและตอบคำร้องช่วยเหลือ", en: "To send key notifications and respond to support requests." },
    ],
  },
  {
    id: "security",
    icon: ShieldAlert,
    title: {
      th: "3) ความปลอดภัยของข้อมูล",
      en: "3) Data security",
    },
    points: [
      { th: "ใช้ระบบยืนยันตัวตนและกฎการเข้าถึงข้อมูลตามบทบาทผู้ใช้", en: "We use authentication and role-based access controls." },
      { th: "จำกัดการเข้าถึงข้อมูลที่ละเอียดอ่อนเฉพาะผู้เกี่ยวข้อง", en: "Sensitive data access is restricted to authorized personnel only." },
      { th: "บันทึกเหตุการณ์สำคัญเพื่อช่วยตรวจสอบและรับมือความผิดปกติ", en: "Important events are logged for auditing and incident response." },
    ],
  },
  {
    id: "cookies",
    icon: Cookie,
    title: {
      th: "4) คุกกี้และการจัดเก็บฝั่งผู้ใช้",
      en: "4) Cookies and local storage",
    },
    points: [
      { th: "ใช้คุกกี้เพื่อจดจำสถานะภาษา ธีม และการยืนยันตัวตน", en: "Cookies are used for locale, theme, and auth session preferences." },
      { th: "ใช้ local/session storage เพื่อประสบการณ์ใช้งานที่ต่อเนื่อง", en: "Local/session storage is used for a smooth user experience." },
      { th: "คุณสามารถจัดการคุกกี้จากเบราว์เซอร์ได้ทุกเวลา", en: "You may manage cookies through your browser settings at any time." },
    ],
  },
  {
    id: "deletion",
    icon: Server,
    title: {
      th: "5) สิทธิ์ในการลบข้อมูล",
      en: "5) Account and data deletion",
    },
    points: [
      { th: "คุณสามารถลบบัญชีจากหน้าการตั้งค่าโปรไฟล์ได้ด้วยตนเอง", en: "You can delete your account from profile settings." },
      { th: "หลังลบบัญชี ระบบจะลบ/ตัดการเชื่อมโยงข้อมูลตามนโยบายที่กำหนด", en: "After deletion, linked data is removed or anonymized based on policy." },
      { th: "หากต้องการความช่วยเหลือเพิ่มเติม สามารถติดต่อทีมสนับสนุนได้", en: "If you need assistance, contact the support team." },
    ],
  },
]

function pickText(value: LocalizedText, locale: "th" | "en") {
  return locale === "th" ? value.th : value.en
}

export default function PrivacyPage() {
  const { locale, tt } = useI18n()

  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 max-w-3xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-4">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold mb-2">{tt("นโยบายความเป็นส่วนตัว", "Privacy Policy")}</h1>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {tt("อัปเดตล่าสุด:", "Last updated:")} {pickText(PRIVACY_LAST_UPDATED, locale)}
        </p>
      </div>

      <nav className="mb-10 rounded-lg border bg-muted/30 p-4" aria-label={tt("สารบัญ", "Table of contents")}>
        <p className="text-sm font-medium text-muted-foreground mb-3">{tt("สารบัญ", "Table of contents")}</p>
        <ul className="space-y-1.5 text-sm">
          <li>
            <a href="#intro" className="text-primary hover:underline">
              {tt("บทนำ", "Introduction")}
            </a>
          </li>
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
        <section id="intro" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            {tt("บทนำและหลักการคุ้มครองข้อมูล", "Introduction and principles")}
          </h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            {INTRO_PARAGRAPHS.map((paragraph, index) => (
              <p key={index}>{pickText(paragraph, locale)}</p>
            ))}
          </div>
        </section>

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
    </div>
  )
}
