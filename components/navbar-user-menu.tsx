"use client"

import Link from "next/link"
import {
  ChevronDown,
  LogOut,
  Shield,
  User,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/components/language-provider"

interface NavbarUserMenuProps {
  userEmail: string
  isAdmin: boolean
  avatarSrc: string | undefined
  userInitials: string
  onSignOut: () => void
}

export function NavbarUserMenu({
  userEmail,
  isAdmin,
  avatarSrc,
  userInitials,
  onSignOut,
}: NavbarUserMenuProps) {
  const { t } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hidden lg:flex items-center gap-2 pl-1 pr-2 h-9 max-w-[240px]"
        >
          <Avatar className="h-7 w-7 border">
            <AvatarImage src={avatarSrc} alt={userEmail || t("navbar.userAlt")} className="object-cover" />
            <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm text-muted-foreground">{userEmail}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="sr-only">{t("navbar.userMenu")}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 rounded-xl">
        <DropdownMenuLabel className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground">{t("navbar.userAccount")}</p>
          <p className="text-sm font-medium break-all">{userEmail}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <Link href="/profile">
            <User className="h-4 w-4" />
            {t("navbar.profile")}
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem asChild className="gap-2 cursor-pointer">
            <Link href="/admin">
              <Shield className="h-4 w-4" />
              {t("navbar.admin")}
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          onSelect={(event) => {
            event.preventDefault()
            onSignOut()
          }}
        >
          <LogOut className="h-4 w-4" />
          {t("navbar.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
