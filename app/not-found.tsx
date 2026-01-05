import { Button } from "@/components/ui/button"
import { FileQuestion, Home, Search } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto space-y-6">
        {/* 404 Icon */}
        <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center">
          <FileQuestion className="h-12 w-12 text-muted-foreground" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-6xl font-black text-primary">404</h1>
          <h2 className="text-xl font-bold text-foreground">
            ไม่พบหน้าที่ค้นหา
          </h2>
          <p className="text-sm text-muted-foreground">
            หน้าที่คุณกำลังมองหาอาจถูกลบ เปลี่ยนชื่อ หรือไม่มีอยู่ในระบบ
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="gap-2">
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              หน้าหลัก
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/dashboard">
              <Search className="h-4 w-4" />
              ค้นหาสิ่งของ
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
