import { createAdminNotifier } from "@/lib/services/logging/admin-notifier"
import { createConsoleSink } from "@/lib/services/logging/console-sink"
import { createFirestoreSink } from "@/lib/services/logging/firestore-sink"
import { createSystemLogger } from "@/lib/services/logging/system-logger"
import type { Logger, LogCategory, LogSeverity } from "@/lib/services/logging/types"
export type { LogSeverity, LogCategory } from "@/lib/services/logging/types"

const DEFAULT_COLLECTION = "systemLogs"

let logger: Logger = createSystemLogger({
  consoleSink: createConsoleSink(),
  firestoreSink: createFirestoreSink({ collectionName: DEFAULT_COLLECTION }),
  adminNotifier: createAdminNotifier(),
})

export function setSystemLogger(next: Logger): void {
  logger = next
}

export class SystemLogger {
  static async logEvent(
    category: LogCategory,
    eventName: string,
    data: unknown = {},
    severity: LogSeverity = "INFO"
  ): Promise<void> {
    await logger.logEvent(category, eventName, data, severity)
  }

  static async logError(
    error: unknown,
    context: string,
    severity: LogSeverity = "ERROR"
  ): Promise<void> {
    await logger.logError(error, context, severity)
  }
}
