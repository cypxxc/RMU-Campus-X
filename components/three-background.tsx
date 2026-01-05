"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float, MeshDistortMaterial } from "@react-three/drei"
import * as THREE from "three"

// Floating geometric shape component
function FloatingShape({ 
  position, 
  color, 
  speed = 1, 
  distort = 0.3,
  size = 1,
  shape = "sphere"
}: { 
  position: [number, number, number]
  color: string
  speed?: number
  distort?: number
  size?: number
  shape?: "sphere" | "box" | "torus" | "octahedron"
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * speed * 0.2
      meshRef.current.rotation.y = state.clock.elapsedTime * speed * 0.3
    }
  })

  const geometry = useMemo(() => {
    switch (shape) {
      case "box":
        return <boxGeometry args={[size, size, size]} />
      case "torus":
        return <torusGeometry args={[size * 0.6, size * 0.25, 16, 32]} />
      case "octahedron":
        return <octahedronGeometry args={[size * 0.7]} />
      default:
        return <sphereGeometry args={[size * 0.5, 32, 32]} />
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

// Particle field for ambient effect
function Particles({ count = 100 }: { count?: number }) {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
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

// Scene with all 3D elements
function Scene() {
  // University colors: Green (primary) and Red (accent)
  const primaryColor = "#22c55e"
  const secondaryColor = "#16a34a"
  const accentColor = "#ef4444"

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[-10, -10, -5]} intensity={0.4} color={primaryColor} />

      {/* Floating shapes */}
      <FloatingShape 
        position={[-3, 2, -5]} 
        color={primaryColor} 
        speed={1.2} 
        size={1.5}
        shape="sphere"
      />
      <FloatingShape 
        position={[3.5, -1.5, -4]} 
        color={secondaryColor} 
        speed={0.8} 
        size={1.2}
        shape="box"
        distort={0.2}
      />
      <FloatingShape 
        position={[-2, -2, -6]} 
        color={accentColor} 
        speed={1.5} 
        size={1}
        shape="torus"
      />
      <FloatingShape 
        position={[2, 3, -7]} 
        color={primaryColor} 
        speed={0.6} 
        size={0.8}
        shape="octahedron"
        distort={0.4}
      />
      <FloatingShape 
        position={[4, 0, -8]} 
        color={secondaryColor} 
        speed={1} 
        size={1.3}
        shape="sphere"
      />
      <FloatingShape 
        position={[-4, 1, -9]} 
        color={accentColor} 
        speed={0.7} 
        size={0.9}
        shape="box"
      />

      {/* Particle system */}
      <Particles count={150} />
    </>
  )
}

// Main background component
export function ThreeBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.5]}
        frameloop="demand"
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

// Lightweight version for performance-sensitive contexts
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
        <FloatingShape 
          position={[-2, 1, -4]} 
          color="#22c55e" 
          speed={0.8} 
          size={1.2}
          shape="sphere"
          distort={0.2}
        />
        <FloatingShape 
          position={[2, -1, -5]} 
          color="#16a34a" 
          speed={0.6} 
          size={1}
          shape="box"
          distort={0.15}
        />
        <Particles count={50} />
      </Canvas>
    </div>
  )
}
