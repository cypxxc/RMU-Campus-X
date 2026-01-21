import type { LogSink } from "@/lib/services/logging/types"

export function createConsoleSink(): LogSink {
  return {
    async write(event) {
      const message = `[${event.severity}] [${event.category}] ${event.eventName}`
      if (event.severity === "ERROR" || event.severity === "CRITICAL") {
        console.error(message, event.data)
      } else {
        console.log(message, event.data)
      }
    },
  }
}
