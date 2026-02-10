"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useI18n } from "@/components/language-provider"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Logo } from "@/components/logo"
import { SUPPORT_MAILTO } from "@/lib/constants"

export function SiteFooter() {
  const currentYear = new Date().getFullYear()
  const pathname = usePathname()
  const fromLanding = pathname === "/"
  const { t } = useI18n()

  const footerLinks = [
    { href: "/guide", label: t("footer.guide") },
    { href: "/terms", label: t("footer.terms") },
    { href: "/privacy", label: t("footer.privacy") },
    { href: "/guidelines", label: t("footer.guidelines") },
  ]

  return (
    <footer className="border-t bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-14">
        <div className="flex flex-col items-center text-center gap-10 sm:gap-12">
          <div className="space-y-4 max-w-md">
            <Logo size="lg" className="inline-block" />
            <p className="text-muted-foreground text-sm leading-relaxed">{t("footer.description")}</p>
            <p className="text-muted-foreground text-sm">
              {t("footer.supportLabel")}{" "}
              <a href={SUPPORT_MAILTO} className="text-primary hover:underline">
                {t("footer.supportLink")}
              </a>
            </p>
            <LanguageSwitcher compact className="mx-auto" />
          </div>

          <nav aria-label={t("footer.navAria")} className="space-y-2">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
              {footerLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={fromLanding ? `${href}?from=landing` : href}
                    className="text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 sm:mt-12 pt-8 border-t border-border/80">
          <p className="text-center text-xs text-muted-foreground">
            {t("footer.copyright", { year: currentYear })}
          </p>
        </div>
      </div>
    </footer>
  )
}
