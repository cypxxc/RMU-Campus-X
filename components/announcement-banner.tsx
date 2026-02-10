"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { Announcement, AnnouncementType } from "@/types"
import { useAnnouncement } from "@/components/announcement-context"
import { isTransientNetworkError } from "@/lib/api-client"
import { resolveImageUrl } from "@/lib/cloudinary-url"
import { X, ChevronRight, Info, AlertTriangle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/language-provider"

const STORAGE_KEY = "announcements_dismissed"

function getDismissedIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function dismissId(id: string) {
  const ids = getDismissedIds()
  if (ids.includes(id)) return
  ids.push(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

function getAnnouncementStyles(type: AnnouncementType) {
  switch (type) {
    case "critical":
      return {
        wrapper: "bg-red-600 text-white border-red-700",
        icon: AlertCircle,
        iconClass: "text-red-200",
      }
    case "warning":
      return {
        wrapper: "bg-amber-600 text-white border-amber-700",
        icon: AlertTriangle,
        iconClass: "text-amber-200",
      }
    default:
      return {
        wrapper: "bg-primary text-primary-foreground border-primary/80",
        icon: Info,
        iconClass: "text-primary-foreground/80",
      }
  }
}

const FALLBACK_POLL_MS = 120_000 // fallback ทุก 2 นาที ถ้า API ไม่ส่ง nextCheckInMs

export function AnnouncementBanner() {
  const { setHasAnnouncementVisible } = useAnnouncement()
  const { tt } = useI18n()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set(getDismissedIds()))
  const [loading, setLoading] = useState(true)

  // โหลดครั้งแรก + โหลดซ้ำตาม nextCheckInMs (เรียลไทม์เมื่อถึงเวลา) + fallback poll + เมื่อกลับมาเปิดแท็บ
  useEffect(() => {
    let mounted = true
    let scheduledRefetch: ReturnType<typeof setTimeout> | null = null
    let intervalRef: ReturnType<typeof setInterval> | null = null

    const fetchAnnouncements = async () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return
      try {
        const res = await fetch("/api/announcements")
        if (!res.ok) throw new Error(`Announcements request failed (${res.status})`)
        const data = await res.json()
        if (!mounted) return
        const list = Array.isArray(data.announcements) ? data.announcements : []
        setAnnouncements(list)
        const nextMs = typeof data.nextCheckInMs === "number" && data.nextCheckInMs > 0 ? data.nextCheckInMs : null
        if (scheduledRefetch) clearTimeout(scheduledRefetch)
        if (nextMs) {
          scheduledRefetch = setTimeout(fetchAnnouncements, nextMs)
        }
      } catch (error) {
        if (!mounted) return
        if (!isTransientNetworkError(error)) {
          setAnnouncements([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchAnnouncements()
    intervalRef = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      fetchAnnouncements()
    }, FALLBACK_POLL_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchAnnouncements()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      mounted = false
      if (scheduledRefetch) clearTimeout(scheduledRefetch)
      if (intervalRef) clearInterval(intervalRef)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  const visible = announcements.filter((a) => !dismissed.has(a.id))

  useEffect(() => {
    setHasAnnouncementVisible(!loading && visible.length > 0)
    return () => setHasAnnouncementVisible(false)
  }, [loading, visible.length, setHasAnnouncementVisible])

  if (loading || visible.length === 0) return null

  return (
    <div
      className="sticky top-24 sm:top-[6.5rem] z-20 min-h-12 flex items-center justify-center border-b border-border/40 bg-background/95 py-2"
      role="region"
      aria-label={tt("ประกาศ", "Announcements")}
    >
      <div className="flex w-full max-w-4xl flex-col gap-2 px-4 sm:px-6">
        {visible.map((a) => {
          const styles = getAnnouncementStyles(a.type)
          const Icon = styles.icon
          return (
            <div
              key={a.id}
              className={`flex items-center gap-4 rounded-lg px-4 py-3 sm:px-5 ${styles.wrapper} shadow-sm`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${styles.iconClass}`} aria-hidden />
              <div className="flex-1 min-w-0 max-w-2xl text-center">
                <p className="font-semibold text-sm">{a.title}</p>
                <p className="text-sm opacity-95 line-clamp-2">{a.message}</p>
                {a.imagePublicId && (
                  <div className="mt-2 overflow-hidden rounded-md border border-white/25 bg-black/10">
                    <Image
                      src={resolveImageUrl(a.imagePublicId, { width: 1200 })}
                      alt={a.title}
                      width={1200}
                      height={675}
                      className="h-auto w-full max-h-40 object-cover"
                      sizes="(max-width: 1024px) 100vw, 768px"
                    />
                  </div>
                )}
                {a.linkUrl && (
                  <Link
                    href={a.linkUrl}
                    className="inline-flex items-center gap-1 mt-1 text-sm font-medium underline underline-offset-2 hover:no-underline"
                  >
                    {a.linkLabel || tt("ดูรายละเอียด", "Read details")}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8 rounded-full hover:bg-white/20 text-current -mr-3"
                aria-label={tt("ปิดประกาศ", "Dismiss announcement")}
                onClick={() => {
                  dismissId(a.id)
                  setDismissed((prev) => new Set(prev).add(a.id))
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
