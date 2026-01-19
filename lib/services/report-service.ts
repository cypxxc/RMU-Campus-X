import type { ReportType } from "@/types"


interface SubmitReportParams {
  reportType: ReportType
  targetId: string
  targetTitle?: string
  reasonCode: string
  reasonLabel: string
  description: string
  reporterId: string
  reporterEmail: string
  images: string[]
}

export const submitReport = async (
  params: SubmitReportParams
): Promise<void> => {
  const { reportType, targetId, targetTitle, reasonCode, reasonLabel, description, images } = params

  // Route all report creation through the server API:
  // - prevents spoofing
  // - lets server (Admin SDK) create admin notifications / LINE notifications
  const { getAuth } = await import("firebase/auth")
  const auth = getAuth()
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error("Authentication required")

  const response = await fetch("/api/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      reportType,
      reasonCode,
      reason: reasonLabel || "",
      description: description.trim() || "",
      // Keep these for context in admin UI/LINE message
      targetId,
      targetTitle: targetTitle || "",
      evidenceUrls: images,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to submit report")
  }
}
