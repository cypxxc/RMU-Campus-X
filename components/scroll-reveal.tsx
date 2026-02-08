"use client"

import { useInView } from "react-intersection-observer"
import { useEffect, useState } from "react"

type Variant = "fade" | "slide-up" | "slide-left" | "slide-right" | "scale"

interface ScrollRevealProps {
  children: React.ReactNode
  variant?: Variant
  delay?: number
  className?: string
  rootMargin?: string
  threshold?: number
}

const variantStyles: Record<Variant, { initial: string; visible: string }> = {
  fade: {
    initial: "opacity-0",
    visible: "opacity-100",
  },
  "slide-up": {
    initial: "opacity-0 translate-y-8",
    visible: "opacity-100 translate-y-0",
  },
  "slide-left": {
    initial: "opacity-0 translate-x-8",
    visible: "opacity-100 translate-x-0",
  },
  "slide-right": {
    initial: "opacity-0 -translate-x-8",
    visible: "opacity-100 translate-x-0",
  },
  scale: {
    initial: "opacity-0 scale-95",
    visible: "opacity-100 scale-100",
  },
}

/**
 * Scroll-Triggered Animation - Fade/Slide เมื่อสกรอลมาถึง viewport
 * Respects prefers-reduced-motion
 */
export function ScrollReveal({
  children,
  variant = "slide-up",
  delay = 0,
  className = "",
  rootMargin = "0px 0px -60px 0px",
  threshold = 0.1,
}: ScrollRevealProps) {
  const [reduceMotion, setReduceMotion] = useState(false)
  const { ref, inView } = useInView({
    rootMargin,
    threshold,
    triggerOnce: true,
  })

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduceMotion(mq.matches)
    const handler = () => setReduceMotion(mq.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const styles = variantStyles[variant]
  const baseTransition = reduceMotion ? "none" : "transition-all duration-500 ease-out"
  const isVisible = reduceMotion || inView
  const stateClasses = isVisible ? styles.visible : styles.initial

  return (
    <div
      ref={ref}
      className={`${baseTransition} ${stateClasses} ${className}`}
      style={
        !reduceMotion && delay > 0
          ? { transitionDelay: isVisible ? `${delay}ms` : "0ms" }
          : undefined
      }
    >
      {children}
    </div>
  )
}
