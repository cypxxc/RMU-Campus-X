"use client"

/**
 * Next.js Template component - wraps every page with instant fade
 * Optimized for snappy navigation feel
 */
import type React from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6, filter: "blur(6px)" }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6, filter: "blur(6px)" }}
        transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
        className="min-h-[1px]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
