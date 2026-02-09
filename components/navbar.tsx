"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { LogOut, Shield, Menu, User, Package, Home, Plus, HelpCircle, Heart, MessageSquare, ChevronDown } from "lucide-react"
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
import { userHasSupportTickets } from "@/lib/db/support"
import { resolveImageUrl } from "@/lib/cloudinary-url"

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
  const { user, isAdmin, profilePhotoURL } = useAuth()
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
  const desktopMainItems = [
    { href: "/dashboard", label: "หน้าหลัก", icon: Home },
    { href: "/my-exchanges", label: "การแลกเปลี่ยน", icon: Package },
    { href: "/favorites", label: "รายการโปรด", icon: Heart },
  ]

  const isActive = (href: string) => pathname === href
  const getUserInitials = (email?: string | null) => {
    if (!email) return "U"
    const [localPartRaw] = email.split("@")
    const localPart = localPartRaw || email
    const parts = localPart.split(/[._-]/).filter(Boolean)
    if (parts.length >= 2 && parts[0] && parts[1]) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return localPart.slice(0, 2).toUpperCase()
  }
  const getAvatarSrc = (photo?: string | null) => {
    if (!photo) return ""
    const trimmed = photo.trim()
    if (!trimmed) return ""
    if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
      if (trimmed.includes("res.cloudinary.com/")) return resolveImageUrl(trimmed) || trimmed
      return trimmed
    }
    return resolveImageUrl(trimmed)
  }

  return (
    <>
      <nav className="sticky top-0 z-50 border-b glass pt-safe">
        <div className="container mx-auto px-4 pl-safe pr-safe h-14 sm:h-16 flex flex-nowrap items-center justify-between gap-2 md:gap-4">
          {/* Logo - fixed width */}
          <Logo size="md" href="/dashboard" className="shrink-0" />

          {/* Desktop Navigation - เมนูหลักที่ใช้บ่อย */}
          <ul className="hidden lg:flex items-center gap-1 list-none m-0 p-0">
            {user && desktopMainItems.map((item) => (
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
          <div className="flex flex-nowrap items-center gap-2 shrink-0">
            
            {user ? (
              <>
                {/* Post Item Button - Desktop (Opens Modal) */}
                <Button 
                  size="sm" 
                  className="hidden lg:flex gap-2"
                  onClick={() => setPostModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  โพสต์สิ่งของ
                </Button>

                {/* Notification Bell */}
                <NotificationBell />

                {/* Theme Toggle */}
                <ModeToggle />

                {/* User Menu - Desktop */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden lg:flex items-center gap-2 pl-1 pr-2 h-9 max-w-[240px]"
                    >
                      <Avatar className="h-7 w-7 border">
                        <AvatarImage
                          src={getAvatarSrc(profilePhotoURL ?? user.photoURL) || undefined}
                          alt={user.email || "ผู้ใช้งาน"}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                          {getUserInitials(user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm text-muted-foreground">
                        {user.email}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="sr-only">เมนูผู้ใช้</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-xl">
                    <DropdownMenuLabel className="px-2 py-1.5">
                      <p className="text-xs text-muted-foreground">บัญชีผู้ใช้</p>
                      <p className="text-sm font-medium break-all">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                      <Link href="/profile">
                        <User className="h-4 w-4" />
                        โปรไฟล์
                      </Link>
                    </DropdownMenuItem>

                    {isAdmin && (
                      <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                        <Link href="/admin">
                          <Shield className="h-4 w-4" />
                          Admin
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                      onSelect={(event) => {
                        event.preventDefault()
                        handleSignOut()
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      ออกจากระบบ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="lg:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">เมนู</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[85vw] max-w-xs sm:max-w-sm">
                      <SheetTitle className="sr-only">เมนูหลัก</SheetTitle>
                      <div className="flex flex-col h-full">
                        {/* Mobile Header */}
                        <div className="flex items-center gap-3 pb-6 border-b">
                          <Avatar className="h-10 w-10 border">
                            <AvatarImage
                              src={getAvatarSrc(profilePhotoURL ?? user.photoURL) || undefined}
                              alt={user.email || "ผู้ใช้งาน"}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {getUserInitials(user.email)}
                            </AvatarFallback>
                          </Avatar>
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
