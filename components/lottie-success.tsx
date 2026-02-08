"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Check } from "lucide-react"

const Lottie = dynamic(
  () => import("lottie-react").then((m) => m.default),
  { ssr: false, loading: () => <Check className="size-12 text-primary animate-scale-in" /> }
)

/**
 * แอนิเมชัน success ขนาดเล็ก ไฟล์เบา (จาก Lottie JSON ใน public)
 * ใช้ตอนโหลดสำเร็จ หรือสถานะสำเร็จ; fallback เป็นไอคอน Check
 */
export function LottieSuccess({
  className = "size-12",
  loop = false,
}: {
  className?: string
  loop?: boolean
}) {
  const [data, setData] = useState<object | null>(null)

  useEffect(() => {
    fetch("/lottie/success.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
  }, [])

  if (!data) {
    return <Check className={`${className} text-primary animate-scale-in`} aria-hidden />
  }

  return (
    <Lottie
      animationData={data}
      loop={loop}
      className={className}
      style={{ cursor: "default" }}
      rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
    />
  )
}
