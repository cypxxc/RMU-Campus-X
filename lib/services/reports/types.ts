export interface CreateReportInput {
  reportType: string
  reasonCode?: string
  reason?: string
  description?: string
  targetId: string
  targetTitle?: string
  itemId?: string
  itemTitle?: string
  exchangeId?: string
  evidenceUrls?: string[]
  [key: string]: unknown
}

export interface ReportCreateContext {
  reporterId: string
  reporterEmail: string
}

export interface ReportTargetResolution {
  reportedUserId: string
  reportedUserEmail: string
  targetType: string
  targetTitle: string
}

export interface AdminNotificationInput {
  userId: string
  title: string
  message: string
  type: string
  relatedId: string
  isRead?: boolean
}

export interface ReportCreateDeps {
  getItemById: (id: string) => Promise<Record<string, unknown> | null>
  getExchangeById: (id: string) => Promise<Record<string, unknown> | null>
  getUserById: (id: string) => Promise<Record<string, unknown> | null>
  createReport: (data: Record<string, unknown>) => Promise<string>
  listAdminEmails: () => Promise<string[]>
  findUserIdByEmail: (email: string) => Promise<string | null>
  createNotification: (data: AdminNotificationInput) => Promise<void>
  getAdminLineUserIds: () => Promise<string[]>
  notifyAdminsNewReport: (
    adminLineUserIds: string[],
    reportType: string,
    targetTitle: string,
    reporterEmail: string,
    baseUrl: string
  ) => Promise<void>
}

export interface CreateReportParams {
  input: CreateReportInput
  context: ReportCreateContext
  deps: ReportCreateDeps
  baseUrl: string
  adminNotificationTitle: string
}
