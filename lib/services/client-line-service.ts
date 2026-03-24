import { getAuth } from "firebase/auth"

const BASE_URL = typeof window !== 'undefined' 
  ? window.location.origin 
  : process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://rmu-app-3-1-2569-wwn2.vercel.app'

export class ClientLineService {
  /**
   * Send a notification request to the LINE Notification API
   */
  private async sendLineNotification(endpoint: string, payload: unknown): Promise<void> {
    try {
      const auth = getAuth()
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null

      if (!token) {
          console.warn('[LINE Client] No auth token available, skipping notification')
          return
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
          console.error(`[LINE Client] Notification failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('[LINE Client] Notification error:', error)
    }
  }

  /**
   * Notify user about their account status change
   */
  async notifyUserStatusChange(
    userId: string, 
    status: string, 
    reason?: string, 
    suspendedUntil?: string
  ): Promise<void> {
    await this.sendLineNotification('/api/line/notify-user-action', {
      userId,
      action: 'status_change',
      status,
      reason,
      suspendedUntil
    })
  }

  /**
   * Notify user about a warning
   */
  async notifyUserWarning(
    userId: string, 
    reason: string, 
    warningCount: number
  ): Promise<void> {
    await this.sendLineNotification('/api/line/notify-user-action', {
      userId,
      action: 'warning',
      reason,
      warningCount
    })
  }
}

const clientLineService = new ClientLineService()

export async function notifyUserStatusChange(
  userId: string, 
  status: string, 
  reason?: string, 
  suspendedUntil?: string
): Promise<void> {
  await clientLineService.notifyUserStatusChange(userId, status, reason, suspendedUntil)
}

export async function notifyUserWarning(
  userId: string, 
  reason: string, 
  warningCount: number
): Promise<void> {
  await clientLineService.notifyUserWarning(userId, reason, warningCount)
}
