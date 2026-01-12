import type React from "react"
import { Navbar } from "@/components/navbar"

export default function AboutLayout({
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
