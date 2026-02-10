"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  Heart,
  HelpCircle,
  Home,
  Megaphone,
  MessageSquare,
  Package,
  Plus,
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Logo } from "@/components/logo"
import { ModeToggle } from "@/components/mode-toggle"
import { NotificationBell } from "@/components/notification-bell"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/language-provider"
import { useToast } from "@/hooks/use-toast"
import { signOut } from "@/lib/auth"
import { resolveImageUrl } from "@/lib/cloudinary-url"
import { userHasSupportTickets } from "@/lib/db/support"
import { NavbarMobile } from "@/components/navbar-mobile"
import { NavbarUserMenu } from "@/components/navbar-user-menu"

const PostItemModal = dynamic(
  () => import("./post-item-modal").then((m) => ({ default: m.PostItemModal })),
  { ssr: false }
)

const SupportTicketModal = dynamic(
  () => import("./support-ticket-modal").then((m) => ({ default: m.SupportTicketModal })),
  { ssr: false }
)

export function Navbar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isAdmin, profilePhotoURL } = useAuth()
  const { t } = useI18n()
  const { toast } = useToast()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [postModalOpen, setPostModalOpen] = useState(false)
  const [supportModalOpen, setSupportModalOpen] = useState(false)
  const [hasSupportTickets, setHasSupportTickets] = useState(false)
  const supportModalWasOpenRef = useRef(false)

  useEffect(() => {
    if (!user?.uid) {
      setHasSupportTickets(false)
      return
    }
    userHasSupportTickets(user.uid).then(setHasSupportTickets).catch(() => setHasSupportTickets(false))
  }, [user?.uid])

  useEffect(() => {
    if (!user) return
    const openFromQuery = searchParams.get("openSupport") === "1" || searchParams.get("help") === "1"
    if (!openFromQuery) return
    setSupportModalOpen(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("openSupport")
    params.delete("help")
    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [pathname, router, searchParams, user])

  useEffect(() => {
    if (supportModalWasOpenRef.current && !supportModalOpen && user?.uid) {
      userHasSupportTickets(user.uid).then(setHasSupportTickets).catch(() => {})
    }
    supportModalWasOpenRef.current = supportModalOpen
  }, [supportModalOpen, user?.uid])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({ title: t("navbar.signOutSuccess") })
      router.push("/login")
    } catch (error: unknown) {
      const description = error instanceof Error ? error.message : undefined
      toast({ title: t("navbar.errorTitle"), description, variant: "destructive" })
    }
  }

  const navItems = [
    { href: "/dashboard", label: t("navbar.home"), icon: Home },
    { href: "/announcements", label: t("navbar.announcements"), icon: Megaphone },
    { href: "/profile", label: t("navbar.profile"), icon: Package },
    { href: "/my-exchanges", label: t("navbar.exchanges"), icon: Package },
    { href: "/favorites", label: t("navbar.favorites"), icon: Heart },
  ]

  const desktopMainItems = [
    { href: "/dashboard", label: t("navbar.home"), icon: Home },
    { href: "/announcements", label: t("navbar.announcements"), icon: Megaphone },
    { href: "/my-exchanges", label: t("navbar.exchanges"), icon: Package },
    { href: "/favorites", label: t("navbar.favorites"), icon: Heart },
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

  const avatarSrc = user ? getAvatarSrc(profilePhotoURL ?? user.photoURL) || undefined : undefined
  const userInitials = user ? getUserInitials(user.email) : "U"

  return (
    <>
      <nav className="sticky top-0 z-50 border-b glass pt-safe">
        <div className="container mx-auto px-4 pl-safe pr-safe h-14 sm:h-16 flex flex-nowrap items-center justify-between gap-2 md:gap-4">
          <Logo size="md" href="/dashboard" className="shrink-0" />

          <ul className="hidden lg:flex items-center gap-1 list-none m-0 p-0">
            {user &&
              desktopMainItems.map((item) => (
                <li key={item.href}>
                  <Button variant={isActive(item.href) ? "secondary" : "ghost"} size="sm" asChild className="gap-2">
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </Button>
                </li>
              ))}

            {user && hasSupportTickets && (
              <li>
                <Button variant="ghost" size="sm" className="gap-2" asChild>
                  <Link href="/support">
                    <MessageSquare className="h-4 w-4" />
                    {t("navbar.myTickets")}
                  </Link>
                </Button>
              </li>
            )}

            {user && (
              <li>
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => setSupportModalOpen(true)}>
                  <HelpCircle className="h-4 w-4" />
                  {t("navbar.help")}
                </Button>
              </li>
            )}
          </ul>

          <div className="flex flex-nowrap items-center gap-2 shrink-0">
            {user ? (
              <>
                <Button size="sm" className="hidden lg:flex gap-2" onClick={() => setPostModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {t("navbar.postItem")}
                </Button>

                <NotificationBell />
                <LanguageSwitcher compact className="hidden sm:inline-flex" />
                <ModeToggle />

                <NavbarUserMenu
                  userEmail={user.email || ""}
                  isAdmin={isAdmin}
                  avatarSrc={avatarSrc}
                  userInitials={userInitials}
                  onSignOut={handleSignOut}
                />

                <NavbarMobile
                  open={mobileMenuOpen}
                  onOpenChange={setMobileMenuOpen}
                  navItems={navItems}
                  isActive={isActive}
                  userEmail={user.email || ""}
                  isAdmin={isAdmin}
                  avatarSrc={avatarSrc}
                  userInitials={userInitials}
                  hasSupportTickets={hasSupportTickets}
                  onPostItem={() => setPostModalOpen(true)}
                  onOpenSupport={() => setSupportModalOpen(true)}
                  onSignOut={handleSignOut}
                />
              </>
            ) : (
              <>
                <LanguageSwitcher compact className="hidden sm:inline-flex" />
                <ModeToggle />
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/announcements">{t("navbar.announcements")}</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">{t("navbar.login")}</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">{t("navbar.register")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <PostItemModal open={postModalOpen} onOpenChange={setPostModalOpen} />
      <SupportTicketModal open={supportModalOpen} onOpenChange={setSupportModalOpen} />
    </>
  )
}
