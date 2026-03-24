/**
 * Rate Limiting Utility
 * Simple client-side cooldown system to prevent spam
 */

const COOLDOWNS: Record<string, number> = {
  createItem: 60 * 1000, // 1 minute
  createSupportTicket: 5 * 60 * 1000, // 5 minutes
  createExchange: 30 * 1000, // 30 seconds
  createReport: 2 * 60 * 1000, // 2 minutes
}

class CooldownRateLimitService {
  private readonly lastActionTime: Record<string, number> = {}

  getRemainingCooldown(action: string, userId: string): number {
    const key = `${action}_${userId}`
    const cooldown = COOLDOWNS[action] || 0
    const lastTime = this.lastActionTime[key] || 0
    const elapsed = Date.now() - lastTime
    const remaining = cooldown - elapsed

    return remaining > 0 ? remaining : 0
  }

  isOnCooldown(action: string, userId: string): boolean {
    return this.getRemainingCooldown(action, userId) > 0
  }

  recordAction(action: string, userId: string): void {
    const key = `${action}_${userId}`
    this.lastActionTime[key] = Date.now()

    // Also save to localStorage for persistence across page reloads
    try {
      localStorage.setItem(`cooldown_${key}`, Date.now().toString())
    } catch {
      // localStorage not available
    }
  }

  loadCooldownFromStorage(action: string, userId: string): void {
    const key = `${action}_${userId}`
    try {
      const stored = localStorage.getItem(`cooldown_${key}`)
      if (stored) {
        this.lastActionTime[key] = parseInt(stored, 10)
      }
    } catch {
      // localStorage not available
    }
  }

  formatCooldownTime(ms: number): string {
    const seconds = Math.ceil(ms / 1000)
    if (seconds < 60) {
      return `${seconds} วินาที`
    }
    const minutes = Math.ceil(seconds / 60)
    return `${minutes} นาที`
  }
}

const cooldownRateLimitService = new CooldownRateLimitService()

export const getRemainingCooldown = (action: string, userId: string): number =>
  cooldownRateLimitService.getRemainingCooldown(action, userId)

export const isOnCooldown = (action: string, userId: string): boolean =>
  cooldownRateLimitService.isOnCooldown(action, userId)

export const recordAction = (action: string, userId: string): void =>
  cooldownRateLimitService.recordAction(action, userId)

export const loadCooldownFromStorage = (action: string, userId: string): void =>
  cooldownRateLimitService.loadCooldownFromStorage(action, userId)

export const formatCooldownTime = (ms: number): string =>
  cooldownRateLimitService.formatCooldownTime(ms)
