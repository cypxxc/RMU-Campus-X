import type React from "react"
import { Navbar } from "@/components/navbar"
import { BreadcrumbBar } from "@/components/breadcrumb-bar"

export default function AnnouncementsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <BreadcrumbBar />
      <main className="container mx-auto px-4 py-6 sm:py-8">{children}</main>
    </div>
  )
}

