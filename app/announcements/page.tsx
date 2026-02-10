"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AlertCircle, CalendarClock, ChevronRight, Loader2, Megaphone, RefreshCw } from "lucide-react"
import type { Announcement } from "@/types"
import { resolveImageUrl } from "@/lib/cloudinary-url"
import { useI18n } from "@/components/language-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate()
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof (value as { toMillis?: () => number }).toMillis === "function") {
    const d = new Date((value as { toMillis: () => number }).toMillis())
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === "object" && value !== null && "_seconds" in (value as object)) {
    const d = new Date((value as { _seconds: number })._seconds * 1000)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { locale, tt } = useI18n()

  const intlLocale = locale === "th" ? "th-TH" : "en-US"

  const formatDate = useCallback(
    (value: unknown): string => {
      const d = toDate(value)
      if (!d) return "-"
      return d.toLocaleString(intlLocale, { dateStyle: "medium", timeStyle: "short" })
    },
    [intlLocale]
  )

  const getStatus = useCallback(
    (announcement: Announcement, now: Date): { label: string; className: string } => {
      const startAt = toDate(announcement.startAt)
      const endAt = toDate(announcement.endAt)

      if (!announcement.isActive) {
        return {
          label: tt("ปิดแสดง", "Hidden"),
          className: "bg-muted text-muted-foreground border-border",
        }
      }
      if (startAt && startAt > now) {
        return {
          label: tt("รอแสดง", "Scheduled"),
          className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        }
      }
      if (endAt && endAt < now) {
        return {
          label: tt("หมดอายุ", "Expired"),
          className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
        }
      }
      return {
        label: tt("กำลังแสดง", "Active"),
        className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      }
    },
    [tt]
  )

  const getTypeBadge = useCallback(
    (type: Announcement["type"]): { label: string; className: string } => {
      if (type === "critical") {
        return {
          label: tt("สำคัญ", "Critical"),
          className: "bg-red-500/10 text-red-600 border-red-500/20",
        }
      }
      if (type === "warning") {
        return {
          label: tt("เตือน", "Warning"),
          className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        }
      }
      return {
        label: tt("ทั่วไป", "General"),
        className: "bg-primary/10 text-primary border-primary/20",
      }
    },
    [tt]
  )

  const loadAnnouncements = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const response = await fetch("/api/announcements/history?limit=200", { cache: "no-store" })
      if (!response.ok) throw new Error(`Announcements history request failed (${response.status})`)
      const data = await response.json()
      const list = Array.isArray(data.announcements) ? data.announcements : []
      setAnnouncements(list)
      setErrorMessage(null)
    } catch (error) {
      console.error("[Announcements Page] load error:", error)
      setErrorMessage(
        tt(
          "ไม่สามารถโหลดประวัติประกาศได้ กรุณาลองใหม่อีกครั้ง",
          "Unable to load announcement history. Please try again."
        )
      )
      setAnnouncements([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [tt])

  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])

  const now = useMemo(() => new Date(), [announcements.length, refreshing])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tt("ประกาศประชาสัมพันธ์", "Announcements")}</h1>
            <p className="text-sm text-muted-foreground">
              {tt(
                "ดูประกาศล่าสุดและประวัติประกาศย้อนหลังทั้งหมด",
                "Browse current announcements and historical records."
              )}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => loadAnnouncements(true)}
          disabled={loading || refreshing}
          className="gap-2"
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {tt("รีเฟรช", "Refresh")}
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : errorMessage ? (
        <Card className="border-destructive/30">
          <CardContent className="flex items-center gap-3 py-10 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p>{tt("ยังไม่มีประกาศ", "No announcements yet")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {tt("ประวัติประกาศ", "Announcement history")} ({announcements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {announcements.map((announcement) => {
                const status = getStatus(announcement, now)
                const typeBadge = getTypeBadge(announcement.type)

                return (
                  <li key={announcement.id} className="rounded-xl border bg-card p-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold">{announcement.title}</h2>
                          <Badge variant="outline" className={typeBadge.className}>
                            {typeBadge.label}
                          </Badge>
                          <Badge variant="outline" className={status.className}>
                            {status.label}
                          </Badge>
                        </div>

                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{announcement.message}</p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {tt("สร้างเมื่อ", "Created")} {formatDate(announcement.createdAt)}
                          </span>
                          {announcement.startAt ? (
                            <span>
                              {tt("เริ่มแสดง", "Starts")} {formatDate(announcement.startAt)}
                            </span>
                          ) : null}
                          {announcement.endAt ? (
                            <span>
                              {tt("หมดอายุ", "Ends")} {formatDate(announcement.endAt)}
                            </span>
                          ) : null}
                        </div>

                        {announcement.linkUrl ? (
                          <Button asChild variant="link" className="h-auto p-0 text-sm">
                            <Link href={announcement.linkUrl}>
                              {announcement.linkLabel || tt("ดูรายละเอียดเพิ่มเติม", "Read more")}
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : null}
                      </div>

                      {announcement.imagePublicId ? (
                        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border bg-muted">
                          <Image
                            src={resolveImageUrl(announcement.imagePublicId, { width: 1200 })}
                            alt={announcement.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 280px"
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-[16/9] items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                          {tt("ไม่มีรูปประกาศ", "No image")}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
