import { describe, it, expect, vi } from "vitest"
import {
  updateUserStatusWithDeps,
  issueWarningWithDeps,
} from "@/lib/services/admin/user-actions"
import type {
  UserStatusUpdateDeps,
  WarningIssueDeps,
  UserData,
} from "@/lib/services/admin/types"

// ============ Mock Dependencies Factory ============

const createMockUserStatusDeps = (overrides: Partial<UserStatusUpdateDeps> = {}): UserStatusUpdateDeps => ({
  getUserById: vi.fn().mockResolvedValue(null),
  createUser: vi.fn().mockResolvedValue(undefined),
  updateUser: vi.fn().mockResolvedValue(undefined),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  createNotification: vi.fn().mockResolvedValue(undefined),
  createWarningRecord: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

const createMockWarningDeps = (overrides: Partial<WarningIssueDeps> = {}): WarningIssueDeps => ({
  getUserById: vi.fn().mockResolvedValue(null),
  updateUser: vi.fn().mockResolvedValue(undefined),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  createNotification: vi.fn().mockResolvedValue(undefined),
  createWarningRecord: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

// ============ Tests ============

describe("updateUserStatusWithDeps", () => {
  const baseParams = {
    adminId: "admin-1",
    adminEmail: "admin@test.com",
    userId: "user-1",
    status: "SUSPENDED" as const,
    reason: "Test reason",
  }

  it("creates user if not exists", async () => {
    const deps = createMockUserStatusDeps()

    await updateUserStatusWithDeps(baseParams, deps)

    expect(deps.createUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        status: "SUSPENDED",
        restrictions: { canPost: false, canExchange: false, canChat: false },
      })
    )
  })

  it("updates existing user", async () => {
    const existingUser: UserData = {
      uid: "user-1",
      email: "user@test.com",
      status: "ACTIVE",
    }
    const deps = createMockUserStatusDeps({
      getUserById: vi.fn().mockResolvedValue(existingUser),
    })

    await updateUserStatusWithDeps(baseParams, deps)

    expect(deps.updateUser).toHaveBeenCalled()
    expect(deps.createUser).not.toHaveBeenCalled()
  })

  it("creates audit log on success", async () => {
    const deps = createMockUserStatusDeps()

    await updateUserStatusWithDeps(baseParams, deps)

    expect(deps.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "user_suspend",
        status: "success",
        adminId: "admin-1",
      })
    )
  })

  it("creates notification for user", async () => {
    const deps = createMockUserStatusDeps()

    await updateUserStatusWithDeps(baseParams, deps)

    expect(deps.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "warning",
        title: "อัปเดตสถานะบัญชี",
      })
    )
  })

  it("creates warning record for non-active status", async () => {
    const deps = createMockUserStatusDeps()

    await updateUserStatusWithDeps(baseParams, deps)

    expect(deps.createWarningRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        action: "SUSPEND",
      })
    )
  })

  it("does not create warning record when activating", async () => {
    const deps = createMockUserStatusDeps()

    await updateUserStatusWithDeps({ ...baseParams, status: "ACTIVE" }, deps)

    expect(deps.createWarningRecord).not.toHaveBeenCalled()
  })

  it("logs failure on error", async () => {
    const deps = createMockUserStatusDeps({
      updateUser: vi.fn().mockRejectedValue(new Error("DB error")),
      getUserById: vi.fn().mockResolvedValue({ uid: "user-1", status: "ACTIVE" }),
    })

    await expect(updateUserStatusWithDeps(baseParams, deps)).rejects.toThrow("DB error")

    expect(deps.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
      })
    )
  })
})

describe("issueWarningWithDeps", () => {
  const baseParams = {
    adminId: "admin-1",
    adminEmail: "admin@test.com",
    userId: "user-1",
    reason: "Test warning",
  }

  it("throws when user not found", async () => {
    const deps = createMockWarningDeps()

    await expect(issueWarningWithDeps(baseParams, deps)).rejects.toThrow("User not found")
  })

  it("increments warning count", async () => {
    const existingUser: UserData = {
      uid: "user-1",
      email: "user@test.com",
      warningCount: 2,
    }
    const deps = createMockWarningDeps({
      getUserById: vi.fn().mockResolvedValue(existingUser),
    })

    const result = await issueWarningWithDeps(baseParams, deps)

    expect(result.warningCount).toBe(3)
    expect(deps.updateUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        warningCount: 3,
      })
    )
  })

  it("creates warning record", async () => {
    const existingUser: UserData = { uid: "user-1", email: "user@test.com" }
    const deps = createMockWarningDeps({
      getUserById: vi.fn().mockResolvedValue(existingUser),
    })

    await issueWarningWithDeps(baseParams, deps)

    expect(deps.createWarningRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        action: "WARNING",
        reason: "Test warning",
      })
    )
  })

  it("notifies user", async () => {
    const existingUser: UserData = { uid: "user-1", warningCount: 0 }
    const deps = createMockWarningDeps({
      getUserById: vi.fn().mockResolvedValue(existingUser),
    })

    await issueWarningWithDeps(baseParams, deps)

    expect(deps.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "warning",
        message: "Test warning (คำเตือนครั้งที่ 1)",
      })
    )
  })
})
