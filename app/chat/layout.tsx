import type React from "react"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
         <Navbar />
        {children}
      </div>
    </AuthGuard>
  )
}
