import type React from "react"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { BreadcrumbBar } from "@/components/breadcrumb-bar"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-safe">
         <Navbar />
         <BreadcrumbBar />
        {children}
      </div>
    </AuthGuard>
  )
}
