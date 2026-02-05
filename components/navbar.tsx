"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { LogOut, Shield, Menu, User, Package, Home, Plus, HelpCircle, Heart, MessageSquare } from "lucide-react"
import { useAuth } from "./auth-provider"
import { signOut } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { NotificationBell } from "./notification-bell"
import { AccountStatusBanner } from "./account-status-banner"
import { AnnouncementBanner } from "./announcement-banner"
import { ModeToggle } from "./mode-toggle"
import { Logo } from "./logo"
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { userHasSupportTickets } from "@/lib/firestore"

// Lazy load heavy modals - only loaded when opened
const PostItemModal = dynamic(
  () => import("./post-item-modal").then(m => ({ default: m.PostItemModal })),
  { ssr: false }
)

const SupportTicketModal = dynamic(
  () => import("./support-ticket-modal").then(m => ({ default: m.SupportTicketModal })),
  { ssr: false }
)

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [postModalOpen, setPostModalOpen] = useState(false)
  const [supportModalOpen, setSupportModalOpen] = useState(false)
  const [hasSupportTickets, setHasSupportTickets] = useState(false)

  useEffect(() => {
    if (!user?.uid) {
      setHasSupportTickets(false)
      return
    }
    userHasSupportTickets(user.uid).then(setHasSupportTickets).catch(() => setHasSupportTickets(false))
  }, [user?.uid])

  // เมื่อปิดโมดัลช่วยเหลือ (อาจเพิ่งส่งคำร้อง) ให้ตรวจสอบอีกครั้ง
  useEffect(() => {
    if (!supportModalOpen && user?.uid) {
      userHasSupportTickets(user.uid).then(setHasSupportTickets).catch(() => {})
    }
  }, [supportModalOpen, user?.uid])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "ออกจากระบบสำเร็จ",
      })
      router.push("/login")
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const navItems = [
    { href: "/dashboard", label: "หน้าหลัก", icon: Home },
    { href: "/profile", label: "โปรไฟล์", icon: User },
    { href: "/my-exchanges", label: "การแลกเปลี่ยน", icon: Package },
    { href: "/favorites", label: "รายการโปรด", icon: Heart },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <>
      <nav className="sticky top-0 z-50 border-b glass">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Logo size="md" href="/dashboard" className="shrink-0" />

          {/* Desktop Navigation */}
          <ul className="hidden md:flex items-center gap-1 list-none m-0 p-0">
            {user && navItems.map((item) => (
              <li key={item.href}>
                <Button
                  variant={isActive(item.href) ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              </li>
            ))}
            
            {/* คำร้องของฉัน - แสดงเมื่อมีคำร้องเท่านั้น */}
            {user && hasSupportTickets && (
              <li>
                <Button variant="ghost" size="sm" className="gap-2" asChild>
                  <Link href="/support">
                    <MessageSquare className="h-4 w-4" />
                    คำร้องของฉัน
                  </Link>
                </Button>
              </li>
            )}
            {/* Support Button - Desktop */}
            {user && (
              <li>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => setSupportModalOpen(true)}
                >
                  <HelpCircle className="h-4 w-4" />
                  ช่วยเหลือ
                </Button>
              </li>
            )}
          </ul>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            
            {user ? (
              <>
                {/* Post Item Button - Desktop (Opens Modal) */}
                <Button 
                  size="sm" 
                  className="hidden sm:flex gap-2"
                  onClick={() => setPostModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  โพสต์สิ่งของ
                </Button>

                {/* Notification Bell */}
                <NotificationBell />

                {/* Admin Panel Link - Desktop */}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="hidden sm:flex gap-2"
                  >
                    <Link href="/admin">
                      <Shield className="h-4 w-4" />
                      Admin
                    </Link>
                  </Button>
                )}

                {/* Theme Toggle */}
                <ModeToggle />

                {/* User Email - Desktop only (แสดงเต็ม) */}
                <span className="text-sm text-muted-foreground hidden lg:inline">
                  {user.email}
                </span>

                {/* Logout Button - Desktop */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="hidden sm:flex gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline">ออกจากระบบ</span>
                </Button>

                {/* Mobile Menu */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="md:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">เมนู</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                      <SheetTitle className="sr-only">เมนูหลัก</SheetTitle>
                      <div className="flex flex-col h-full">
                        {/* Mobile Header */}
                        <div className="flex items-center gap-3 pb-6 border-b">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium break-all">{user.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {isAdmin ? "ผู้ดูแลระบบ" : "สมาชิก"}
                            </p>
                          </div>
                          <ModeToggle />
                        </div>

                        {/* Mobile Navigation */}
                        <div className="flex-1 py-6 space-y-1">
                          {navItems.map((item) => (
                            <Button
                              key={item.href}
                              variant={isActive(item.href) ? "secondary" : "ghost"}
                              className="w-full justify-start gap-3"
                              asChild
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <Link href={item.href}>
                                <item.icon className="h-4 w-4" />
                                {item.label}
                              </Link>
                            </Button>
                          ))}

                          <div className="pt-2 space-y-2">
                            <Button
                              variant="default"
                              className="w-full justify-start gap-3"
                              onClick={() => {
                                setMobileMenuOpen(false)
                                setPostModalOpen(true)
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              โพสต์สิ่งของ
                            </Button>
                            {hasSupportTickets && (
                              <Button variant="ghost" className="w-full justify-start gap-3" asChild>
                                <Link href="/support" onClick={() => setMobileMenuOpen(false)}>
                                  <MessageSquare className="h-4 w-4" />
                                  คำร้องของฉัน
                                </Link>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              className="w-full justify-start gap-3"
                              onClick={() => {
                                setMobileMenuOpen(false)
                                setSupportModalOpen(true)
                              }}
                            >
                              <HelpCircle className="h-4 w-4" />
                              ช่วยเหลือ
                            </Button>
                          </div>
                        </div>

                        {/* Mobile Footer */}
                        <div className="pt-4 border-t">
                          <Button 
                            variant="outline" 
                            className="w-full justify-start gap-3"
                            onClick={() => {
                              handleSignOut()
                              setMobileMenuOpen(false)
                            }}
                          >
                            <LogOut className="h-4 w-4" />
                            ออกจากระบบ
                          </Button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">เข้าสู่ระบบ</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">สมัครสมาชิก</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Post Item Modal */}
      <PostItemModal open={postModalOpen} onOpenChange={setPostModalOpen} />

      {/* Support Ticket Modal */}
      <SupportTicketModal open={supportModalOpen} onOpenChange={setSupportModalOpen} />

      {/* Announcements (แบนเนอร์ประกาศจากแอดมิน) */}
      <AnnouncementBanner />
      {/* Account Status Banner */}
      <AccountStatusBanner />
    </>
  )
}
