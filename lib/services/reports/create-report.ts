import { getReportTypeLabel } from "@/lib/reports/report-types"
import { ReportServiceError } from "@/lib/services/reports/errors"
import { resolveReportTarget } from "@/lib/services/reports/target-resolver"
import type { CreateReportParams } from "@/lib/services/reports/types"

export async function createReport(params: CreateReportParams): Promise<{ reportId: string }> {
  const { input, context, deps, baseUrl, adminNotificationTitle } = params

  const resolution = await resolveReportTarget(input, context, deps)
  if (!resolution.reportedUserId) {
    throw new ReportServiceError("Unable to resolve reported user", "BAD_REQUEST")
  }

  const {
    reportType,
    reasonCode,
    reason,
    description,
    targetId,
    targetTitle,
    reporterId,
    reporterEmail,
    targetType,
    ...extraFields
  } = input

  void targetTitle
  void reporterId
  void reporterEmail
  void targetType

  const reportId = await deps.createReport({
    reportType,
    reasonCode: reasonCode || "",
    reason: reason || "",
    description: description || "",
    reporterId: context.reporterId,
    reporterEmail: context.reporterEmail || "",
    targetId,
    ...extraFields,
    targetType: resolution.targetType,
    targetTitle: resolution.targetTitle || "",
    reportedUserId: resolution.reportedUserId,
    reportedUserEmail: resolution.reportedUserEmail || "",
    status: "new",
  })

  console.log("[Report API] Created report:", reportId)

  const adminEmails = await deps.listAdminEmails()
  const message = `${getReportTypeLabel(reportType) || reportType}: \"${resolution.targetTitle || targetId}\"`

  for (const email of adminEmails) {
    const adminUserId = await deps.findUserIdByEmail(email)
    if (adminUserId) {
      await deps.createNotification({
        userId: adminUserId,
        title: adminNotificationTitle,
        message,
        type: "report",
        relatedId: reportId,
        isRead: false,
      })
    }
  }

  const adminLineUserIds = await deps.getAdminLineUserIds()
  if (adminLineUserIds.length > 0) {
    console.log("[Report API] Sending LINE notification to", adminLineUserIds.length, "admins")
    await deps.notifyAdminsNewReport(
      adminLineUserIds,
      reportType,
      resolution.targetTitle || targetId,
      context.reporterEmail || "",
      baseUrl
    )
  }

  return { reportId }
}
