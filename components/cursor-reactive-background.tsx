"use client"

import { useEffect, useRef, useState } from "react"

/** Smooth lerp for cursor-follow effect (0 = no move, 1 = instant) */
const LERP = 0.06
/** How many blobs and their size/color config - ใช้สีที่มองเห็นชัดทั้ง light/dark */
const BLOBS = [
  { size: 560, color: "var(--primary)", opacity: 0.42 },
  { size: 400, color: "var(--primary)", opacity: 0.28 },
  { size: 300, color: "var(--primary)", opacity: 0.2 },
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/**
 * Background ที่ตอบสนองกับเมาส์ แบบ Antigravity
 * แสดง gradient blobs นุ่มๆ ที่เคลื่อนตาม cursor แบบลากช้า
 */
export function CursorReactiveBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0.5, y: 0.5 })
  const blobRef = useRef(
    BLOBS.map((_, i) => ({
      x: 0.5 + (i - 1) * 0.08,
      y: 0.5 + (i % 2 === 0 ? 0.05 : -0.05),
    }))
  )
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return

    const el = containerRef.current
    if (!el) return

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      mouseRef.current = { x, y }
    }

    let rafId = 0
    const tick = () => {
      const mouse = mouseRef.current
      const blobs = blobRef.current
      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i]
        if (!b || mouse == null) continue
        const t = LERP * (1 + i * 0.2)
        b.x = lerp(b.x, mouse.x, t)
        b.y = lerp(b.y, mouse.y, t)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    window.addEventListener("mousemove", onMove, { passive: true })
    return () => {
      window.removeEventListener("mousemove", onMove)
      cancelAnimationFrame(rafId)
    }
  }, [mounted])

  const [blobPositions, setBlobPositions] = useState(() =>
    BLOBS.map((_, i) => ({
      x: 0.5 + (i - 1) * 0.08,
      y: 0.5 + (i % 2 === 0 ? 0.05 : -0.05),
    }))
  )

  useEffect(() => {
    if (!mounted) return
    const interval = setInterval(() => {
      setBlobPositions(blobRef.current.map((b) => ({ ...b })))
    }, 1000 / 30) // ~30fps for React state updates (smooth but not every frame)
    return () => clearInterval(interval)
  }, [mounted])

  if (!mounted) {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-background"
        aria-hidden
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
      aria-hidden
    >
      {BLOBS.map((blob, i) => {
        const pos = blobPositions[i] ?? { x: 0.5, y: 0.5 }
        return (
        <div
          key={i}
          className="absolute rounded-full blur-3xl transition-opacity duration-300"
          style={{
            width: blob.size,
            height: blob.size,
            left: `${pos.x * 100}%`,
            top: `${pos.y * 100}%`,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
            opacity: blob.opacity,
          }}
        />
        )
      })}
    </div>
  )
}
