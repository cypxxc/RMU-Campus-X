import { REPORT_TYPE_LABELS } from "@/lib/constants"

export const REPORT_TYPE_CONFIG = {
  item_report: { targetType: "item", label: REPORT_TYPE_LABELS.item_report?.th ?? "item_report" },
  exchange_report: { targetType: "exchange", label: REPORT_TYPE_LABELS.exchange_report?.th ?? "exchange_report" },
  user_report: { targetType: "user", label: REPORT_TYPE_LABELS.user_report?.th ?? "user_report" },
} as const

export type ReportTypeKey = keyof typeof REPORT_TYPE_CONFIG

class ReportTypeService {
  getReportTypeConfig(reportType: string) {
    const config = REPORT_TYPE_CONFIG[reportType as ReportTypeKey]
    if (config) return config
    return { targetType: "unknown", label: reportType }
  }

  getReportTypeLabel(reportType: string): string {
    return this.getReportTypeConfig(reportType).label
  }
}

const reportTypeService = new ReportTypeService()

export function getReportTypeConfig(reportType: string) {
  return reportTypeService.getReportTypeConfig(reportType)
}

export function getReportTypeLabel(reportType: string): string {
  return reportTypeService.getReportTypeLabel(reportType)
}
