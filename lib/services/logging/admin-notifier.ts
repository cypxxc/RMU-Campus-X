import type { AdminNotifier } from "@/lib/services/logging/types"

export function createAdminNotifier(): AdminNotifier {
  return {
    async notify(event) {
      try {
        const { getAuth } = await import("firebase/auth")
        const auth = getAuth()
        const token = await auth.currentUser?.getIdToken()
        if (!token) return

        const data = event.data || {}
        const message = `dYs" CRITICAL ERROR dYs"\nCategory: ${event.category}\nEvent: ${event.eventName}\nMessage: ${String((data as Record<string, unknown>).message || "No details")}`

        fetch("/api/line/notify-admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message,
            type: "custom",
          }),
        }).catch((err) => console.error("Failed to send admin notification:", err))
      } catch {
        // Ignore notification errors
      }
    },
  }
}
