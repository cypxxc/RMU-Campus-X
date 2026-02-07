"use client"

import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { BreadcrumbBar } from "@/components/breadcrumb-bar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
       <div className="min-h-screen bg-background">
         <Navbar />
         <BreadcrumbBar />
         <main className="container mx-auto px-4 pl-safe pr-safe py-6 sm:py-8 pb-safe">
           {children}
         </main>
       </div>
    </AuthGuard>
  )
}
