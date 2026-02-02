"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

// Dynamic import for Three.js - loads ONLY when needed (after page ready)
const ThreeBackgroundLite = dynamic(
  () => import("@/components/three-background").then((mod) => mod.ThreeBackgroundLite),
  { ssr: false, loading: () => null }
)

/**
 * Client component that handles the lazy-loaded 3D background.
 * Keeping this separate allows the rest of the landing page to be a Server Component.
 */
export function LandingHero3D() {
  // Lazy load 3D background after page is ready
  const [show3D, setShow3D] = useState(false)
  
  useEffect(() => {
    // Wait for page to be interactive before loading 3D
    const timer = setTimeout(() => setShow3D(true), 800)
    return () => clearTimeout(timer)
  }, [])

  if (!show3D) return null

  return (
    <div className="fixed inset-0 h-screen animate-in fade-in duration-1000 -z-10">
      <ThreeBackgroundLite />
    </div>
  )
}
