import { Button } from "@/components/ui/button"
import { Home, Search, Compass } from "lucide-react"
import Link from "next/link"
import { getServerLocale } from "@/lib/i18n/server"

export default async function NotFound() {
  const locale = await getServerLocale()
  const tt = (th: string, en: string) => (locale === "th" ? th : en)

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-lg mx-auto space-y-8">
        {/* Friendly 404 illustration */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 rounded-3xl bg-primary/10 flex items-center justify-center transform rotate-6" aria-hidden />
          <div className="relative w-full h-full rounded-3xl bg-muted/80 border-2 border-dashed border-primary/30 flex items-center justify-center">
            <Compass className="h-16 w-16 text-primary/60" strokeWidth={1.5} aria-hidden />
          </div>
        </div>

        {/* Message - น่าอุ่นใจ เป็นกันเอง */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-primary">{tt("หน้านี้หายไป", "This page is missing")}</p>
          <h1 className="text-5xl sm:text-6xl font-black text-foreground tracking-tight">404</h1>
          <h2 className="text-xl font-bold text-foreground">
            {tt("ดูเหมือนคุณจะหลงทางเล็กน้อย", "Looks like you took a wrong turn")}
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
            {tt(
              "ไม่เป็นไรนะ — บางทีลิงก์อาจเก่า หรือหน้านี้อาจย้ายไปแล้ว ลองเริ่มใหม่จากหน้าหลักหรือค้นหาสิ่งของที่สนใจกันนะ",
              "No worries. The link may be outdated or the page may have moved. Start again from the dashboard and continue browsing."
            )}
          </p>
        </div>

        {/* Actions - CTA ที่ชัดเจน */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              {tt("กลับไปหน้าหลัก", "Back to dashboard")}
            </Link>
          </Button>
          <Button variant="outline" asChild size="lg" className="gap-2">
            <Link href="/dashboard">
              <Search className="h-4 w-4" />
              {tt("ค้นหาสิ่งของที่อยากได้", "Find items")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
