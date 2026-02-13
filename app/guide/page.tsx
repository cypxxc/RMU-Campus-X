"use client"

import {
  BookOpen,
  FileText,
  Flag,
  Handshake,
  Heart,
  MessageSquare,
  Package,
  Search,
  UserPlus,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useI18n } from "@/components/language-provider"

type LocalizedText = { th: string; en: string }

type GuideSection = {
  id: string
  icon: LucideIcon
  title: LocalizedText
  steps: LocalizedText[]
}

const GUIDE_LAST_UPDATED: LocalizedText = {
  th: "10 กุมภาพันธ์ 2569",
  en: "February 10, 2026",
}

const SECTIONS: GuideSection[] = [
  {
    id: "register",
    icon: UserPlus,
    title: {
      th: "สมัครสมาชิกและยืนยันอีเมล",
      en: "Register and verify email",
    },
    steps: [
      { th: "กดปุ่มสมัครสมาชิกจากหน้าแรก", en: "Click Register on the landing page." },
      { th: "ใช้อีเมล @rmu.ac.th และตั้งรหัสผ่าน", en: "Use your @rmu.ac.th email and set a password." },
      { th: "เปิดอีเมลและกดลิงก์ยืนยันตัวตน", en: "Open your inbox and confirm your email link." },
      { th: "หลังยืนยันแล้วเข้าสู่ระบบได้ทันที", en: "After verification, you can sign in immediately." },
    ],
  },
  {
    id: "post",
    icon: Package,
    title: {
      th: "โพสต์สิ่งของ",
      en: "Post an item",
    },
    steps: [
      { th: "กดปุ่มโพสต์สิ่งของ (+)", en: "Click Post item (+)." },
      { th: "กรอกชื่อ รายละเอียด หมวดหมู่ และจุดนัดรับ", en: "Fill in title, description, category, and pickup location." },
      { th: "อัปโหลดรูปได้สูงสุด 5 รูป", en: "Upload up to 5 images." },
      { th: "กดโพสต์เพื่อเผยแพร่รายการ", en: "Submit to publish your listing." },
    ],
  },
  {
    id: "search-request",
    icon: Search,
    title: {
      th: "ค้นหาและขอรับสิ่งของ",
      en: "Browse and request items",
    },
    steps: [
      { th: "ใช้ช่องค้นหาและตัวกรองในหน้าแดชบอร์ด", en: "Use search and filters on the dashboard." },
      { th: "เปิดรายละเอียดสิ่งของที่สนใจ", en: "Open the item details you are interested in." },
      { th: "กดขอรับสิ่งของเพื่อเริ่มการติดต่อ", en: "Click Request item to start the process." },
      { th: "เจ้าของรายการจะตอบรับหรือปฏิเสธคำขอ", en: "The owner can accept or reject your request." },
    ],
  },
  {
    id: "exchange-chat",
    icon: MessageSquare,
    title: {
      th: "แชทและติดตามการแลกเปลี่ยน",
      en: "Chat and track exchange",
    },
    steps: [
      { th: "เมื่อมีการขอรับ ระบบจะสร้างห้องแชทอัตโนมัติ", en: "A chat room is created automatically after request." },
      { th: "คุยรายละเอียดเรื่องเวลาและสถานที่นัดรับ", en: "Discuss schedule and pickup location in chat." },
      { th: "ติดตามสถานะจากเมนูการแลกเปลี่ยนของฉัน", en: "Track status from My exchanges." },
      { th: "ยืนยันเมื่อส่งมอบและรับของเรียบร้อย", en: "Confirm after handoff is completed." },
    ],
  },
  {
    id: "meet-confirm",
    icon: Handshake,
    title: {
      th: "นัดรับและยืนยันผล",
      en: "Meetup and confirmation",
    },
    steps: [
      { th: "นัดรับในจุดสาธารณะที่ปลอดภัยภายในมหาวิทยาลัย", en: "Meet at a safe public location on campus." },
      { th: "ตรวจสอบสิ่งของก่อนส่งมอบ/รับ", en: "Inspect the item before handoff." },
      { th: "ผู้ให้และผู้รับกดยืนยันคนละฝั่ง", en: "Both owner and requester confirm from their side." },
      { th: "เมื่อยืนยันครบ สถานะจะเป็นเสร็จสิ้น", en: "Once both confirm, status changes to completed." },
    ],
  },
  {
    id: "favorites",
    icon: Heart,
    title: {
      th: "รายการโปรด",
      en: "Favorites",
    },
    steps: [
      { th: "กดไอคอนหัวใจเพื่อบันทึกรายการที่สนใจ", en: "Click the heart icon to save interesting items." },
      { th: "ดูรายการทั้งหมดได้จากหน้า Favorites", en: "View all saved items on the Favorites page." },
      { th: "กดหัวใจอีกครั้งเพื่อนำออกจากรายการโปรด", en: "Click the heart again to remove it from favorites." },
    ],
  },
  {
    id: "report",
    icon: Flag,
    title: {
      th: "การรายงานและขอความช่วยเหลือ",
      en: "Report and support",
    },
    steps: [
      { th: "ใช้ปุ่มรายงานเมื่อพบเนื้อหาหรือพฤติกรรมไม่เหมาะสม", en: "Use Report when you find inappropriate content or behavior." },
      { th: "ใช้เมนูช่วยเหลือเพื่อส่งคำร้องถึงทีมงาน", en: "Use Support menu to submit a ticket to the team." },
      { th: "ติดตามคำตอบได้จากหน้าคำร้องของฉัน", en: "Track replies from your ticket history." },
    ],
  },
]

function pickText(value: LocalizedText, locale: "th" | "en") {
  return locale === "th" ? value.th : value.en
}

export default function GuidePage() {
  const { locale, tt } = useI18n()

  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 max-w-3xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-4">
          <BookOpen className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold mb-2">{tt("คู่มือการใช้งาน", "User Guide")}</h1>
        <p className="text-muted-foreground mb-2">
          {tt(
            "RMU-Campus X — คู่มือใช้งานแพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษา",
            "RMU-Campus X — Usage guide for the campus item exchange platform."
          )}
        </p>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {tt("อัปเดตล่าสุด:", "Last updated:")} {pickText(GUIDE_LAST_UPDATED, locale)}
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

      <div className="space-y-10">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <section key={section.id} id={section.id} className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                {pickText(section.title, locale)}
              </h2>
              <ol className="space-y-3 list-decimal list-inside text-muted-foreground leading-relaxed">
                {section.steps.map((step, index) => (
                  <li key={index}>{pickText(step, locale)}</li>
                ))}
              </ol>
            </section>
          )
        })}
      </div>
    </div>
  )
}
