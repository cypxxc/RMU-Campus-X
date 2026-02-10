"use client"

import { useContext } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useI18n } from "@/components/language-provider"
import { NavigationHistoryContext } from "@/components/navigation-history-provider"
import { getLabelForPath, pathToHistoryEntries } from "@/lib/breadcrumb-labels"

export function SiteBreadcrumb() {
  const pathname = usePathname()
  const { locale } = useI18n()
  const ctx = useContext(NavigationHistoryContext)

  if (pathname === "/") return null

  const rawHistory = ctx?.history ?? (pathname ? pathToHistoryEntries(pathname, locale) : [])
  const localizedHistory = rawHistory.map((entry) => ({
    path: entry.path,
    label: getLabelForPath(entry.path, locale),
  }))
  const navigateToBreadcrumb = ctx?.navigateToBreadcrumb

  // รวมรายการที่ label ซ้ำติดกัน (เก็บ path และ originalIndex ตัวล่าสุดของแต่ละชุด)
  type EntryWithIndex = { path: string; label: string; originalIndex: number }
  const history = localizedHistory.reduce<EntryWithIndex[]>((acc, entry, i) => {
    const last = acc[acc.length - 1]
    if (last && last.label === entry.label) {
      acc[acc.length - 1] = { path: entry.path, label: entry.label, originalIndex: i }
      return acc
    }
    acc.push({ path: entry.path, label: entry.label, originalIndex: i })
    return acc
  }, [])

  if (history.length <= 1) return null

  return (
    <div className="w-full bg-background">
      <div className="container py-2">
        <Breadcrumb>
          <BreadcrumbList>
            {history.map((entry, index) => {
              const isLast = index === history.length - 1
              const isFirst = index === 0

              return (
                <div key={`${entry.path}-${index}`} className="flex items-center gap-1.5 sm:gap-2.5">
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{entry.label}</BreadcrumbPage>
                    ) : navigateToBreadcrumb ? (
                      <BreadcrumbLink asChild>
                        <button
                          type="button"
                          onClick={() => navigateToBreadcrumb(entry.originalIndex)}
                          className="flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0 text-inherit font-inherit hover:text-foreground transition-colors"
                        >
                          {isFirst && <Home className="h-4 w-4" />}
                          <span className={isFirst ? "hidden sm:inline" : ""}>{entry.label}</span>
                        </button>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={entry.path} className="flex items-center gap-1">
                          {isFirst && <Home className="h-4 w-4" />}
                          <span className={isFirst ? "hidden sm:inline" : ""}>{entry.label}</span>
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  )
}
