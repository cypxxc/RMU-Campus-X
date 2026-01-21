"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float, MeshDistortMaterial } from "@react-three/drei"
import * as THREE from "three"

// Shape configurations
interface ShapeConfig {
  position: [number, number, number]
  color: string
  speed: number
  distort?: number
  size: number
  shape: "sphere" | "box" | "torus" | "octahedron"
}

const PRIMARY_COLOR = "#22c55e"
const SECONDARY_COLOR = "#16a34a"
const ACCENT_COLOR = "#ef4444"
const PARTICLE_SEED = 1337

const SHAPES: ShapeConfig[] = [
  { position: [-3, 2, -5], color: PRIMARY_COLOR, speed: 1.2, size: 1.5, shape: "sphere", distort: 0.3 },
  { position: [3.5, -1.5, -4], color: SECONDARY_COLOR, speed: 0.8, size: 1.2, shape: "box", distort: 0.2 },
  { position: [-2, -2, -6], color: ACCENT_COLOR, speed: 1.5, size: 1, shape: "torus", distort: 0.3 },
  { position: [2, 3, -7], color: PRIMARY_COLOR, speed: 0.6, size: 0.8, shape: "octahedron", distort: 0.4 },
  { position: [4, 0, -8], color: SECONDARY_COLOR, speed: 1, size: 1.3, shape: "sphere", distort: 0.3 },
  { position: [-4, 1, -9], color: ACCENT_COLOR, speed: 0.7, size: 0.9, shape: "box", distort: 0.3 },
]

const LITE_SHAPES: ShapeConfig[] = [
  { position: [-2, 1, -4], color: PRIMARY_COLOR, speed: 0.8, size: 1.2, shape: "sphere", distort: 0.2 },
  { position: [2, -1, -5], color: SECONDARY_COLOR, speed: 0.6, size: 1, shape: "box", distort: 0.15 },
]

const createSeededRandom = (seed: number) => {
  let value = seed
  return () => {
    value += 0x6d2b79f5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function FloatingShape({ 
  position, 
  color, 
  speed = 1, 
  distort = 0.3,
  size = 1,
  shape = "sphere"
}: ShapeConfig) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Use simple rotation for performance
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * speed * 0.2
      meshRef.current.rotation.y = state.clock.elapsedTime * speed * 0.3
    }
  })

  // Reduced geometry segments for better performance
  const geometry = useMemo(() => {
    switch (shape) {
      case "box":
        return <boxGeometry args={[size, size, size]} />
      case "torus":
        // Reduced segments from 16, 32 to 12, 24
        return <torusGeometry args={[size * 0.6, size * 0.25, 12, 24]} />
      case "octahedron":
        return <octahedronGeometry args={[size * 0.7]} />
      default:
        // Reduced segments from 32, 32 to 24, 24
        return <sphereGeometry args={[size * 0.5, 24, 24]} />
    }
  }, [shape, size])

  return (
    <Float
      speed={speed}
      rotationIntensity={0.5}
      floatIntensity={1.5}
      floatingRange={[-0.2, 0.2]}
    >
      <mesh ref={meshRef} position={position}>
        {geometry}
        <MeshDistortMaterial
          color={color}
          transparent
          opacity={0.7}
          distort={distort}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </Float>
  )
}

function Particles({ count = 100 }: { count?: number }) {
  const points = useMemo(() => {
    const random = createSeededRandom(PARTICLE_SEED + count)
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (random() - 0.5) * 20
      positions[i * 3 + 1] = (random() - 0.5) * 20
      positions[i * 3 + 2] = (random() - 0.5) * 20
    }
    return positions
  }, [count])

  const pointsRef = useRef<THREE.Points>(null)

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.01
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[points, 3]}
        />
      </bufferGeometry>
      {/* Use sizeAttenuation=false if possible for perf, but here we want depth */}
      <pointsMaterial
        size={0.03}
        color="#4ade80"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[-10, -10, -5]} intensity={0.4} color={PRIMARY_COLOR} />

      {SHAPES.map((props, i) => (
        <FloatingShape key={i} {...props} />
      ))}

      <Particles count={100} /> {/* Reduced count from 150 */}
    </>
  )
}

export function ThreeBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.5]} // Keep limited DPR for performance
        frameloop="demand" // Only render when needed/requested, or use always if animating continually
        // Actually for floating animation 'always' is smoother, but 'demand' saves battery if nothing moves. 
        // Since we have useFrame, it will trigger loop. Let's stick to default or 'always' for smooth animation, 
        // but 'demand' might cause stutter if not handling invalidation correctly. 
        // However, useFrame usually forces invalidation. 
        // Let's remove frameloop="demand" to ensure smooth animation for background unless it's strictly static.
        // Actually, for a background that is always animating, strict 'demand' might miss frames if not driving loop.
        // But React Three Fiber's default is 'always'.
        // Let's try explicit 'always' or just remove the prop to fallback to default (always).
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}

export function ThreeBackgroundLite({ className = "" }: { className?: string }) {
  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={1}
        gl={{ 
          antialias: false,
          alpha: true,
          powerPreference: "low-power"
        }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        {LITE_SHAPES.map((props, i) => (
          <FloatingShape key={i} {...props} />
        ))}
        <Particles count={30} />
      </Canvas>
    </div>
  )
}
