import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { AuthProvider } from "@/components/auth-provider"
import { ConditionalFooter } from "@/components/conditional-footer"
import { NavigationHistoryProvider } from "@/components/navigation-history-provider"
import { AnnouncementProvider } from "@/components/announcement-context"
import { ConsentGuard } from "@/components/consent-guard"
import { TopLoadingBar } from "@/components/top-loading-bar"
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider"
import { CookieConsentBanner } from "@/components/cookie-consent-banner"
import { LanguageProvider } from "@/components/language-provider"
import { getServerLocale } from "@/lib/i18n/server"
import "./globals.css"

const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
})

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const metadataBase = new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"
  )

  const isThai = locale === "th"
  const titleDefault = isThai
    ? "RMU-Campus X - แพลตฟอร์มแลกเปลี่ยนสิ่งของ"
    : "RMU-Campus X - Campus Item Exchange Platform"
  const description = isThai
    ? "แพลตฟอร์มแลกเปลี่ยนและขอรับสิ่งของ สำหรับนักศึกษา มหาวิทยาลัยราชภัฏมหาสารคาม"
    : "A campus item exchange platform for students and staff at Rajabhat Maha Sarakham University."
  const ogDescription = isThai
    ? "แพลตฟอร์มแลกเปลี่ยนและขอรับสิ่งของ สำหรับนักศึกษา มหาวิทยาลัยราชภัฏมหาสารคาม — ฟรี ไม่มีค่าใช้จ่าย"
    : "Exchange and request items across campus community — free for RMU students and staff."
  const imageAlt = isThai
    ? "RMU-Campus X - แพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษา RMU"
    : "RMU-Campus X - Campus item exchange for RMU students"

  return {
    metadataBase,
    title: {
      default: titleDefault,
      template: "%s | RMU-Campus X",
    },
    description,
    keywords: isThai
      ? ["RMU", "Campus X", "แลกเปลี่ยน", "สิ่งของ", "นักศึกษา", "มหาวิทยาลัยราชภัฏมหาสารคาม"]
      : ["RMU", "Campus X", "item exchange", "campus", "students", "Rajabhat Maha Sarakham University"],
    authors: [{ name: "RMU-Campus X Team" }],
    icons: {
      icon: "/images/exchange.svg",
      shortcut: "/images/exchange.svg",
      apple: "/images/exchange.svg",
    },
    openGraph: {
      type: "website",
      locale: isThai ? "th_TH" : "en_US",
      url: "/",
      title: titleDefault,
      description: ogDescription,
      siteName: "RMU-Campus X",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description: ogDescription,
      images: ["/opengraph-image"],
    },
    robots: {
      follow: true,
    },
    manifest: "/manifest.json",
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getServerLocale()

  return (
    <html lang={locale} suppressHydrationWarning className={geistMono.variable} data-scroll-behavior="smooth">
      <body className="font-sans antialiased bg-background text-foreground">
        <LanguageProvider initialLocale={locale}>
          <QueryProvider>
            <AuthProvider>
              <ConsentGuard>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                disableTransitionOnChange
              >
                <AnnouncementProvider>
                <NavigationHistoryProvider>
                  <SmoothScrollProvider>
                    <TopLoadingBar />
                    {children}
                    <ConditionalFooter />
                    <CookieConsentBanner />
                  </SmoothScrollProvider>
                </NavigationHistoryProvider>
              </AnnouncementProvider>
                <Toaster />
                <Analytics />
              </ThemeProvider>
              </ConsentGuard>
            </AuthProvider>
          </QueryProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
