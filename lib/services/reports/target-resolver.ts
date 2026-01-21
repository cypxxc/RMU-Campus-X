import { getReportTypeConfig } from "@/lib/reports/report-types"
import type {
  CreateReportInput,
  ReportCreateContext,
  ReportCreateDeps,
  ReportTargetResolution,
} from "@/lib/services/reports/types"

const asString = (value: unknown): string => (typeof value === "string" ? value : "")

export async function resolveReportTarget(
  input: CreateReportInput,
  context: ReportCreateContext,
  deps: Pick<ReportCreateDeps, "getItemById" | "getExchangeById" | "getUserById">
): Promise<ReportTargetResolution> {
  const { reportType, targetId, targetTitle } = input
  const { reporterId } = context
  const config = getReportTypeConfig(reportType)

  let resolvedTitle = targetTitle || ""
  let reportedUserId = ""
  let reportedUserEmail = ""

  try {
    if (reportType === "item_report") {
      const item = await deps.getItemById(targetId)
      if (item) {
        reportedUserId = asString(item.postedBy)
        reportedUserEmail = asString(item.postedByEmail)
        if (!resolvedTitle) resolvedTitle = asString(item.title)
      }
    } else if (reportType === "exchange_report" || reportType === "chat_report") {
      const exchange = await deps.getExchangeById(targetId)
      if (exchange) {
        const ownerId = asString(exchange.ownerId)
        const requesterId = asString(exchange.requesterId)
        if (ownerId && requesterId) {
          if (reporterId === ownerId) {
            reportedUserId = requesterId
            reportedUserEmail = asString(exchange.requesterEmail)
          } else {
            reportedUserId = ownerId
            reportedUserEmail = asString(exchange.ownerEmail)
          }
        }
        if (!resolvedTitle) resolvedTitle = asString(exchange.itemTitle)
      }
    } else if (reportType === "user_report") {
      reportedUserId = targetId
      const user = await deps.getUserById(targetId)
      if (user) {
        reportedUserEmail = asString(user.email)
        if (!resolvedTitle) resolvedTitle = reportedUserEmail
      }
    }
  } catch (error) {
    console.error("[Report Service] Failed to resolve target:", error)
  }

  return {
    reportedUserId,
    reportedUserEmail,
    targetType: config.targetType,
    targetTitle: resolvedTitle,
  }
}
