"use client"

import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
       <div className="min-h-screen bg-background">
         <Navbar />
         <div className="border-b">
           <div className="container mx-auto px-4">
              <SiteBreadcrumb />
           </div>
         </div>
         <main className="container mx-auto px-4 py-8">
           {children}
         </main>
       </div>
    </AuthGuard>
  )
}
