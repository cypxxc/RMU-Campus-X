export function sanitizeLogData(data: unknown): Record<string, unknown> {
  if (!data) return {}
  if (typeof data !== "object" || Array.isArray(data)) {
    return { value: data }
  }

  const sanitized = { ...(data as Record<string, unknown>) }

  const sensitiveFields = ["password", "token", "secret", "creditCard"]
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]"
    }
  }

  return sanitized
}
