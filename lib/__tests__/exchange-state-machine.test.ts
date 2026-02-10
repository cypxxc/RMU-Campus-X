/**
 * Tests for Exchange State Machine
 */

import { describe, it, expect } from "vitest"
import {
  isValidTransition,
  isTerminalStatus,
  getNextStatuses,
  validateTransition,
  getAllowedActions,
  VALID_TRANSITIONS,
  STATUS_LABELS,
  normalizeExchangePhaseStatus,
} from "../exchange-state-machine"
import type { ExchangeStatus } from "@/types"

describe("Exchange State Machine", () => {
  describe("normalizeExchangePhaseStatus", () => {
    it("maps legacy accepted to in_progress", () => {
      expect(normalizeExchangePhaseStatus("accepted")).toBe("in_progress")
    })

    it("keeps canonical statuses unchanged", () => {
      expect(normalizeExchangePhaseStatus("pending")).toBe("pending")
      expect(normalizeExchangePhaseStatus("in_progress")).toBe("in_progress")
      expect(normalizeExchangePhaseStatus("completed")).toBe("completed")
    })
  })

  describe("isValidTransition", () => {
    it("allows pending -> in_progress", () => {
      expect(isValidTransition("pending", "in_progress")).toBe(true)
    })

    it("allows pending -> rejected", () => {
      expect(isValidTransition("pending", "rejected")).toBe(true)
    })

    it("allows pending -> cancelled", () => {
      expect(isValidTransition("pending", "cancelled")).toBe(true)
    })

    it("keeps legacy accepted -> in_progress", () => {
      expect(isValidTransition("accepted", "in_progress")).toBe(true)
    })

    it("allows in_progress -> completed", () => {
      expect(isValidTransition("in_progress", "completed")).toBe(true)
    })

    it("does not allow pending -> accepted anymore", () => {
      expect(isValidTransition("pending", "accepted")).toBe(false)
    })

    it("does not allow skipping states (pending -> completed)", () => {
      expect(isValidTransition("pending", "completed")).toBe(false)
    })
  })

  describe("isTerminalStatus", () => {
    it("returns true for terminal statuses", () => {
      expect(isTerminalStatus("completed")).toBe(true)
      expect(isTerminalStatus("cancelled")).toBe(true)
      expect(isTerminalStatus("rejected")).toBe(true)
    })

    it("returns false for active statuses", () => {
      expect(isTerminalStatus("pending")).toBe(false)
      expect(isTerminalStatus("accepted")).toBe(false)
      expect(isTerminalStatus("in_progress")).toBe(false)
    })
  })

  describe("getNextStatuses", () => {
    it("returns valid next statuses for pending", () => {
      const next = getNextStatuses("pending")
      expect(next).toContain("in_progress")
      expect(next).toContain("rejected")
      expect(next).toContain("cancelled")
      expect(next).toHaveLength(3)
    })

    it("returns empty for terminal statuses", () => {
      expect(getNextStatuses("completed")).toEqual([])
      expect(getNextStatuses("cancelled")).toEqual([])
      expect(getNextStatuses("rejected")).toEqual([])
    })
  })

  describe("validateTransition", () => {
    it("returns null for valid transition", () => {
      expect(validateTransition("pending", "in_progress")).toBeNull()
    })

    it("returns null for same status", () => {
      expect(validateTransition("pending", "pending")).toBeNull()
    })

    it("returns error message for invalid transition", () => {
      const result = validateTransition("pending", "completed")
      expect(result).toBeTruthy()
      expect(result).toContain("Invalid status transition")
    })

    it("returns error message for terminal state", () => {
      const result = validateTransition("completed", "cancelled")
      expect(result).toBeTruthy()
      expect(result).toContain("Cannot change status")
    })
  })

  describe("getAllowedActions", () => {
    it("allows owner to accept/reject pending exchange", () => {
      const actions = getAllowedActions("pending", "owner")
      expect(actions).toContain("accept")
      expect(actions).toContain("reject")
      expect(actions).not.toContain("cancel")
    })

    it("allows requester to cancel pending exchange", () => {
      const actions = getAllowedActions("pending", "requester")
      expect(actions).toContain("cancel")
      expect(actions).not.toContain("accept")
    })

    it("allows both parties to cancel/confirm in_progress exchange", () => {
      const ownerActions = getAllowedActions("in_progress", "owner")
      const requesterActions = getAllowedActions("in_progress", "requester")

      expect(ownerActions).toContain("cancel")
      expect(ownerActions).toContain("confirm")
      expect(requesterActions).toContain("cancel")
      expect(requesterActions).toContain("confirm")
    })

    it("keeps legacy accepted behavior", () => {
      const ownerActions = getAllowedActions("accepted", "owner")
      expect(ownerActions).toContain("confirm")
      expect(ownerActions).toContain("cancel")
    })
  })

  describe("constants", () => {
    it("has labels for all statuses", () => {
      const statuses: ExchangeStatus[] = [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
        "rejected",
      ]

      for (const status of statuses) {
        expect(STATUS_LABELS[status]).toBeTruthy()
      }
    })

    it("has transition map for all statuses", () => {
      const statuses: ExchangeStatus[] = [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
        "rejected",
      ]

      for (const status of statuses) {
        expect(VALID_TRANSITIONS[status]).toBeDefined()
        expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true)
      }
    })
  })
})
