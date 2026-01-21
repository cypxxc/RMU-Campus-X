import { getFirebaseDb } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { sanitizeLogData } from "@/lib/services/logging/sanitize"
import type { LogSink } from "@/lib/services/logging/types"

export interface FirestoreSinkOptions {
  collectionName?: string
}

export function createFirestoreSink(options: FirestoreSinkOptions = {}): LogSink {
  const collectionName = options.collectionName || "systemLogs"

  return {
    async write(event) {
      const db = getFirebaseDb()
      await addDoc(collection(db, collectionName), {
        category: event.category,
        eventName: event.eventName,
        severity: event.severity,
        data: sanitizeLogData(event.data),
        timestamp: serverTimestamp(),
        environment: process.env.NODE_ENV || "unknown",
      })
    },
  }
}
