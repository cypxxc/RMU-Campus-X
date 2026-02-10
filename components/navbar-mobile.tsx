"use client"

import Link from "next/link"
import {
  HelpCircle,
  LogOut,
  MessageSquare,
  Plus,
  Menu,
} from "lucide-react"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useI18n } from "@/components/language-provider"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavbarMobileProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  navItems: NavItem[]
  isActive: (href: string) => boolean
  userEmail: string
  isAdmin: boolean
  avatarSrc: string | undefined
  userInitials: string
  hasSupportTickets: boolean
  onPostItem: () => void
  onOpenSupport: () => void
  onSignOut: () => void
}

export function NavbarMobile({
  open,
  onOpenChange,
  navItems,
  isActive,
  userEmail,
  isAdmin,
  avatarSrc,
  userInitials,
  hasSupportTickets,
  onPostItem,
  onOpenSupport,
  onSignOut,
}: NavbarMobileProps) {
  const { t } = useI18n()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">{t("navbar.mainMenu")}</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[85vw] max-w-xs sm:max-w-sm">
        <SheetTitle className="sr-only">{t("navbar.mainMenu")}</SheetTitle>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 pb-6 border-b">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={avatarSrc} alt={userEmail || t("navbar.userAlt")} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium break-all">{userEmail}</p>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? t("navbar.admin") : t("navbar.member")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher compact />
              <ModeToggle />
            </div>
          </div>

          <div className="flex-1 py-6 space-y-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className="w-full justify-start gap-3"
                asChild
                onClick={() => onOpenChange(false)}
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
                  onOpenChange(false)
                  onPostItem()
                }}
              >
                <Plus className="h-4 w-4" />
                {t("navbar.postItem")}
              </Button>

              {hasSupportTickets && (
                <Button variant="ghost" className="w-full justify-start gap-3" asChild>
                  <Link href="/support" onClick={() => onOpenChange(false)}>
                    <MessageSquare className="h-4 w-4" />
                    {t("navbar.myTickets")}
                  </Link>
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => {
                  onOpenChange(false)
                  onOpenSupport()
                }}
              >
                <HelpCircle className="h-4 w-4" />
                {t("navbar.help")}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => {
                onSignOut()
                onOpenChange(false)
              }}
            >
              <LogOut className="h-4 w-4" />
              {t("navbar.signOut")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
