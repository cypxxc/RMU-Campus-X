import type React from "react"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <Navbar />
      <div className="min-h-screen bg-background pt-16 pb-20 lg:pb-0">
        {children}
      </div>
    </AuthGuard>
  )
}
