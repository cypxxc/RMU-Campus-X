import { describe, it, expect, vi } from "vitest"
import { createReport } from "@/lib/services/reports/create-report"
import { ReportServiceError } from "@/lib/services/reports/errors"
import type { ReportCreateDeps } from "@/lib/services/reports/types"

const baseDeps = (): ReportCreateDeps => ({
  getItemById: async () => null,
  getExchangeById: async () => null,
  getUserById: async () => null,
  createReport: async () => "report-id",
  listAdminEmails: async () => [],
  findUserIdByEmail: async () => null,
  createNotification: async () => undefined,
  getAdminLineUserIds: async () => [],
  notifyAdminsNewReport: async () => undefined,
})

describe("createReport", () => {
  it("throws when reported user cannot be resolved", async () => {
    const deps = baseDeps()

    await expect(
      createReport({
        input: {
          reportType: "item_report",
          targetId: "missing-item",
          reasonCode: "spam",
          reason: "Spam",
          description: "Test",
        },
        context: { reporterId: "user-1", reporterEmail: "u1@example.com" },
        deps,
        baseUrl: "http://localhost",
        adminNotificationTitle: "ADMIN_REPORT",
      })
    ).rejects.toBeInstanceOf(ReportServiceError)
  })

  it("creates report and notifies admins", async () => {
    const notifications: Array<{ message: string }> = []
    const createReportMock = vi.fn(async (data: Record<string, unknown>) => {
      expect(data).toMatchObject({
        reportType: "item_report",
        reportedUserId: "owner-1",
        reporterId: "reporter-1",
        targetId: "item-1",
      })
      return "report-123"
    })

    const notifyAdminsNewReport = vi.fn(async () => undefined)

    const deps: ReportCreateDeps = {
      ...baseDeps(),
      getItemById: async () => ({
        postedBy: "owner-1",
        postedByEmail: "owner@example.com",
        title: "Item One",
      }),
      createReport: createReportMock,
      listAdminEmails: async () => ["admin@example.com"],
      findUserIdByEmail: async () => "admin-user-1",
      createNotification: async (data) => {
        notifications.push({ message: data.message })
      },
      getAdminLineUserIds: async () => ["line-user-1"],
      notifyAdminsNewReport,
    }

    const result = await createReport({
      input: {
        reportType: "item_report",
        targetId: "item-1",
        reasonCode: "spam",
        reason: "Spam",
        description: "Test",
      },
      context: { reporterId: "reporter-1", reporterEmail: "reporter@example.com" },
      deps,
      baseUrl: "http://localhost",
      adminNotificationTitle: "ADMIN_REPORT",
    })

    expect(result.reportId).toBe("report-123")
    expect(notifications.length).toBe(1)
    expect(notifications[0]!.message).toContain("Item One")
    expect(notifyAdminsNewReport).toHaveBeenCalledWith(
      ["line-user-1"],
      "item_report",
      "Item One",
      "reporter@example.com",
      "http://localhost"
    )
  })
})
