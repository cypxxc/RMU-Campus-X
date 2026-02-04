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

const lastActionTime: Record<string, number> = {}

export const getRemainingCooldown = (action: string, userId: string): number => {
  const key = `${action}_${userId}`
  const cooldown = COOLDOWNS[action] || 0
  const lastTime = lastActionTime[key] || 0
  const elapsed = Date.now() - lastTime
  const remaining = cooldown - elapsed
  
  return remaining > 0 ? remaining : 0
}

export const isOnCooldown = (action: string, userId: string): boolean => {
  return getRemainingCooldown(action, userId) > 0
}

export const recordAction = (action: string, userId: string): void => {
  const key = `${action}_${userId}`
  lastActionTime[key] = Date.now()
  
  // Also save to localStorage for persistence across page reloads
  try {
    localStorage.setItem(`cooldown_${key}`, Date.now().toString())
  } catch {
    // localStorage not available
  }
}

export const loadCooldownFromStorage = (action: string, userId: string): void => {
  const key = `${action}_${userId}`
  try {
    const stored = localStorage.getItem(`cooldown_${key}`)
    if (stored) {
      lastActionTime[key] = parseInt(stored, 10)
    }
  } catch {
    // localStorage not available
  }
}

export const formatCooldownTime = (ms: number): string => {
  const seconds = Math.ceil(ms / 1000)
  if (seconds < 60) {
    return `${seconds} วินาที`
  }
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} นาที`
}
