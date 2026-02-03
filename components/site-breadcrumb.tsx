"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// Map route segments to friendly Thai names
const routeMap: Record<string, string> = {
  dashboard: "หน้าหลัก",
  "my-exchanges": "การแลกเปลี่ยนของฉัน",
  favorites: "รายการโปรด",
  profile: "โปรไฟล์",
  settings: "ตั้งค่า",
  admin: "ผู้ดูแลระบบ",
  items: "จัดการสิ่งของ",
  users: "จัดการผู้ใช้",
  reports: "รายงานปัญหา",
  support: "ช่วยเหลือ",
  logs: "บันทึกกิจกรรม",
  "forgot-password": "ลืมรหัสผ่าน",
  register: "สมัครสมาชิก",
  login: "เข้าสู่ระบบ",
  "verify-email": "ยืนยันอีเมล",
  notifications: "การแจ้งเตือน",
  faq: "FAQ",
  terms: "ข้อกำหนดและเงื่อนไข",
  privacy: "นโยบายความเป็นส่วนตัว",
  report: "แจ้งปัญหาการใช้งาน",
  chat: "แชท",
  item: "รายละเอียดสิ่งของ"
}

export function SiteBreadcrumb() {
  const pathname = usePathname()

  // Hide breadcrumb on homepage ("/")
  if (pathname === "/") return null

  // Split pathname into segments and remove empty strings
  const segments = pathname.split("/").filter((segment) => segment !== "")

  return (
    <div className="w-full bg-muted/30 border-b">
      <div className="container py-2">
        <Breadcrumb>
          <BreadcrumbList>
            {/* Home Link */}
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">หน้าแรก</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            
            <BreadcrumbSeparator />

            {/* Dynamic Segments */}
            {segments.map((segment, index) => {
              const isLast = index === segments.length - 1
              const href = `/${segments.slice(0, index + 1).join("/")}`
              
              // Handle dynamic IDs (if segment is a long alphanumeric string or number, likely an ID)
              // We'll try to map it, or show "รายละเอียด" if it looks like an ID
              let label = routeMap[segment] || segment
              
              // Simple heuristic to detect IDs: longer than 15 chars or purely numeric
              if ((segment.length > 15 && !segment.includes("-")) || /^\d+$/.test(segment)) {
                 label = "รายละเอียด"
              }

              return (
                <div key={href} className="flex items-center gap-1.5 sm:gap-2.5">
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={href}>{label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </div>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  )
}
