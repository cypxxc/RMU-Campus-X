"use client"

import { BookOpen, Building2, Heart, Mail, MessageSquare, Package, Users } from "lucide-react"
import Link from "next/link"
import { useI18n } from "@/components/language-provider"

const ABOUT_CONTENT = {
  th: {
    title: "เกี่ยวกับเรา",
    subtitle: "RMU-Campus X — แพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษา มหาวิทยาลัยราชภัฏมหาสารคาม",
    mission: {
      title: "พันธกิจ",
      text: "เรามุ่งสร้างชุมชนแห่งการแบ่งปันในมหาวิทยาลัย โดยให้นักศึกษาสามารถแลกเปลี่ยนสิ่งของที่ไม่ได้ใช้งานแล้วกับเพื่อนร่วมสถาบันได้อย่างปลอดภัยและง่ายดาย",
    },
    features: [
      { icon: Package, title: "แลกเปลี่ยนสิ่งของ", desc: "โพสต์สิ่งของที่ต้องการแบ่งปัน หรือขอรับสิ่งของที่ต้องการ" },
      { icon: MessageSquare, title: "แชทในระบบ", desc: "ติดต่อกันผ่านแชทในระบบ พร้อมแจ้งเตือนผ่าน LINE" },
      { icon: Heart, title: "ปลอดภัยและตรวจสอบได้", desc: "ยืนยันอีเมล @rmu.ac.th และมีระบบรีวิวความน่าเชื่อถือ" },
    ],
    team: {
      title: "ทีมพัฒนา",
      text: "พัฒนาโดยนักศึกษาคณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยราชภัฏมหาสารคาม",
    },
    contact: {
      title: "ติดต่อเรา",
      text: "มีคำถามหรือต้องการความช่วยเหลือ?",
      link: "ส่งคำร้องขอความช่วยเหลือ",
    },
    links: [
      { href: "/guide", label: "คู่มือการใช้งาน" },
      { href: "/terms", label: "ข้อกำหนดการใช้งาน" },
      { href: "/privacy", label: "นโยบายความเป็นส่วนตัว" },
      { href: "/guidelines", label: "แนวทางชุมชน" },
      { href: "/api-docs", label: "เอกสาร API" },
    ],
  },
  en: {
    title: "About Us",
    subtitle: "RMU-Campus X — Campus item exchange platform for students at Rajabhat Maha Sarakham University",
    mission: {
      title: "Mission",
      text: "We aim to build a sharing community within the university, enabling students to exchange unused items with fellow students safely and easily.",
    },
    features: [
      { icon: Package, title: "Item Exchange", desc: "Post items to share or request items you need" },
      { icon: MessageSquare, title: "In-App Chat", desc: "Communicate via in-app chat with LINE notifications" },
      { icon: Heart, title: "Safe & Verified", desc: "Email verification (@rmu.ac.th) and trust rating system" },
    ],
    team: {
      title: "Development Team",
      text: "Developed by students of the Faculty of Science and Technology, Rajabhat Maha Sarakham University",
    },
    contact: {
      title: "Contact Us",
      text: "Have questions or need help?",
      link: "Submit a support ticket",
    },
    links: [
      { href: "/guide", label: "User Guide" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/guidelines", label: "Community Guidelines" },
      { href: "/api-docs", label: "API Documentation" },
    ],
  },
} as const

export default function AboutPage() {
  const { locale, tt } = useI18n()
  const content = locale === "th" ? ABOUT_CONTENT.th : ABOUT_CONTENT.en

  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 max-w-3xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-4">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
        <p className="text-muted-foreground">{content.subtitle}</p>
      </div>

      <section className="mb-10 rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          {content.mission.title}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{content.mission.text}</p>
      </section>

      <section className="mb-10 space-y-4">
        <h2 className="text-xl font-bold">{tt("ฟีเจอร์หลัก", "Key Features")}</h2>
        {content.features.map((f, i) => {
          const Icon = f.icon
          return (
            <div key={i} className="rounded-xl border bg-card p-4 flex gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          )
        })}
      </section>

      <section className="mb-10 rounded-xl border bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
          <Users className="h-5 w-5 text-primary" />
          {content.team.title}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{content.team.text}</p>
      </section>

      <section className="mb-10 rounded-xl border bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
          <Mail className="h-5 w-5 text-primary" />
          {content.contact.title}
        </h2>
        <p className="text-muted-foreground mb-4">{content.contact.text}</p>
        <Link href="/support" className="text-primary hover:underline font-medium">
          {content.contact.link}
        </Link>
      </section>

      <nav aria-label={tt("ลิงก์ที่เกี่ยวข้อง", "Related links")} className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">{tt("เอกสารและลิงก์", "Documents & links")}</p>
        <ul className="flex flex-wrap gap-2">
          {content.links.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className="text-primary hover:underline text-sm">
                {label}
              </Link>
              <span className="text-muted-foreground mx-1">·</span>
            </li>
          ))}
        </ul>
      </nav>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Made with ❤️ at <strong>Rajabhat Maha Sarakham University</strong>
      </p>
    </div>
  )
}
