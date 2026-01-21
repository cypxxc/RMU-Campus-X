import type { AdminNotifier, LogCategory, LogSeverity, LogSink, Logger } from "@/lib/services/logging/types"

export interface SystemLoggerDeps {
  consoleSink: LogSink
  firestoreSink?: LogSink
  adminNotifier?: AdminNotifier
  shouldPersist?: (severity: LogSeverity) => boolean
}

export function createSystemLogger(deps: SystemLoggerDeps): Logger {
  const shouldPersist =
    deps.shouldPersist ||
    ((severity: LogSeverity) =>
      process.env.NODE_ENV === "production" ||
      severity === "ERROR" ||
      severity === "CRITICAL")

  const logEvent = async (
    category: LogCategory,
    eventName: string,
    data: Record<string, unknown> | unknown = {},
    severity: LogSeverity = "INFO"
  ): Promise<void> => {
    const event = {
      category,
      eventName,
      data,
      severity,
    }

    await deps.consoleSink.write(event)

    if (deps.firestoreSink && shouldPersist(severity)) {
      await deps.firestoreSink.write(event)
    }

    if (deps.adminNotifier && severity === "CRITICAL") {
      await deps.adminNotifier.notify(event)
    }
  }

  const logError = async (
    error: unknown,
    context: string,
    severity: LogSeverity = "ERROR"
  ): Promise<void> => {
    const errorData = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
    }

    await logEvent("SYSTEM", "ERROR_OCCURRED", errorData, severity)
  }

  return {
    logEvent,
    logError,
  }
}
