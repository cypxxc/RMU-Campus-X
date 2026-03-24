/**
 * Exchange State Machine
 * Canonical phase flow: pending -> in_progress -> completed
 * Legacy status "accepted" is mapped to "in_progress" for compatibility.
 */

import type { ExchangeStatus } from "@/types"
import type { BilingualLabel } from "@/lib/constants"

/**
 * Valid state transitions for exchanges.
 * "accepted" is kept only to support old records.
 */
export const VALID_TRANSITIONS: Record<ExchangeStatus, ExchangeStatus[]> = {
  pending: ["in_progress", "rejected", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  rejected: [],
}

export const STATUS_LABELS: Record<ExchangeStatus, BilingualLabel> = {
  pending: { th: "รอเจ้าของตอบรับ", en: "Pending owner response" },
  accepted: { th: "กำลังดำเนินการ", en: "In progress" },
  in_progress: { th: "กำลังดำเนินการ", en: "In progress" },
  completed: { th: "เสร็จสิ้น", en: "Completed" },
  cancelled: { th: "ยกเลิกแล้ว", en: "Cancelled" },
  rejected: { th: "ปฏิเสธแล้ว", en: "Rejected" },
}

export const STATUS_DESCRIPTIONS: Record<ExchangeStatus, BilingualLabel> = {
  pending: { th: "รอเจ้าของสิ่งของตอบรับคำขอ", en: "Waiting for item owner to accept" },
  accepted: { th: "กำลังดำเนินการ", en: "In progress" },
  in_progress: { th: "กำลังดำเนินการ - กำลังส่งมอบ/รับของ", en: "In progress — handing over / receiving items" },
  completed: { th: "แลกเปลี่ยนเสร็จสมบูรณ์", en: "Exchange completed" },
  cancelled: { th: "การแลกเปลี่ยนถูกยกเลิก", en: "Exchange cancelled" },
  rejected: { th: "เจ้าของปฏิเสธคำขอ", en: "Owner rejected the request" },
}

class ExchangeStateMachineService {
  normalizeExchangePhaseStatus(status: ExchangeStatus): ExchangeStatus {
    return status === "accepted" ? "in_progress" : status
  }

  getConfirmButtonLabel(status: ExchangeStatus, role: "owner" | "requester"): BilingualLabel {
    const effectiveStatus = this.normalizeExchangePhaseStatus(status)
    if (effectiveStatus === "in_progress") {
      return role === "owner"
        ? { th: "ยืนยันส่งมอบแล้ว", en: "Confirm handoff" }
        : { th: "ยืนยันรับของแล้ว", en: "Confirm received" }
    }
    return { th: "ยืนยัน", en: "Confirm" }
  }

  getWaitingOtherConfirmationMessage(role: "owner" | "requester"): BilingualLabel {
    return role === "owner"
      ? {
          th: "คุณยืนยันส่งมอบแล้ว - รออีกฝ่ายยืนยันรับของ",
          en: "You confirmed handoff. Waiting for the other party to confirm receipt.",
        }
      : {
          th: "คุณยืนยันรับของแล้ว - รออีกฝ่ายยืนยันส่งมอบ",
          en: "You confirmed receipt. Waiting for the other party to confirm handoff.",
        }
  }

  isValidTransition(currentStatus: ExchangeStatus, newStatus: ExchangeStatus): boolean {
    const allowed = VALID_TRANSITIONS[currentStatus]
    return allowed?.includes(newStatus) ?? false
  }

  isTerminalStatus(status: ExchangeStatus): boolean {
    return VALID_TRANSITIONS[status]?.length === 0
  }

  getNextStatuses(currentStatus: ExchangeStatus): ExchangeStatus[] {
    return VALID_TRANSITIONS[currentStatus] || []
  }

  validateTransition(currentStatus: ExchangeStatus, newStatus: ExchangeStatus): string | null {
    if (currentStatus === newStatus) {
      return null
    }

    if (this.isTerminalStatus(currentStatus)) {
      return `Cannot change status: exchange is already ${STATUS_LABELS[currentStatus].th}`
    }

    if (!this.isValidTransition(currentStatus, newStatus)) {
      const allowed = this.getNextStatuses(currentStatus)
      const allowedLabels = allowed.map((s) => STATUS_LABELS[s].th).join(", ")
      return `Invalid status transition from ${STATUS_LABELS[currentStatus].th} to ${STATUS_LABELS[newStatus].th}. Allowed: ${allowedLabels}`
    }

    return null
  }

  getAllowedActions(
    status: ExchangeStatus,
    role: "owner" | "requester"
  ): ("accept" | "reject" | "cancel" | "confirm")[] {
    const actions: ("accept" | "reject" | "cancel" | "confirm")[] = []
    const effectiveStatus = this.normalizeExchangePhaseStatus(status)

    switch (effectiveStatus) {
      case "pending":
        if (role === "owner") {
          actions.push("accept", "reject")
        }
        if (role === "requester") {
          actions.push("cancel")
        }
        break
      case "in_progress":
        actions.push("cancel", "confirm")
        break
    }

    return actions
  }
}

const exchangeStateMachineService = new ExchangeStateMachineService()

export function normalizeExchangePhaseStatus(status: ExchangeStatus): ExchangeStatus {
  return exchangeStateMachineService.normalizeExchangePhaseStatus(status)
}

export function getConfirmButtonLabel(status: ExchangeStatus, role: "owner" | "requester"): BilingualLabel {
  return exchangeStateMachineService.getConfirmButtonLabel(status, role)
}

export function getWaitingOtherConfirmationMessage(role: "owner" | "requester"): BilingualLabel {
  return exchangeStateMachineService.getWaitingOtherConfirmationMessage(role)
}

export function isValidTransition(currentStatus: ExchangeStatus, newStatus: ExchangeStatus): boolean {
  return exchangeStateMachineService.isValidTransition(currentStatus, newStatus)
}

export function isTerminalStatus(status: ExchangeStatus): boolean {
  return exchangeStateMachineService.isTerminalStatus(status)
}

export function getNextStatuses(currentStatus: ExchangeStatus): ExchangeStatus[] {
  return exchangeStateMachineService.getNextStatuses(currentStatus)
}

export function validateTransition(currentStatus: ExchangeStatus, newStatus: ExchangeStatus): string | null {
  return exchangeStateMachineService.validateTransition(currentStatus, newStatus)
}

export function getAllowedActions(
  status: ExchangeStatus,
  role: "owner" | "requester"
): ("accept" | "reject" | "cancel" | "confirm")[] {
  return exchangeStateMachineService.getAllowedActions(status, role)
}
