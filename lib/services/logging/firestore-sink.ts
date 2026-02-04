import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { sanitizeLogData } from "@/lib/services/logging/sanitize"
import type { LogSink } from "@/lib/services/logging/types"

/**
 * Firestore log sink – ใช้ Admin SDK เท่านั้น (สำหรับ server / API routes)
 * อย่าใช้ getFirebaseDb() ที่นี่ เพราะ sink นี้ถูกเรียกเมื่อ typeof window === "undefined"
 */
export interface FirestoreSinkOptions {
  collectionName?: string
}

export function createFirestoreSink(options: FirestoreSinkOptions = {}): LogSink {
  const collectionName = options.collectionName || "systemLogs"

  return {
    async write(event) {
      const db = getAdminDb()
      await db.collection(collectionName).add({
        category: event.category,
        eventName: event.eventName,
        severity: event.severity,
        data: sanitizeLogData(event.data),
        timestamp: FieldValue.serverTimestamp(),
        environment: process.env.NODE_ENV || "unknown",
      })
    },
  }
}
