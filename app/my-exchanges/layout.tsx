import type React from "react"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { BreadcrumbBar } from "@/components/breadcrumb-bar"

export default function MyExchangesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <BreadcrumbBar />
        {children}
      </div>
    </AuthGuard>
  )
}
