import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { AuthProvider } from "@/components/auth-provider"
import { ConditionalFooter } from "@/components/conditional-footer"
import { NavigationHistoryProvider } from "@/components/navigation-history-provider"
import { AnnouncementProvider } from "@/components/announcement-context"
import { ConsentGuard } from "@/components/consent-guard"
import "./globals.css"

const geistSans = Geist({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"
  ),
  title: {
    default: "RMU-Campus X - แพลตฟอร์มแลกเปลี่ยนสิ่งของ",
    template: "%s | RMU-Campus X",
  },
  description: "แพลตฟอร์มแลกเปลี่ยนและขอรับสิ่งของ สำหรับนักศึกษาและบุคลากร มหาวิทยาลัยราชภัฏมหาสารคาม",
  keywords: ["RMU", "Campus X", "แลกเปลี่ยน", "สิ่งของ", "นักศึกษา", "มหาวิทยาลัยราชภัฏมหาสารคาม"],
  authors: [{ name: "RMU-Campus X Team" }],
  icons: {
    icon: "/images/exchange.svg",
    shortcut: "/images/exchange.svg",
    apple: "/images/exchange.svg",
  },
  openGraph: {
    type: "website",
    locale: "th_TH",
    title: "RMU-Campus X",
description: "แพลตฟอร์มแลกเปลี่ยนและขอรับสิ่งของ สำหรับนักศึกษาและบุคลากร มหาวิทยาลัยราชภัฏมหาสารคาม",
  siteName: "RMU-Campus X",
  },
  robots: {
    follow: true,
  },
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`} data-scroll-behavior="smooth">
      <body className="font-sans antialiased bg-background text-foreground">
        <QueryProvider>
          <AuthProvider>
            <ConsentGuard>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <AnnouncementProvider>
              <NavigationHistoryProvider>
                {children}
                <ConditionalFooter />
              </NavigationHistoryProvider>
            </AnnouncementProvider>
              <Toaster />
              <Analytics />
            </ThemeProvider>
            </ConsentGuard>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}

