import { createReport } from "@/lib/firestore"
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
  const {
    reportType,
    targetId,
    targetTitle,
    reasonCode,
    reasonLabel,
    description,
    reporterId,
    reporterEmail,
    images
  } = params

  // Fetch reported user info based on report type
  let reportedUserId = ""
  let reportedUserEmail = ""
  
  // Dynamic imports to avoid circular dependencies if any, 
  // though here we just need firebase functions
  const { getFirebaseDb } = await import("@/lib/firebase")
  const { doc, getDoc } = await import("firebase/firestore")
  const db = getFirebaseDb()

  if (reportType === "item_report") {
    // For item reports, get the item owner
    const itemDoc = await getDoc(doc(db, "items", targetId))
    if (itemDoc.exists()) {
      reportedUserId = itemDoc.data().postedBy
      reportedUserEmail = itemDoc.data().postedByEmail
    }
  } else if (reportType === "exchange_report") {
    // For exchange reports, get the other party
    const exchangeDoc = await getDoc(doc(db, "exchanges", targetId))
    if (exchangeDoc.exists()) {
      const exchangeData = exchangeDoc.data()
      // Report the other party (if reporter is owner, report requester and vice versa)
      if (exchangeData.ownerId === reporterId) {
        reportedUserId = exchangeData.requesterId
        reportedUserEmail = exchangeData.requesterEmail
      } else {
        reportedUserId = exchangeData.ownerId
        reportedUserEmail = exchangeData.ownerEmail
      }
    }
  } else if (reportType === "chat_report") {
    // For chat reports, targetId is the exchangeId - get the other party from exchange
    const exchangeDoc = await getDoc(doc(db, "exchanges", targetId))
    if (exchangeDoc.exists()) {
      const exchangeData = exchangeDoc.data()
      // Report the other party in the chat
      if (exchangeData.ownerId === reporterId) {
        reportedUserId = exchangeData.requesterId
        reportedUserEmail = exchangeData.requesterEmail
      } else {
        reportedUserId = exchangeData.ownerId
        reportedUserEmail = exchangeData.ownerEmail
      }
    }
  } else if (reportType === "user_report") {
    // For user reports, targetId is already the userId
    const userDoc = await getDoc(doc(db, "users", targetId))
    if (userDoc.exists()) {
      reportedUserId = targetId
      reportedUserEmail = userDoc.data().email
    }
  }

  // Determine targetType from reportType
  const targetTypeMap: Record<string, string> = {
    item_report: "item",
    exchange_report: "exchange",
    chat_report: "chat",
    user_report: "user",
  }
  const targetType = targetTypeMap[reportType] || "unknown"

  // Build better targetTitle
  let finalTargetTitle = targetTitle || ""
  if (!finalTargetTitle && reportedUserEmail) {
    finalTargetTitle = reportedUserEmail
  }
  if (!finalTargetTitle) {
    finalTargetTitle = reasonLabel || "ไม่ระบุ"
  }

  const reportData = {
    reportType,
    targetType,
    reasonCode,
    reason: reasonLabel || "",
    description: description.trim() || "ไม่มีรายละเอียดเพิ่มเติม",
    reporterId,
    reporterEmail: reporterEmail || "",
    reportedUserId,
    reportedUserEmail,
    targetId,
    targetTitle: finalTargetTitle,
    evidenceUrls: images,
  }

  await createReport(reportData)

  // Send LINE notification to reported user (async, don't block)
  if (reportedUserId) {
    try {
      fetch('/api/line/notify-user-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: reportedUserId,
          action: 'reported',
          reportType,
          targetTitle: targetTitle || reasonLabel || 'เนื้อหาของคุณ'
        })
      }).catch(err => console.log('[LINE] Notify reported error:', err))
    } catch (lineError) {
      console.log('[LINE] Notify reported error:', lineError)
    }
  }

  // Send LINE notification to all admins (async, don't block)
  try {
    fetch('/api/line/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'new_report',
        reportType,
        targetTitle: targetTitle || reasonLabel || 'ไม่ระบุ',
        reporterEmail: reporterEmail || 'ไม่ระบุ'
      })
    }).catch(err => console.log('[LINE] Notify admin error:', err))
  } catch (lineError) {
    console.log('[LINE] Notify admin error:', lineError)
  }
}
