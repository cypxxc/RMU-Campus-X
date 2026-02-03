import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

/** หน้าเกี่ยวกับเรา - ปิดใช้งานชั่วคราว (ไม่ลบ) */
export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-md text-center">
      <p className="text-muted-foreground mb-6">หน้านี้ปิดใช้งานชั่วคราว</p>
      <Button asChild className="gap-2">
        <Link href="/dashboard">
          <Home className="h-4 w-4" />
          กลับหน้าหลัก
        </Link>
      </Button>
    </div>
  )
}
