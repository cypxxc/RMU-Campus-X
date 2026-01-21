"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, Menu, Shield, LayoutDashboard, Users, MessageSquare, AlertTriangle, History } from "lucide-react"
import { useState } from "react"

import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { BounceWrapper } from "@/components/ui/bounce-wrapper"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
 
  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/items", label: "จัดการสิ่งของ", icon: Package },
    { href: "/admin/users", label: "จัดการผู้ใช้", icon: Users },
    { href: "/admin/support", label: "ซัพพอร์ต", icon: MessageSquare },
    { href: "/admin/reports", label: "รายงานปัญหา", icon: AlertTriangle },
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
          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium transform hover:scale-[1.02]",
          isActive 
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className={cn("h-5 w-5 transition-transform duration-300", isActive && "animate-pulse")} />
        <span>{item.label}</span>
      </Link>
    )
  }
 
  return (
    <AuthGuard requireAdmin>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        
        <div className="flex-1 flex flex-col md:flex-row container mx-auto p-0 md:p-4 lg:p-6 gap-6">
          {/* Desktop Sidebar (Left) - Animated */}
          <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 space-y-6 pt-4 animate-slide-up">
             <div className="px-4 py-2 animate-fade-in">
                <div className="flex items-center gap-2 text-primary font-bold mb-1">
                   <Shield className="h-5 w-5 animate-pulse" />
                   <span className="text-sm tracking-tight uppercase">Control Center</span>
                </div>
                <h2 className="text-xl font-black text-foreground">Admin Portal</h2>
             </div>
             <nav className="flex flex-col gap-1 px-2 space-y-1">
                {navItems.map((item, index) => (
                  <div
                    key={item.href}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <NavLink item={item} />
                  </div>
                ))}
             </nav>
             
             <div className="mt-auto p-4 rounded-2xl bg-muted/30 border border-muted-foreground/10 animate-fade-in hover:bg-muted/50 transition-colors duration-300">
                <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-widest">
                   University Management v2.0
                </p>
             </div>
          </aside>
 
          {/* Mobile Admin Toggle (Visible only on md:hidden) */}
          <div className="md:hidden border-b bg-card px-4 py-3 sticky top-16 z-30 flex items-center justify-between animate-slide-down">
             <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-bold truncate">
                   {navItems.find(i => i.href === pathname)?.label || "Admin Panel"}
                </span>
             </div>
             
             <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-9 w-9 hover:scale-110 transition-transform duration-200">
                      <Menu className="h-5 w-5" />
                   </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0 border-none shadow-2xl">
                   <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
                   <div className="p-6 bg-primary/5 h-16 border-b flex items-center animate-fade-in">
                      <div className="flex items-center gap-2">
                          <BounceWrapper variant="bounce-scale">
                            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                              <Shield className="h-4 w-4 text-primary-foreground" />
                            </div>
                          </BounceWrapper>
                          <span className="font-black text-lg">Admin Center</span>
                       </div>
                   </div>
                   <nav className="p-4 space-y-2">
                      {navItems.map((item, index) => (
                        <div
                          key={item.href}
                          className="animate-slide-up"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <NavLink item={item} onClick={() => setIsMobileMenuOpen(false)} />
                        </div>
                      ))}
                   </nav>
                </SheetContent>
             </Sheet>
          </div>
 
          {/* Main Content (Right) - Animated */}
          <main className="flex-1 w-full overflow-hidden">
             <div className="bg-background md:rounded-3xl md:border md:shadow-soft h-full animate-fade-in">
                {children}
             </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
