import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { Report, ReportStatus, ReportType } from "@/types"
import { apiCall, TIMEOUT_CONFIG, type ApiResponse } from "@/lib/api-wrapper"
import { createNotification } from "./notifications"
import { createAdminLog } from "./logs"

// Reports - บน client ใช้ POST /api/reports
export const createReport = async (
  reportData: Omit<Report, "id" | "createdAt" | "updatedAt" | "status">
) => {
  if (typeof window !== "undefined") {
    const { authFetchJson } = await import("@/lib/api-client")
    const res = await authFetchJson<{ reportId?: string }>("/api/reports", {
      method: "POST",
      body: {
        reportType: reportData.reportType,
        reason: reportData.reason,
        description: reportData.reason || "ไม่มีรายละเอียด",
        targetId: reportData.targetId,
        targetType: reportData.targetType,
        targetTitle: (reportData as any).targetTitle,
        itemId: (reportData as any).itemId,
        itemTitle: (reportData as any).itemTitle,
        exchangeId: (reportData as any).exchangeId,
      },
    })
    const id = res?.data?.reportId
    if (!id && res?.error) throw new Error(res.error)
    return id ?? ""
  }
  const db = getFirebaseDb()
  const dataToSave = {
    ...reportData,
    status: "new" as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const docRef = await addDoc(collection(db, "reports"), dataToSave)
  return docRef.id
}

export const updateReportStatus = async (
  reportId: string,
  status: ReportStatus,
  adminId: string,
  adminEmail: string,
  note?: string
) => {
  const normalizedNote = typeof note === "string" ? note.trim() : ""
  if (status === "rejected" && normalizedNote.length === 0) {
    throw new Error("กรุณาระบุเหตุผลการปฏิเสธ")
  }

  const db = getFirebaseDb()
  const updates: any = {
    status,
    handledBy: adminId,
    handledByEmail: adminEmail,
    updatedAt: serverTimestamp(),
  }

  if (normalizedNote) {
    updates.adminNote = normalizedNote
  }

  if (status === "resolved" || status === "closed") {
    updates.resolvedAt = serverTimestamp()
  }

  await updateDoc(doc(db, "reports", reportId), updates)

  const reportDoc = await getDoc(doc(db, "reports", reportId))
  const reportData = reportDoc.data() as Report
  const statusText =
    status === "resolved"
      ? "ดำเนินการแล้ว"
      : status === "action_taken"
        ? "ลงโทษผู้กระทำผิดแล้ว"
        : status === "closed"
          ? "ปิดเคส"
          : status === "rejected"
            ? "ปฏิเสธ"
            : "กำลังตรวจสอบ"

  const message =
    status === "rejected"
      ? `รายงานที่คุณแจ้งถูกปฏิเสธ เหตุผล: ${normalizedNote}`
      : `รายงานที่คุณแจ้งได้รับการอัปเดต สถานะล่าสุด: ${statusText}${normalizedNote ? ` (${normalizedNote})` : ""}`

  await createNotification({
    userId: reportData.reporterId,
    title: "อัปเดตสถานะรายงาน",
    message,
    type: "report",
    relatedId: reportId,
  })

  await createAdminLog({
    actionType: status === "resolved" ? "report_resolve" : "report_status_change",
    targetType: "report",
    targetId: reportId,
    targetInfo: reportData.targetTitle || reportData.reportType,
    description: `เปลี่ยนสถานะรายงานเป็น: ${status}${normalizedNote ? ` - ${normalizedNote}` : ""}`,
    status: "success",
    reason: normalizedNote,
    metadata: { status, note: normalizedNote || null, reportType: reportData.reportType },
  })
}

export const getReportsByStatus = async (status?: ReportStatus) => {
  if (typeof window !== "undefined") {
    try {
      const { authFetchJson } = await import("@/lib/api-client")
      const params = new URLSearchParams()
      if (status) params.set("status", status)
      const res = await authFetchJson<{ reports?: Report[] }>(
        `/api/admin/reports?${params.toString()}`,
        { method: "GET" }
      )
      return res?.data?.reports ?? []
    } catch {
      return []
    }
  }
  const db = getFirebaseDb()
  const q = status
    ? query(collection(db, "reports"), where("status", "==", status), orderBy("createdAt", "desc"))
    : query(collection(db, "reports"), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((reportDoc) => ({ id: reportDoc.id, ...reportDoc.data() }) as Report)
}

export const getReportStatistics = async (): Promise<
  ApiResponse<{
    total: number
    new: number
    under_review: number
    waiting_user: number
    action_taken: number
    resolved: number
    closed: number
    rejected: number
    byType: {
      item_report: number
      exchange_report: number
      user_report: number
    }
  }>
> => {
  return apiCall(
    async () => {
      const startTime = performance.now()
      const db = getFirebaseDb()

      const stats = {
        total: 0,
        new: 0,
        under_review: 0,
        waiting_user: 0,
        action_taken: 0,
        resolved: 0,
        closed: 0,
        rejected: 0,
        byType: {
          item_report: 0,
          exchange_report: 0,
          user_report: 0,
        },
      }

      const statusQueries = [
        { status: "new" as ReportStatus, field: "new" as const },
        { status: "under_review" as ReportStatus, field: "under_review" as const },
        { status: "waiting_user" as ReportStatus, field: "waiting_user" as const },
        { status: "action_taken" as ReportStatus, field: "action_taken" as const },
        { status: "resolved" as ReportStatus, field: "resolved" as const },
        { status: "closed" as ReportStatus, field: "closed" as const },
        { status: "rejected" as ReportStatus, field: "rejected" as const },
      ]

      const statusCounts = await Promise.all(
        statusQueries.map(async ({ status, field }) => {
          const q = query(collection(db, "reports"), where("status", "==", status))
          const snapshot = await getDocs(q)
          return { field, count: snapshot.size }
        })
      )

      statusCounts.forEach(({ field, count }) => {
        stats[field] = count
        stats.total += count
      })

      const typeQueries = [
        { type: "item_report" as ReportType, field: "item_report" as const },
        { type: "exchange_report" as ReportType, field: "exchange_report" as const },
        { type: "user_report" as ReportType, field: "user_report" as const },
      ]

      const typeCounts = await Promise.all(
        typeQueries.map(async ({ type, field }) => {
          const q = query(collection(db, "reports"), where("reportType", "==", type))
          const snapshot = await getDocs(q)
          return { field, count: snapshot.size }
        })
      )

      typeCounts.forEach(({ field, count }) => {
        stats.byType[field] = count
      })

      const duration = performance.now() - startTime
      if (process.env.NODE_ENV === "development") {
        console.log(`[Query] getReportStatistics: ${duration.toFixed(2)}ms`)
      }

      return stats
    },
    "getReportStatistics",
    TIMEOUT_CONFIG.HEAVY
  )
}

export const getReports = async (maxResults: number = 200) => {
  if (typeof window !== "undefined") {
    try {
      const { authFetchJson } = await import("@/lib/api-client")
      const res = await authFetchJson<{ reports?: Report[] }>(
        `/api/admin/reports?limit=${maxResults}`,
        { method: "GET" }
      )
      return res?.data?.reports ?? []
    } catch {
      return []
    }
  }
  const db = getFirebaseDb()
  const q = query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(maxResults))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((reportDoc) => ({ id: reportDoc.id, ...reportDoc.data() }) as Report)
}
