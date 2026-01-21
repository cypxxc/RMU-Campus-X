"use client"

import dynamic from "next/dynamic"
import "swagger-ui-react/swagger-ui.css"
import openApiSpec from "@/lib/openapi.json"

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic<{ spec: any }>(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  ),
})

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            RMU-Campus X API Documentation
          </h1>
          <p className="mt-2 text-gray-600">
            API สำหรับระบบแลกเปลี่ยนสิ่งของของนักศึกษา มหาวิทยาลัยราชภัฏมหาสารคาม
          </p>
        </div>
        <SwaggerUI spec={openApiSpec as any} />
      </div>
    </div>
  )
}
