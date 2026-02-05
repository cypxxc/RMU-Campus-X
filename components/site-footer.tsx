"use client"

import Link from "next/link"
import { Logo } from "@/components/logo"
import { Mail, MapPin } from "lucide-react"

export function SiteFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-muted/30 border-t pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-10 lg:gap-x-12 mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <Logo size="lg" />
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              แพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษาและบุคลากร มหาวิทยาลัยราชภัฏมหาสารคาม 
              สร้างสังคมแห่งการแบ่งปันที่ยั่งยืน
            </p>
          </div>

          {/* FAQ */}
          <div className="space-y-1">
            <h3 className="font-bold text-foreground mb-5">คำถามที่พบบ่อย</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-primary transition-colors inline-block">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-1">
            <h3 className="font-bold text-foreground mb-5">นโยบายและความปลอดภัย</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors inline-block">
                  ข้อกำหนดการใช้งาน
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors inline-block">
                  นโยบายความเป็นส่วนตัว
                </Link>
              </li>
              <li>
                <Link href="/guidelines" className="text-muted-foreground hover:text-primary transition-colors inline-block">
                  แนวทางชุมชน
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-1">
            <h3 className="font-bold text-foreground mb-5">ติดต่อสอบถาม</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  80 ถ.นครสวรรค์ ต.ตลาด อ.เมือง จ.มหาสารคาม 44000
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <span className="text-muted-foreground">contact@rmu.ac.th</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 pb-2">
          <p className="text-xs text-muted-foreground text-center">
            © {currentYear} RMU-Campus X - มหาวิทยาลัยราชภัฏมหาสารคาม
          </p>
        </div>
      </div>
    </footer>
  )
}
