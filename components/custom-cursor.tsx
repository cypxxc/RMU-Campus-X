"use client"

import { useEffect, useState, useCallback, useRef } from "react"

/**
 * Custom Brand Cursor - วงกลมเล็กขยายเมื่อ hover ปุ่ม/ลิงก์
 * ซ่อนบน touch devices และ respects prefers-reduced-motion
 */
export function CustomCursor() {
  const [mounted, setMounted] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const rafRef = useRef<number>(0)
  const posRef = useRef({ x: -100, y: -100 })
  const targetRef = useRef({ x: -100, y: -100 })

  const updateCursor = useCallback(() => {
    posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.15
    posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.15
    setPos({ ...posRef.current })
    rafRef.current = requestAnimationFrame(updateCursor)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0
    if (prefersReducedMotion || isTouchDevice) return

    const interactiveSelector =
      'button, a, [role="button"], [type="button"], [type="submit"], [type="reset"], label[for], select, [tabindex]:not([tabindex="-1"])'

    const onMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY }
    }

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target?.closest?.(interactiveSelector)) setIsHovering(true)
    }

    const onOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement
      if (!related?.closest?.(interactiveSelector)) setIsHovering(false)
    }

    document.addEventListener("mousemove", onMove, { passive: true })
    document.addEventListener("mouseover", onOver, { passive: true })
    document.addEventListener("mouseout", onOut, { passive: true })
    rafRef.current = requestAnimationFrame(updateCursor)

    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseover", onOver)
      document.removeEventListener("mouseout", onOut)
      cancelAnimationFrame(rafRef.current)
    }
  }, [mounted, updateCursor])

  useEffect(() => {
    if (!mounted) return
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0
    if (!prefersReducedMotion && !isTouchDevice) {
      document.body.classList.add("custom-cursor-active")
    }
    return () => document.body.classList.remove("custom-cursor-active")
  }, [mounted])

  if (!mounted) return null

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0)

  if (prefersReducedMotion || isTouchDevice) return null

  const size = isHovering ? 44 : 12

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      aria-hidden
      style={{
        left: pos.x,
        top: pos.y,
        transform: "translate(-50%, -50%)",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid var(--primary)`,
        backgroundColor: isHovering ? "color-mix(in oklch, var(--primary) 12%, transparent)" : "transparent",
        transition: "width 0.2s ease, height 0.2s ease, background-color 0.2s ease",
        willChange: "transform",
      }}
    />
  )
}
