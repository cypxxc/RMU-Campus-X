import { getFirebaseDb } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

/**
 * Log levels for system events
 */
export type LogSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

/**
 * Categories for system logs
 */
export type LogCategory = 
  | 'AUTH'
  | 'DATABASE'
  | 'API'
  | 'BUSINESS'
  | 'SYSTEM'
  | 'SECURITY'

export class SystemLogger {
  private static readonly COLLECTION_NAME = 'systemLogs'

  /**
   * Log a system event to Firestore
   * @param category - Category of the event
   * @param eventName - Specific name of the event
   * @param data - Additional data to log
   * @param severity - Severity level (default: INFO)
   */
  static async logEvent(
    category: LogCategory, 
    eventName: string, 
    data: any = {}, 
    severity: LogSeverity = 'INFO'
  ): Promise<void> {
    // 1. Console Log (Always)
    const logMessage = `[${severity}] [${category}] ${eventName}`
    if (severity === 'ERROR' || severity === 'CRITICAL') {
      console.error(logMessage, data)
    } else {
      console.log(logMessage, data)
    }

    // 2. Persist to Firestore (Production only or Critical/Error in Dev)
    const shouldPersist = process.env.NODE_ENV === 'production' || 
                          severity === 'ERROR' || 
                          severity === 'CRITICAL'

    if (shouldPersist) {
      try {
        const db = getFirebaseDb()
        await addDoc(collection(db, this.COLLECTION_NAME), {
          category,
          eventName,
          severity,
          data: this.sanitizeData(data),
          timestamp: serverTimestamp(),
          environment: process.env.NODE_ENV || 'unknown'
        })
      } catch (err) {
        // Fallback if logging fails (prevent infinite loop)
        console.error('Failed to write system log:', err)
      }
    }

    // 3. Notify Admin (Critical only)
    if (severity === 'CRITICAL') {
      await this.notifyAdmin(category, eventName, data)
    }
  }

  /**
   * Log an error specifically
   */
  static async logError(
    error: unknown,
    context: string,
    severity: LogSeverity = 'ERROR'
  ): Promise<void> {
    const errorData = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context
    }

    await this.logEvent('SYSTEM', 'ERROR_OCCURRED', errorData, severity)
  }

  /**
   * Send notification to Admin via LINE
   */
  private static async notifyAdmin(category: string, eventName: string, data: any) {
    try {
      // Best-effort: only if we can get an auth token (custom broadcasts require admin)
      const { getAuth } = await import("firebase/auth")
      const auth = getAuth()
      const token = await auth.currentUser?.getIdToken()
      if (!token) return

      fetch("/api/line/notify-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: `🚨 CRITICAL ERROR 🚨\nCategory: ${category}\nEvent: ${eventName}\nMessage: ${data.message || "No details"}`,
          type: "custom",
        }),
      }).catch((err) => console.error("Failed to send admin notification:", err))
    } catch (e) {
      // Ignore notification errors
    }
  }

  /**
   * Sanitize data before logging (remove sensitive fields if any)
   */
  private static sanitizeData(data: any): any {
    if (!data) return {}
    // constant-time clone to avoid mutating original
    const sanitized = { ...data }
    
    // Obfuscate potential sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard']
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    }
    return sanitized
  }
}
