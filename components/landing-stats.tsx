"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

const LottieSuccess = dynamic(
  () => import("@/components/lottie-success").then((m) => ({ default: m.LottieSuccess })),
  { ssr: false }
)

const STATS_LABELS = [
  { key: "items" as const, label: "สิ่งของ" },
  { key: "users" as const, label: "ผู้ใช้งาน" },
  { key: "completedExchanges" as const, label: "แลกเปลี่ยนสำเร็จ" },
]

interface StatsData {
  items: number
  users: number
  completedExchanges: number
}

export function LandingStats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/public/stats")
      const json = await res.json().catch(() => ({}))
      if (res.ok && json?.success && json?.data) {
        setStats(json.data)
      }
    } catch {
      // keep previous or null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchStats()
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="mt-16 max-w-lg mx-auto rounded-2xl border border-border/60 bg-background/60 backdrop-blur px-6 py-5 shadow-soft">
      {!loading && stats != null && (
        <div className="flex justify-center mb-3" aria-hidden>
          <LottieSuccess className="size-8" loop={false} />
        </div>
      )}
      <div className="grid grid-cols-3 gap-4">
        {STATS_LABELS.map(({ key, label }, i) => {
          const value = stats?.[key]
          const display = loading && value == null ? "—" : `${value ?? 0}+`
          const isLast = i === STATS_LABELS.length - 1
          return (
            <div key={key} className={`text-center ${!isLast ? "border-r border-border/60" : ""}`}>
              <p className="text-2xl sm:text-3xl font-black text-primary tabular-nums">{display}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
