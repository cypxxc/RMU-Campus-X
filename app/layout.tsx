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
    default: "RMU Exchange - แพลตฟอร์มแลกเปลี่ยนสิ่งของ",
    template: "%s | RMU Exchange",
  },
  description: "แพลตฟอร์มแลกเปลี่ยนและขอรับสิ่งของสำหรับนักศึกษา มหาวิทยาลัยราชภัฏมหาสารคาม",
  keywords: ["RMU", "แลกเปลี่ยน", "สิ่งของ", "นักศึกษา", "มหาวิทยาลัยราชภัฏมหาสารคาม"],
  authors: [{ name: "RMU Exchange Team" }],
  icons: {
    icon: [
      { url: "/icon.svg?v=2", type: "image/svg+xml" },
      { url: "/icon-light.svg?v=2", media: "(prefers-color-scheme: light)", type: "image/svg+xml" },
      { url: "/icon-dark.svg?v=2", media: "(prefers-color-scheme: dark)", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.svg?v=2",
    shortcut: "/icon.svg?v=2",
  },
  openGraph: {
    type: "website",
    locale: "th_TH",
    title: "RMU Exchange",
    description: "แพลตฟอร์มแลกเปลี่ยนและขอรับสิ่งของสำหรับนักศึกษา มหาวิทยาลัยราชภัฏมหาสารคาม",
    siteName: "RMU Exchange",
  },
  robots: {
    index: true,
    follow: true,
  },
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
