import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
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
  title: {
    default: "RMU-Campus X - แพลตฟอร์มแลกเปลี่ยนสิ่งของ",
    template: "%s | RMU-Campus X",
  },
  description: "แพลตฟอร์มแลกเปลี่ยนและขอรับสิ่งของสำหรับนักศึกษา มหาวิทยาลัยราชภัฏมหาสารคาม",
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
    description: "แพลตฟอร์มแลกเปลี่ยนและขอรับสิ่งของสำหรับนักศึกษา มหาวิทยาลัยราชภัฏมหาสารคาม",
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
    <html lang="th" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <Analytics />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
