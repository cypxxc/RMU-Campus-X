import type React from "react"
import { Navbar } from "@/components/navbar"

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      {children}
    </div>
  )
}
