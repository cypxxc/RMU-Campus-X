"use client"

import { usePathname } from "next/navigation"
import { HelpBot } from "@/components/help-bot"

/**
 * Shows HelpBot on pages that have main app layout (dashboard, profile, support, etc.)
 * Hides on auth pages, landing, and admin (admin has its own layout)
 */
const HIDE_HELP_BOT_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/consent",
  "/admin",
  "/api-docs",
  "/guide",
  "/terms",
  "/privacy",
  "/guidelines",
]

function shouldShowHelpBot(pathname: string): boolean {
  if (!pathname || pathname === "/") return false
  return !HIDE_HELP_BOT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export function HelpBotWrapper() {
  const pathname = usePathname()
  if (!shouldShowHelpBot(pathname ?? "")) return null
  return <HelpBot />
}
