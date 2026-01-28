/**
 * Reports API Route
 * สร้าง Report พร้อมส่ง LINE Notification ไปยัง Admin
 * 
 * ✅ Uses withValidation wrapper for consistent validation and auth
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { withValidation, type ValidationContext } from "@/lib/api-validation"
import { createReport } from "@/lib/services/reports/create-report"
import { createFirebaseAdminReportDeps } from "@/lib/services/reports/firebase-admin-deps"
import { isReportServiceError } from "@/lib/services/reports/errors"
import { sanitizeText } from "@/lib/security"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

/**
 * Zod schema for report creation
 */
const createReportSchema = z.object({
  reportType: z.enum(["item_report", "exchange_report", "chat_report", "user_report"], {
    errorMap: () => ({ message: "กรุณาระบุประเภทการรายงานที่ถูกต้อง" })
  }),
  reasonCode: z.string().optional().transform(val => val ? sanitizeText(val) : val),
  reason: z.string().optional().transform(val => val ? sanitizeText(val) : val),
  description: z.string().min(1, "กรุณาระบุรายละเอียด").transform(sanitizeText),
  targetId: z.string().min(1, "กรุณาระบุเป้าหมายที่ต้องการรายงาน"),
  targetType: z.string().optional().transform(val => val ? sanitizeText(val) : val),
  targetTitle: z.string().optional().transform(val => val ? sanitizeText(val) : val),
  itemId: z.string().optional(),
  itemTitle: z.string().optional().transform(val => val ? sanitizeText(val) : val),
  exchangeId: z.string().optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
})

type CreateReportInput = z.infer<typeof createReportSchema>

/**
 * POST /api/reports
 * Create a new report
 */
export const POST = withValidation(
  createReportSchema,
  async (_request, data: CreateReportInput, ctx: ValidationContext | null) => {
    if (!ctx) {
      return NextResponse.json(
        { error: "Authentication context missing", code: "AUTH_ERROR" },
        { status: 401 }
      )
    }

    try {
      const deps = createFirebaseAdminReportDeps()
      const result = await createReport({
        input: {
          reportType: data.reportType,
          reasonCode: data.reasonCode || "",
          reason: data.reason || "",
          description: data.description,
          targetId: data.targetId,
          targetTitle: data.targetTitle,
          itemId: data.itemId,
          itemTitle: data.itemTitle,
          exchangeId: data.exchangeId,
          evidenceUrls: data.evidenceUrls,
        },
        context: { 
          reporterId: ctx.userId, 
          reporterEmail: ctx.email || "" 
        },
        deps,
        baseUrl: BASE_URL,
        adminNotificationTitle: "📢 มีรายงานใหม่",
      })

      return NextResponse.json({
        success: true,
        data: { reportId: result.reportId }
      })
    } catch (error) {
      if (isReportServiceError(error)) {
        return NextResponse.json(
          { error: error.message, code: "REPORT_ERROR" },
          { status: 400 }
        )
      }
      console.error("[Report API] Error:", error)
      return NextResponse.json(
        { error: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500 }
      )
    }
  },
  { requireAuth: true }
)
