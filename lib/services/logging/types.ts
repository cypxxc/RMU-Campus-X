export type LogSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL"

export type LogCategory =
  | "AUTH"
  | "DATABASE"
  | "API"
  | "BUSINESS"
  | "SYSTEM"
  | "SECURITY"

export interface LogEvent {
  category: LogCategory
  eventName: string
  data: unknown
  severity: LogSeverity
}

export interface LogSink {
  write: (event: LogEvent) => Promise<void>
}

export interface AdminNotifier {
  notify: (event: LogEvent) => Promise<void>
}

export interface Logger {
  logEvent: (
    category: LogCategory,
    eventName: string,
    data?: unknown,
    severity?: LogSeverity
  ) => Promise<void>
  logError: (error: unknown, context: string, severity?: LogSeverity) => Promise<void>
}
