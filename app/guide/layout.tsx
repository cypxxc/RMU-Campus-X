import Link from "next/link"

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95 sticky top-0 z-10">
        <div className="container flex h-14 items-center px-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← กลับหน้าหลัก
          </Link>
        </div>
      </header>
      {children}
    </div>
  )
}
