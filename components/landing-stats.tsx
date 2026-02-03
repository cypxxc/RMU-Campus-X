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
    <div className="grid grid-cols-3 gap-4 mt-16 max-w-md mx-auto">
      {STATS_LABELS.map(({ key, label }) => {
        const value = stats?.[key]
        const display = loading && value == null ? "—" : `${value ?? 0}+`
        return (
          <div key={key} className="text-center">
            <p className="text-2xl sm:text-3xl font-black text-primary">{display}</p>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
          </div>
        )
      })}
    </div>
  )
}
