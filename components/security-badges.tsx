import { ShieldCheck, Lock, Mail } from "lucide-react"
import { useI18n } from "@/components/language-provider"

/**
 * Security Badges - แสดงเครื่องหมายรับรองความปลอดภัยสำหรับหน้า สมัคร/เข้าสู่ระบบ
 * สร้างความมั่นใจให้ผู้ใช้เมื่อกรอกข้อมูลส่วนตัว
 */
export function SecurityBadges() {
  const { tt } = useI18n()

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-3 px-2 rounded-lg bg-muted/30 border border-border/40"
      role="region"
      aria-label={tt("ข้อมูลความปลอดภัย", "Security information")}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" aria-hidden />
        <span>{tt("ข้อมูลถูกเข้ารหัสอย่างปลอดภัย", "Your data is securely encrypted")}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-4 w-4 text-primary shrink-0" aria-hidden />
        <span>{tt("ไม่มีค่าใช้จ่าย", "No cost to use")}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mail className="h-4 w-4 text-primary shrink-0" aria-hidden />
        <span>{tt("เฉพาะอีเมล @rmu.ac.th", "@rmu.ac.th email only")}</span>
      </div>
    </div>
  )
}
