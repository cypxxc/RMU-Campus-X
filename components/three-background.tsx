"use client"

/**
 * Lightweight CSS-based animated background
 * Replaces Three.js (~600KB) with pure CSS floating gradient orbs + particles
 * Visual: translucent floating circles with blur, matching RMU green/red brand colors
 */

const PRIMARY_COLOR = "rgba(34, 197, 94, 0.18)"    // green
const SECONDARY_COLOR = "rgba(22, 163, 74, 0.14)"  // darker green
const ACCENT_COLOR = "rgba(239, 68, 68, 0.10)"     // red accent

interface OrbConfig {
  size: number
  x: string
  y: string
  color: string
  duration: number
  delay: number
}

const ORBS: OrbConfig[] = [
  { size: 260, x: "15%",  y: "20%",  color: PRIMARY_COLOR,   duration: 18, delay: 0 },
  { size: 200, x: "70%",  y: "60%",  color: SECONDARY_COLOR, duration: 22, delay: 2 },
  { size: 180, x: "80%",  y: "15%",  color: ACCENT_COLOR,    duration: 20, delay: 4 },
  { size: 240, x: "30%",  y: "75%",  color: PRIMARY_COLOR,   duration: 25, delay: 1 },
  { size: 150, x: "55%",  y: "40%",  color: SECONDARY_COLOR, duration: 16, delay: 3 },
  { size: 120, x: "10%",  y: "50%",  color: ACCENT_COLOR,    duration: 19, delay: 5 },
]

const LITE_ORBS: OrbConfig[] = [
  { size: 220, x: "20%",  y: "25%",  color: PRIMARY_COLOR,   duration: 20, delay: 0 },
  { size: 180, x: "65%",  y: "55%",  color: SECONDARY_COLOR, duration: 24, delay: 2 },
]

// Pre-generate static particle positions (no Math.random at render time)
const PARTICLE_POSITIONS = [
  { left: "12%", top: "8%" },  { left: "28%", top: "15%" }, { left: "45%", top: "5%" },
  { left: "67%", top: "12%" }, { left: "82%", top: "22%" }, { left: "91%", top: "8%" },
  { left: "5%",  top: "35%" }, { left: "22%", top: "42%" }, { left: "38%", top: "38%" },
  { left: "55%", top: "30%" }, { left: "73%", top: "45%" }, { left: "88%", top: "35%" },
  { left: "15%", top: "58%" }, { left: "32%", top: "65%" }, { left: "48%", top: "55%" },
  { left: "62%", top: "68%" }, { left: "78%", top: "58%" }, { left: "95%", top: "52%" },
  { left: "8%",  top: "78%" }, { left: "25%", top: "85%" }, { left: "42%", top: "75%" },
  { left: "58%", top: "88%" }, { left: "75%", top: "82%" }, { left: "92%", top: "72%" },
  { left: "18%", top: "92%" }, { left: "35%", top: "95%" }, { left: "52%", top: "90%" },
  { left: "68%", top: "95%" }, { left: "85%", top: "90%" }, { left: "3%",  top: "48%" },
]

function FloatingOrb({ size, x, y, color, duration, delay }: OrbConfig) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(40px)",
        animation: `float-orb ${duration}s ease-in-out ${delay}s infinite alternate`,
        willChange: "transform",
      }}
    />
  )
}

function Particles({ count = 30 }: { count?: number }) {
  const particles = PARTICLE_POSITIONS.slice(0, count)
  return (
    <>
      {particles.map((pos, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 3,
            height: 3,
            left: pos.left,
            top: pos.top,
            backgroundColor: "rgba(74, 222, 128, 0.35)",
            animation: `twinkle ${2 + (i % 3)}s ease-in-out ${(i * 0.3) % 3}s infinite alternate`,
          }}
        />
      ))}
    </>
  )
}

export function ThreeBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`fixed inset-0 -z-10 overflow-hidden ${className}`}>
      <style>{animationStyles}</style>
      {ORBS.map((orb, i) => (
        <FloatingOrb key={i} {...orb} />
      ))}
      <Particles count={30} />
    </div>
  )
}

export function ThreeBackgroundLite({ className = "" }: { className?: string }) {
  return (
    <div className={`fixed inset-0 -z-10 overflow-hidden ${className}`}>
      <style>{animationStyles}</style>
      {LITE_ORBS.map((orb, i) => (
        <FloatingOrb key={i} {...orb} />
      ))}
      <Particles count={12} />
    </div>
  )
}

const animationStyles = `
  @keyframes float-orb {
    0% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -20px) scale(1.05); }
    66% { transform: translate(-20px, 15px) scale(0.95); }
    100% { transform: translate(10px, -10px) scale(1.02); }
  }
  @keyframes twinkle {
    0% { opacity: 0.2; transform: scale(0.8); }
    100% { opacity: 0.7; transform: scale(1.2); }
  }
`
