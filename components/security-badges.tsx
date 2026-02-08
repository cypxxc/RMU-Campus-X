import { ShieldCheck, Lock, Mail } from "lucide-react"

/**
 * Security Badges - แสดงเครื่องหมายรับรองความปลอดภัยสำหรับหน้า สมัคร/เข้าสู่ระบบ
 * สร้างความมั่นใจให้ผู้ใช้เมื่อกรอกข้อมูลส่วนตัว
 */
export function SecurityBadges() {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-3 px-2 rounded-lg bg-muted/30 border border-border/40"
      role="region"
      aria-label="ข้อมูลความปลอดภัย"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" aria-hidden />
        <span>ข้อมูลถูกเข้ารหัสอย่างปลอดภัย</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-4 w-4 text-primary shrink-0" aria-hidden />
        <span>ไม่มีค่าใช้จ่าย</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mail className="h-4 w-4 text-primary shrink-0" aria-hidden />
        <span>เฉพาะอีเมล @rmu.ac.th</span>
      </div>
    </div>
  )
}
