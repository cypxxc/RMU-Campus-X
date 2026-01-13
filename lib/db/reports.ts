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
  limit
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { Report, ReportStatus, ReportType } from "@/types"
import { apiCall, TIMEOUT_CONFIG, type ApiResponse } from "@/lib/api-wrapper"
import { createNotification } from "./notifications"
import { createAdminLog } from "./logs"

// Reports
export const createReport = async (reportData: Omit<Report, "id" | "createdAt" | "updatedAt" | "status">) => {
  const db = getFirebaseDb()
  
  console.log("[createReport] Starting report creation...")
  console.log("[createReport] Report data:", {
    reportType: reportData.reportType,
    reporterId: reportData.reporterId,
    reporterEmail: reportData.reporterEmail,
    targetId: reportData.targetId,
    reason: reportData.reason,
  })

  const dataToSave = {
    ...reportData,
    status: "new" as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  console.log("[createReport] Data to save:", dataToSave)

  try {
    const docRef = await addDoc(collection(db, "reports"), dataToSave)
    console.log("[createReport] Report created successfully:", docRef.id)
    return docRef.id
  } catch (error: any) {
    console.error("[createReport] Error creating report:", error)
    console.error("[createReport] Error code:", error.code)
    console.error("[createReport] Error message:", error.message)
    console.error("[createReport] Full error:", JSON.stringify(error, null, 2))
    throw error
  }
}

export const updateReportStatus = async (
  reportId: string,
  status: ReportStatus,
  adminId: string,
  adminEmail: string,
  note?: string,
) => {
  const db = getFirebaseDb()
  const updates: any = {
    status,
    handledBy: adminId,
    handledByEmail: adminEmail,
    updatedAt: serverTimestamp(),
  }

  if (note) {
    updates.adminNote = note
  }

  if (status === "resolved" || status === "closed") {
    updates.resolvedAt = serverTimestamp()
  }

  await updateDoc(doc(db, "reports", reportId), updates)

  // Notify the reporter
  const reportDoc = await getDoc(doc(db, "reports", reportId))
  const reportData = reportDoc.data() as Report
  
  await createNotification({
    userId: reportData.reporterId,
    title: "อัปเดตสถานะการแจ้งรายงาน",
    message: `รายงานสำหรับ "${reportData.reportType}" ของคุณถูกเปลี่ยนสถานะเป็น: ${status === 'resolved' ? 'ดำเนินการแล้ว' : status === 'action_taken' ? 'ลงโทษผู้กระทำผิดแล้ว' : status === 'closed' ? 'ปิดเคส' : 'กำลังตรวจสอบ'}`,
    type: "report",
    relatedId: reportId
  })

  // Log admin action (adminId/adminEmail extracted from token server-side)
  await createAdminLog({
    actionType: status === 'resolved' ? 'report_resolve' : 'report_status_change',
    targetType: 'report',
    targetId: reportId,
    targetInfo: reportData.targetTitle || reportData.reportType,
    description: `เปลี่ยนสถานะรายงานเป็น: ${status}${note ? ` - ${note}` : ''}`,
    status: 'success',
    reason: note,
    metadata: { status, note: note || null, reportType: reportData.reportType }
  })
}

export const getReportsByStatus = async (status?: ReportStatus) => {
  const db = getFirebaseDb()
  let q

  if (status) {
    q = query(collection(db, "reports"), where("status", "==", status), orderBy("createdAt", "desc"))
  } else {
    q = query(collection(db, "reports"), orderBy("createdAt", "desc"))
  }

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Report)
}


export const getReportStatistics = async (): Promise<ApiResponse<{
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
    chat_report: number
    user_report: number
  }
}>> => {
  return apiCall(
    async () => {
      const startTime = performance.now()
      const db = getFirebaseDb()
      
      // Initialize stats
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
          chat_report: 0,
          user_report: 0,
        },
      }

      // Use aggregation queries for better performance
      // Count by status
      const statusQueries = [
        { status: 'new' as ReportStatus, field: 'new' as const },
        { status: 'under_review' as ReportStatus, field: 'under_review' as const },
        { status: 'waiting_user' as ReportStatus, field: 'waiting_user' as const },
        { status: 'action_taken' as ReportStatus, field: 'action_taken' as const },
        { status: 'resolved' as ReportStatus, field: 'resolved' as const },
        { status: 'closed' as ReportStatus, field: 'closed' as const },
        { status: 'rejected' as ReportStatus, field: 'rejected' as const },
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

      // Count by type
      const typeQueries = [
        { type: 'item_report' as ReportType, field: 'item_report' as const },
        { type: 'exchange_report' as ReportType, field: 'exchange_report' as const },
        { type: 'chat_report' as ReportType, field: 'chat_report' as const },
        { type: 'user_report' as ReportType, field: 'user_report' as const },
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

      // Log performance
      const duration = performance.now() - startTime
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Query] getReportStatistics: ${duration.toFixed(2)}ms`)
      }

      return stats
    },
    'getReportStatistics',
    TIMEOUT_CONFIG.HEAVY
  )
}

export const getReports = async (maxResults: number = 200) => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "reports"), 
    orderBy("createdAt", "desc"),
    limit(maxResults)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Report)
}
