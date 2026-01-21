/**
 * Reports API Route
 * สร้าง Report พร้อมส่ง LINE Notification ไปยัง Admin
 */

import { NextRequest } from "next/server"
import { verifyIdToken } from "@/lib/firebase-admin"
import { successResponse, ApiErrors, validateRequiredFields, parseRequestBody, getAuthToken } from "@/lib/api-response"
import { createReport } from "@/lib/services/reports/create-report"
import { createFirebaseAdminReportDeps } from "@/lib/services/reports/firebase-admin-deps"
import { isReportServiceError } from "@/lib/services/reports/errors"
import type { Report } from "@/types"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
const ADMIN_REPORT_NOTIFICATION_TITLE = "dYs\" …,­…,ć…,ś…,ý…,›…,Ř…,ý…,T…1ź…,®…,­…1^"

interface CreateReportBody {
  reportType: Report["reportType"]
  reasonCode: string
  reason: string
  description: string
  targetId: string
  targetType?: string
  targetTitle?: string
  itemId?: string
  itemTitle?: string
  exchangeId?: string
  evidenceUrls?: string[]
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication (prevents anonymous/spoofed reports)
    const token = getAuthToken(request)
    if (!token) {
      return ApiErrors.unauthorized("Missing authentication token")
    }

    const decoded = await verifyIdToken(token, true)
    if (!decoded) {
      return ApiErrors.unauthorized("Invalid or expired session")
    }

    const body = await parseRequestBody<CreateReportBody>(request)
    if (!body) {
      return ApiErrors.badRequest("Invalid request body")
    }

    const {
      reportType,
      reasonCode,
      reason,
      description,
      targetId,
      targetType: _targetType,
      targetTitle,
      ...optionalFields
    } = body

    // Validate required fields
    const validation = validateRequiredFields(body, ["reportType", "targetId"])
    if (!validation.valid) {
      return ApiErrors.missingFields(validation.missing)
    }

    // Resolve reporter from token (prevents spoofing)
    const reporterId = decoded.uid
    const reporterEmail = decoded.email || ""

    const deps = createFirebaseAdminReportDeps()
    const result = await createReport({
      input: {
        reportType,
        reasonCode,
        reason,
        description,
        targetId,
        targetTitle,
        ...optionalFields,
      },
      context: { reporterId, reporterEmail },
      deps,
      baseUrl: BASE_URL,
      adminNotificationTitle: ADMIN_REPORT_NOTIFICATION_TITLE,
    })

    return successResponse({ reportId: result.reportId })
  } catch (error) {
    if (isReportServiceError(error)) {
      return ApiErrors.badRequest(error.message)
    }
    console.error("[Report API] Error:", error)
    return ApiErrors.internalError()
  }
}
