"use client"

import { useEffect, useState } from "react"

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
    <div className="mt-10 w-full max-w-lg mx-auto rounded-2xl border border-border/60 bg-background/60 backdrop-blur px-6 py-4 shadow-soft">
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
        {STATS_LABELS.map(({ key, label }) => {
          const value = stats?.[key]
          const display = loading && value == null ? "—" : `${value ?? 0}+`
          return (
            <div
              key={key}
              className="flex flex-col items-center justify-center py-3 sm:py-2 px-4 sm:px-5 min-w-0"
            >
              <p className="text-2xl sm:text-3xl font-black text-primary tabular-nums">{display}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 text-center leading-tight">{label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
