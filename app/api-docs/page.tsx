"use client"

import dynamic from "next/dynamic"
import { useI18n } from "@/components/language-provider"
import "swagger-ui-react/swagger-ui.css"

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false })

export default function ApiDocsPage() {
  const { tt } = useI18n()
  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}/api` : "/api"
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "RMU-Campus X API",
      description: tt("เอกสาร API สำหรับระบบแลกเปลี่ยนสิ่งของ", "API documentation for the campus item exchange platform"),
      version: "1.0.0",
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Firebase ID Token",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/health": { get: { summary: "Health Check", security: [], responses: { "200": { description: "OK" } } } },
      "/items": {
        get: { summary: "List items", parameters: [{ name: "categories", in: "query" }, { name: "search", in: "query" }, { name: "pageSize", in: "query" }], responses: { "200": { description: "OK" } } },
        post: { summary: "Create item (auth + terms)", requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "OK" } } },
      },
      "/items/{id}": { get: { summary: "Get item" }, patch: { summary: "Update item" }, delete: { summary: "Delete item" } },
      "/users/me": { get: { summary: "Get profile" }, patch: { summary: "Update profile" } },
      "/users/me/accept-terms": { post: { summary: "Accept terms" } },
      "/exchanges": { get: { summary: "List exchanges" }, post: { summary: "Create exchange" } },
      "/exchanges/respond": { post: { summary: "Accept/Reject exchange" } },
      "/favorites": { get: { summary: "List favorites" }, post: { summary: "Add favorite" } },
      "/favorites/{itemId}": { delete: { summary: "Remove favorite" } },
      "/notifications": { get: { summary: "List notifications" } },
      "/reviews": { get: { summary: "List reviews" }, post: { summary: "Create review" } },
      "/reports": { post: { summary: "Submit report" } },
      "/support": { get: { summary: "List tickets" }, post: { summary: "Create ticket" } },
      "/announcements": { get: { summary: "List announcements", security: [] } },
    },
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="prose dark:prose-invert max-w-none mb-6">
        <h1 className="text-2xl font-bold">{tt("เอกสาร API", "API Documentation")}</h1>
        <p className="text-muted-foreground text-sm">
          {tt("เอกสารครบถ้วนใน docs/API.md — ใช้ Bearer Token จาก Firebase Auth", "Full docs in docs/API.md — use Bearer token from Firebase Auth")}
        </p>
      </div>
      <div className="[&_.swagger-ui]:bg-transparent">
        <SwaggerUI spec={spec} />
      </div>
    </div>
  )
}
