"use client"

import {
  Ban,
  FileText,
  Gavel,
  MessageSquareWarning,
  Scale,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/constants"
import { useI18n } from "@/components/language-provider"

type LocalizedText = { th: string; en: string }

type TermsSection = {
  id: string
  icon: LucideIcon
  title: LocalizedText
  points: LocalizedText[]
}

const TERMS_LAST_UPDATED: LocalizedText = {
  th: "10 กุมภาพันธ์ 2569",
  en: "February 10, 2026",
}

const SECTIONS: TermsSection[] = [
  {
    id: "agreement",
    icon: Scale,
    title: { th: "1) ข้อตกลงทั่วไป", en: "1) General agreement" },
    points: [
      {
        th: "การใช้งาน RMU-Campus X ถือว่าคุณยอมรับข้อกำหนดนี้และนโยบายความเป็นส่วนตัว",
        en: "Using RMU-Campus X means you accept these terms and the privacy policy.",
      },
      {
        th: "แพลตฟอร์มนี้มีไว้เพื่อแบ่งปันและแลกเปลี่ยนสิ่งของในชุมชนมหาวิทยาลัย ไม่ใช่เพื่อธุรกิจเชิงพาณิชย์",
        en: "This platform is for campus sharing/exchange, not for commercial business.",
      },
    ],
  },
  {
    id: "eligibility",
    icon: UserCheck,
    title: { th: "2) คุณสมบัติผู้ใช้งาน", en: "2) User eligibility" },
    points: [
      { th: "ต้องเป็นนักศึกษา บุคลากร หรืออาจารย์ของ RMU", en: "You must be an RMU student or staff member." },
      { th: "ต้องลงทะเบียนด้วยอีเมลโดเมน @rmu.ac.th", en: "Registration requires an @rmu.ac.th email." },
      { th: "ต้องยืนยันอีเมลก่อนใช้งานฟังก์ชันหลัก", en: "Email verification is required before full usage." },
    ],
  },
  {
    id: "prohibited",
    icon: Ban,
    title: { th: "3) เนื้อหาและสิ่งของต้องห้าม", en: "3) Prohibited content and items" },
    points: [
      { th: "ห้ามโพสต์สิ่งของผิดกฎหมายหรืออันตราย", en: "No illegal or dangerous items." },
      { th: "ห้ามโพสต์เนื้อหาลามก คุกคาม หรือสร้างความเกลียดชัง", en: "No obscene, harassing, or hateful content." },
      { th: "ห้ามสแปม โพสต์ซ้ำ หรือให้ข้อมูลหลอกลวง", en: "No spam, duplicate posts, or misleading information." },
    ],
  },
  {
    id: "conduct",
    icon: MessageSquareWarning,
    title: { th: "4) การปฏิบัติตนในชุมชน", en: "4) Community conduct" },
    points: [
      { th: "สื่อสารด้วยความสุภาพและให้เกียรติผู้อื่น", en: "Communicate respectfully with other users." },
      { th: "ปฏิบัติตามกติกาและคำแนะนำความปลอดภัยของระบบ", en: "Follow platform rules and safety guidance." },
      { th: "ทีมงานมีสิทธิ์ตรวจสอบและดำเนินการเมื่อพบการละเมิด", en: "The admin team may investigate and act on violations." },
    ],
  },
  {
    id: "security",
    icon: ShieldAlert,
    title: { th: "5) บัญชีและความปลอดภัย", en: "5) Account and security" },
    points: [
      { th: "คุณต้องดูแลรหัสผ่านและการเข้าถึงบัญชีของตนเอง", en: "You are responsible for your password and account access." },
      { th: "หากสงสัยว่าบัญชีถูกใช้งานโดยไม่ได้รับอนุญาต ให้เปลี่ยนรหัสผ่านทันที", en: "If you suspect unauthorized access, change your password immediately." },
      { th: "การกระทำผ่านบัญชีที่ล็อกอินแล้วถือเป็นความรับผิดชอบของเจ้าของบัญชี", en: "Actions made from a signed-in account are the account owner's responsibility." },
    ],
  },
  {
    id: "suspension",
    icon: UserX,
    title: { th: "6) การเตือน ระงับ และแบน", en: "6) Warnings, suspension, and ban" },
    points: [
      { th: "เมื่อได้รับคำเตือนครบ 3 ครั้ง ระบบจะระงับการใช้งาน 7 วัน", en: "After 3 warnings, the account is suspended for 7 days." },
      { th: "หากถูกระงับครบ 2 ครั้ง ระบบอาจแบนถาวรโดยอัตโนมัติ", en: "After 2 suspensions, the account may be permanently banned." },
      {
        th: `หากต้องการอุทธรณ์หรือสอบถาม ติดต่อทีมสนับสนุนที่ ${SUPPORT_EMAIL}`,
        en: `For appeals or questions, contact support at ${SUPPORT_EMAIL}.`,
      },
    ],
  },
  {
    id: "liability",
    icon: Gavel,
    title: { th: "7) ข้อจำกัดความรับผิด", en: "7) Limitation of liability" },
    points: [
      { th: "RMU-Campus X เป็นแพลตฟอร์มกลาง ไม่ใช่คู่สัญญาในการแลกเปลี่ยน", en: "RMU-Campus X is an intermediary platform, not a direct party in exchanges." },
      { th: "ผู้ใช้ต้องตรวจสอบคู่แลกเปลี่ยนและสภาพสิ่งของก่อนตกลงด้วยตนเอง", en: "Users must verify counterparties and item conditions themselves." },
      { th: "ควรนัดรับในจุดสาธารณะและปลอดภัยภายในมหาวิทยาลัย", en: "Always meet in safe public campus locations." },
    ],
  },
]

function pickText(value: LocalizedText, locale: "th" | "en") {
  return locale === "th" ? value.th : value.en
}

export default function TermsPage() {
  const { locale, tt } = useI18n()

  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 max-w-3xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-4">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold mb-2">{tt("ข้อกำหนดและเงื่อนไขการใช้งาน", "Terms of Service")}</h1>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {tt("อัปเดตล่าสุด:", "Last updated:")} {pickText(TERMS_LAST_UPDATED, locale)}
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
                {section.points.map((point, index) => {
                  if (section.id === "suspension" && index === section.points.length - 1) {
                    return (
                      <li key={index}>
                        {pickText(
                          {
                            th: "หากต้องการอุทธรณ์หรือสอบถาม ติดต่อทีมสนับสนุนที่ ",
                            en: "For appeals or questions, contact support at ",
                          },
                          locale
                        )}
                        <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
                          {SUPPORT_EMAIL}
                        </a>
                      </li>
                    )
                  }
                  return <li key={index}>{pickText(point, locale)}</li>
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
