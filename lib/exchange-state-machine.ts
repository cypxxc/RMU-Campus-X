/**
 * Exchange State Machine
 * Canonical phase flow: pending -> in_progress -> completed
 * Legacy status "accepted" is mapped to "in_progress" for compatibility.
 */

import type { ExchangeStatus } from "@/types"

export function normalizeExchangePhaseStatus(status: ExchangeStatus): ExchangeStatus {
  return status === "accepted" ? "in_progress" : status
}

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

export const STATUS_LABELS: Record<ExchangeStatus, string> = {
  pending: "รอเจ้าของตอบรับ",
  accepted: "กำลังดำเนินการ",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิกแล้ว",
  rejected: "ปฏิเสธแล้ว",
}

export const STATUS_DESCRIPTIONS: Record<ExchangeStatus, string> = {
  pending: "รอเจ้าของสิ่งของตอบรับคำขอ",
  accepted: "กำลังดำเนินการ",
  in_progress: "กำลังดำเนินการ - กำลังส่งมอบ/รับของ",
  completed: "แลกเปลี่ยนเสร็จสมบูรณ์",
  cancelled: "การแลกเปลี่ยนถูกยกเลิก",
  rejected: "เจ้าของปฏิเสธคำขอ",
}

export function getConfirmButtonLabel(status: ExchangeStatus, role: "owner" | "requester"): string {
  const effectiveStatus = normalizeExchangePhaseStatus(status)
  if (effectiveStatus === "in_progress") {
    return role === "owner" ? "ยืนยันส่งมอบแล้ว" : "ยืนยันรับของแล้ว"
  }
  return "ยืนยัน"
}

export function getWaitingOtherConfirmationMessage(role: "owner" | "requester"): string {
  return role === "owner"
    ? "คุณยืนยันส่งมอบแล้ว - รออีกฝ่ายยืนยันรับของ"
    : "คุณยืนยันรับของแล้ว - รออีกฝ่ายยืนยันส่งมอบ"
}

export function isValidTransition(
  currentStatus: ExchangeStatus,
  newStatus: ExchangeStatus
): boolean {
  const allowed = VALID_TRANSITIONS[currentStatus]
  return allowed?.includes(newStatus) ?? false
}

export function isTerminalStatus(status: ExchangeStatus): boolean {
  return VALID_TRANSITIONS[status]?.length === 0
}

export function getNextStatuses(currentStatus: ExchangeStatus): ExchangeStatus[] {
  return VALID_TRANSITIONS[currentStatus] || []
}

export function validateTransition(
  currentStatus: ExchangeStatus,
  newStatus: ExchangeStatus
): string | null {
  if (currentStatus === newStatus) {
    return null
  }

  if (isTerminalStatus(currentStatus)) {
    return `Cannot change status: exchange is already ${STATUS_LABELS[currentStatus]}`
  }

  if (!isValidTransition(currentStatus, newStatus)) {
    const allowed = getNextStatuses(currentStatus)
    const allowedLabels = allowed.map((s) => STATUS_LABELS[s]).join(", ")
    return `Invalid status transition from ${STATUS_LABELS[currentStatus]} to ${STATUS_LABELS[newStatus]}. Allowed: ${allowedLabels}`
  }

  return null
}

export function getAllowedActions(
  status: ExchangeStatus,
  role: "owner" | "requester"
): ("accept" | "reject" | "cancel" | "confirm")[] {
  const actions: ("accept" | "reject" | "cancel" | "confirm")[] = []
  const effectiveStatus = normalizeExchangePhaseStatus(status)

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
