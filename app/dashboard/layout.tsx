import type React from "react"
import { Navbar } from "@/components/navbar"
import { AuthProvider } from "@/components/auth-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <Navbar />
      {children}
    </AuthProvider>
  )
}
