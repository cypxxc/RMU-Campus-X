export type ReportServiceErrorCode = "BAD_REQUEST" | "INTERNAL"

export class ReportServiceError extends Error {
  readonly code: ReportServiceErrorCode

  constructor(message: string, code: ReportServiceErrorCode = "BAD_REQUEST") {
    super(message)
    this.name = "ReportServiceError"
    this.code = code
  }
}

export function isReportServiceError(error: unknown): error is ReportServiceError {
  return error instanceof ReportServiceError
}
