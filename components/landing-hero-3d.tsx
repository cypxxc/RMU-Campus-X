"use client"

import { ThreeBackgroundLite } from "@/components/three-background"

/**
 * Client component that renders the animated background on the landing page.
 * Now uses lightweight CSS animation instead of Three.js — no lazy loading needed.
 */
export function LandingHero3D() {
  return (
    <div className="fixed inset-0 h-screen -z-10">
      <ThreeBackgroundLite />
    </div>
  )
}
