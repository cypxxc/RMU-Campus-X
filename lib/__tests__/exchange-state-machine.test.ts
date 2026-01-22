/**
 * Tests for Exchange State Machine
 */

import { describe, it, expect } from 'vitest'
import {
  isValidTransition,
  isTerminalStatus,
  getNextStatuses,
  validateTransition,
  getAllowedActions,
  VALID_TRANSITIONS,
  STATUS_LABELS,
} from '../exchange-state-machine'
import type { ExchangeStatus } from '@/types'

describe('Exchange State Machine', () => {
  describe('isValidTransition', () => {
    it('should allow pending -> accepted', () => {
      expect(isValidTransition('pending', 'accepted')).toBe(true)
    })

    it('should allow pending -> rejected', () => {
      expect(isValidTransition('pending', 'rejected')).toBe(true)
    })

    it('should allow pending -> cancelled', () => {
      expect(isValidTransition('pending', 'cancelled')).toBe(true)
    })

    it('should allow accepted -> in_progress', () => {
      expect(isValidTransition('accepted', 'in_progress')).toBe(true)
    })

    it('should allow in_progress -> completed', () => {
      expect(isValidTransition('in_progress', 'completed')).toBe(true)
    })

    it('should NOT allow completed -> any status', () => {
      expect(isValidTransition('completed', 'pending')).toBe(false)
      expect(isValidTransition('completed', 'cancelled')).toBe(false)
    })

    it('should NOT allow cancelled -> any status', () => {
      expect(isValidTransition('cancelled', 'pending')).toBe(false)
      expect(isValidTransition('cancelled', 'accepted')).toBe(false)
    })

    it('should NOT allow rejected -> any status', () => {
      expect(isValidTransition('rejected', 'pending')).toBe(false)
    })

    it('should NOT allow skipping states (pending -> completed)', () => {
      expect(isValidTransition('pending', 'completed')).toBe(false)
    })
  })

  describe('isTerminalStatus', () => {
    it('should return true for completed', () => {
      expect(isTerminalStatus('completed')).toBe(true)
    })

    it('should return true for cancelled', () => {
      expect(isTerminalStatus('cancelled')).toBe(true)
    })

    it('should return true for rejected', () => {
      expect(isTerminalStatus('rejected')).toBe(true)
    })

    it('should return false for pending', () => {
      expect(isTerminalStatus('pending')).toBe(false)
    })

    it('should return false for accepted', () => {
      expect(isTerminalStatus('accepted')).toBe(false)
    })

    it('should return false for in_progress', () => {
      expect(isTerminalStatus('in_progress')).toBe(false)
    })
  })

  describe('getNextStatuses', () => {
    it('should return valid next statuses for pending', () => {
      const next = getNextStatuses('pending')
      expect(next).toContain('accepted')
      expect(next).toContain('rejected')
      expect(next).toContain('cancelled')
      expect(next).toHaveLength(3)
    })

    it('should return empty array for terminal states', () => {
      expect(getNextStatuses('completed')).toEqual([])
      expect(getNextStatuses('cancelled')).toEqual([])
      expect(getNextStatuses('rejected')).toEqual([])
    })
  })

  describe('validateTransition', () => {
    it('should return null for valid transition', () => {
      expect(validateTransition('pending', 'accepted')).toBeNull()
    })

    it('should return null for same status (no-op)', () => {
      expect(validateTransition('pending', 'pending')).toBeNull()
    })

    it('should return error message for invalid transition', () => {
      const result = validateTransition('pending', 'completed')
      expect(result).toBeTruthy()
      expect(result).toContain('Invalid status transition')
    })

    it('should return error message for terminal state', () => {
      const result = validateTransition('completed', 'cancelled')
      expect(result).toBeTruthy()
      expect(result).toContain('Cannot change status')
    })
  })

  describe('getAllowedActions', () => {
    it('should allow owner to accept/reject pending exchange', () => {
      const actions = getAllowedActions('pending', 'owner')
      expect(actions).toContain('accept')
      expect(actions).toContain('reject')
      expect(actions).not.toContain('cancel')
    })

    it('should allow requester to cancel pending exchange', () => {
      const actions = getAllowedActions('pending', 'requester')
      expect(actions).toContain('cancel')
      expect(actions).not.toContain('accept')
    })

    it('should allow both parties to cancel/confirm accepted exchange', () => {
      const ownerActions = getAllowedActions('accepted', 'owner')
      const requesterActions = getAllowedActions('accepted', 'requester')
      
      expect(ownerActions).toContain('cancel')
      expect(ownerActions).toContain('confirm')
      expect(requesterActions).toContain('cancel')
      expect(requesterActions).toContain('confirm')
    })
  })

  describe('constants', () => {
    it('should have labels for all statuses', () => {
      const statuses: ExchangeStatus[] = [
        'pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'
      ]
      
      for (const status of statuses) {
        expect(STATUS_LABELS[status]).toBeTruthy()
      }
    })

    it('should have transitions for all statuses', () => {
      const statuses: ExchangeStatus[] = [
        'pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'
      ]
      
      for (const status of statuses) {
        expect(VALID_TRANSITIONS[status]).toBeDefined()
        expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true)
      }
    })
  })
})
