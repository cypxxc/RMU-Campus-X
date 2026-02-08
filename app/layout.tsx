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
import "./globals.css"

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
    url: "/",
    title: "RMU-Campus X - แพลตฟอร์มแลกเปลี่ยนสิ่งของ",
    description: "แพลตฟอร์มแลกเปลี่ยนและขอรับสิ่งของ สำหรับนักศึกษาและบุคลากร มหาวิทยาลัยราชภัฏมหาสารคาม — ฟรี ไม่มีค่าใช้จ่าย",
    siteName: "RMU-Campus X",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "RMU-Campus X - แพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษา RMU",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RMU-Campus X - แพลตฟอร์มแลกเปลี่ยนสิ่งของ",
    description: "แพลตฟอร์มแลกเปลี่ยนและขอรับสิ่งของ สำหรับนักศึกษาและบุคลากร ม.ราชภัฏมหาสารคาม — ฟรี ไม่มีค่าใช้จ่าย",
    images: ["/opengraph-image"],
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
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" suppressHydrationWarning className={geistMono.variable} data-scroll-behavior="smooth">
      <body className="font-sans antialiased bg-background text-foreground">
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
      </body>
    </html>
  )
}

