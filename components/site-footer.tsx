"use client"

import Link from "next/link"
import { Logo } from "@/components/logo"
import { Facebook, Instagram, Twitter, Mail, MapPin, Phone } from "lucide-react"

export function SiteFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-muted/30 border-t pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <Logo size="lg" />
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              แพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษามหาวิทยาลัยราชภัฏมหาสารคาม 
              สร้างสังคมแห่งการแบ่งปันที่ยั่งยืน
            </p>
            <div className="flex items-center gap-4 pt-2">
              <a href="#" className="bg-background p-2 rounded-full border shadow-sm text-muted-foreground hover:text-primary hover:border-primary transition-all">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="bg-background p-2 rounded-full border shadow-sm text-muted-foreground hover:text-primary hover:border-primary transition-all">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="bg-background p-2 rounded-full border shadow-sm text-muted-foreground hover:text-primary hover:border-primary transition-all">
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-foreground mb-6">เมนูลัด</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors inline-block">
                  หน้าหลัก
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors inline-block">
                  เกี่ยวกับเรา
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-primary transition-colors inline-block">
                  คำถามที่พบบ่อย
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors inline-block">
                  ติดต่อเรา
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-bold text-foreground mb-6">นโยบายและความปลอดภัย</h3>
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
          <div>
            <h3 className="font-bold text-foreground mb-6">ติดต่อสอบถาม</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  80 ถ.นครสวรรค์ ต.ตลาด อ.เมือง จ.มหาสารคาม 44000
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <span className="text-muted-foreground">043-711-408</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <span className="text-muted-foreground">contact@rmu.ac.th</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            © {currentYear} RMU-Campus X. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/sitemap" className="hover:text-foreground">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
