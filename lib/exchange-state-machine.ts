/**
 * Exchange State Machine
 * Validates state transitions to prevent invalid exchange status changes
 */

import type { ExchangeStatus } from '@/types'

/**
 * Valid state transitions for exchanges
 * Maps each status to the list of statuses it can transition to
 */
export const VALID_TRANSITIONS: Record<ExchangeStatus, ExchangeStatus[]> = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // Terminal state - no transitions allowed
  cancelled: [], // Terminal state - no transitions allowed
  rejected: [], // Terminal state - no transitions allowed
}

/**
 * Human-readable labels for exchange statuses
 */
export const STATUS_LABELS: Record<ExchangeStatus, string> = {
  pending: 'รอการตอบรับ',
  accepted: 'ตอบรับแล้ว',
  in_progress: 'กำลังดำเนินการ',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิกแล้ว',
  rejected: 'ปฏิเสธแล้ว',
}

/**
 * Check if a status transition is valid
 * @param currentStatus - Current exchange status
 * @param newStatus - Proposed new status
 * @returns true if transition is allowed
 */
export function isValidTransition(
  currentStatus: ExchangeStatus,
  newStatus: ExchangeStatus
): boolean {
  const allowed = VALID_TRANSITIONS[currentStatus]
  return allowed?.includes(newStatus) ?? false
}

/**
 * Check if a status is a terminal (final) state
 * @param status - Exchange status to check
 * @returns true if no further transitions are possible
 */
export function isTerminalStatus(status: ExchangeStatus): boolean {
  return VALID_TRANSITIONS[status]?.length === 0
}

/**
 * Get all possible next statuses from current status
 * @param currentStatus - Current exchange status
 * @returns Array of valid next statuses
 */
export function getNextStatuses(currentStatus: ExchangeStatus): ExchangeStatus[] {
  return VALID_TRANSITIONS[currentStatus] || []
}

/**
 * Validate a transition and return an error message if invalid
 * @param currentStatus - Current exchange status
 * @param newStatus - Proposed new status
 * @returns null if valid, error message string if invalid
 */
export function validateTransition(
  currentStatus: ExchangeStatus,
  newStatus: ExchangeStatus
): string | null {
  if (currentStatus === newStatus) {
    return null // Same status is always allowed (no-op)
  }

  if (isTerminalStatus(currentStatus)) {
    return `Cannot change status: exchange is already ${STATUS_LABELS[currentStatus]}`
  }

  if (!isValidTransition(currentStatus, newStatus)) {
    const allowed = getNextStatuses(currentStatus)
    const allowedLabels = allowed.map((s) => STATUS_LABELS[s]).join(', ')
    return `Invalid status transition from ${STATUS_LABELS[currentStatus]} to ${STATUS_LABELS[newStatus]}. Allowed: ${allowedLabels}`
  }

  return null // Valid transition
}

/**
 * Get role-specific allowed actions based on current status
 */
export function getAllowedActions(
  status: ExchangeStatus,
  role: 'owner' | 'requester'
): ('accept' | 'reject' | 'cancel' | 'confirm')[] {
  const actions: ('accept' | 'reject' | 'cancel' | 'confirm')[] = []

  switch (status) {
    case 'pending':
      if (role === 'owner') {
        actions.push('accept', 'reject')
      }
      if (role === 'requester') {
        actions.push('cancel')
      }
      break
    case 'accepted':
    case 'in_progress':
      actions.push('cancel', 'confirm')
      break
  }

  return actions
}
