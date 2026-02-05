"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, Menu, Shield, LayoutDashboard, Users, MessageSquare, AlertTriangle, History, RefreshCw, Megaphone } from "lucide-react"
import { useState } from "react"

import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { BreadcrumbBar } from "@/components/breadcrumb-bar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
 
  const navItems = [
    { href: "/admin", label: "ภาพรวม", icon: LayoutDashboard },
    { href: "/admin/announcements", label: "ประกาศ", icon: Megaphone },
    { href: "/admin/items", label: "จัดการโพส", icon: Package },
    { href: "/admin/users", label: "จัดการผู้ใช้", icon: Users },
    { href: "/admin/exchanges", label: "จัดการการแลกเปลี่ยน", icon: RefreshCw },
    { href: "/admin/support", label: "จัดการคำร้อง", icon: MessageSquare },
    { href: "/admin/reports", label: "รายงานความไม่เหมาะสม", icon: AlertTriangle },
    { href: "/admin/logs", label: "ประวัติกิจกรรม", icon: History },
  ]
 
  const NavLink = ({ item, onClick }: { item: typeof navItems[0], onClick?: () => void }) => {
    const Icon = item.icon
    const isActive = pathname === item.href
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium",
          isActive 
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{item.label}</span>
      </Link>
    )
  }
 
  return (
    <AuthGuard requireAdmin>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <BreadcrumbBar />
        <div className="flex-1 flex flex-col md:flex-row container mx-auto p-0 md:p-4 lg:p-6 gap-6">
          {/* Desktop Sidebar (Left) */}
          <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 space-y-6 pt-4">
             <div className="px-4 py-2">
                <div className="flex items-center gap-2 text-primary font-bold mb-1">
                   <Shield className="h-5 w-5" />
                   <span className="text-sm tracking-tight uppercase">Control Center</span>
                </div>
                <h2 className="text-xl font-black text-foreground">Admin Portal</h2>
             </div>
             <nav className="flex flex-col gap-1 px-2 space-y-1">
                {navItems.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
             </nav>
          </aside>
 
          {/* Mobile Admin Toggle (Visible only on md:hidden) */}
          <div className="md:hidden border-b bg-card px-4 py-3 sticky top-16 z-30 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold truncate">
                   {navItems.find(i => i.href === pathname)?.label || "Admin Panel"}
                </span>
             </div>
             
             <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Menu className="h-5 w-5" />
                   </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0 border-none shadow-2xl">
                   <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
                   <div className="p-6 bg-primary/5 h-16 border-b flex items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                          <Shield className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="font-black text-lg">Admin Center</span>
                      </div>
                   </div>
                   <nav className="p-4 space-y-2">
                      {navItems.map((item) => (
                        <NavLink key={item.href} item={item} onClick={() => setIsMobileMenuOpen(false)} />
                      ))}
                   </nav>
                </SheetContent>
             </Sheet>
          </div>
 
          {/* Main Content (Right) */}
          <main className="flex-1 w-full overflow-hidden">
             <div className="bg-background md:rounded-3xl md:border md:shadow-soft h-full">
                {children}
             </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
