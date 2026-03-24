import { NextRequest } from "next/server"
import { ApiErrors, successResponse } from "@/lib/api-response"
import { processNotificationRetryQueue } from "@/lib/server/notification-delivery"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function getInternalSecret(): string {
  return (
    process.env.NOTIFICATION_RETRY_TOKEN ||
    process.env.CRON_SECRET ||
    process.env.INTERNAL_API_TOKEN ||
    ""
  )
}

function getRequestToken(request: NextRequest): string {
  const headerToken = request.headers.get("x-internal-token")?.trim()
  if (headerToken) return headerToken
  const authHeader = request.headers.get("authorization")?.trim() ?? ""
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim()
  }
  return ""
}

function parseLimit(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(parsed), MAX_LIMIT)
}

class InternalNotificationsRetryController {
  async post(request: NextRequest) {
    const secret = getInternalSecret()
    if (!secret) {
      return ApiErrors.internalError("Internal notification retry secret is not configured")
    }

    const requestToken = getRequestToken(request)
    if (!requestToken || requestToken !== secret) {
      return ApiErrors.unauthorized("Invalid internal token")
    }

    let limit = DEFAULT_LIMIT
    try {
      const body = await request.json()
      if (body && typeof body === "object" && "limit" in body) {
        limit = parseLimit((body as { limit?: unknown }).limit)
      }
    } catch {
      // Empty body is acceptable.
    }

    try {
      const result = await processNotificationRetryQueue({
        limit,
        source: "api.internal.notifications.retry",
      })
      return successResponse({
        ...result,
        limit,
        processedAt: new Date().toISOString(),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process notification retry queue"
      return ApiErrors.internalError(message)
    }
  }
}

const controller = new InternalNotificationsRetryController()

export async function POST(request: NextRequest) {
  return controller.post(request)
}
