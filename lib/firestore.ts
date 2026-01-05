import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  QueryConstraint,
  Timestamp,
  startAfter,
  DocumentSnapshot,
  arrayUnion,
  runTransaction,
} from "firebase/firestore"
import { getFirebaseDb } from "./firebase"
import type { 
  Item, 
  Exchange, 
  Report, 
  ReportStatus, 
  ReportType, 
  ItemCategory, 
  ItemStatus, 
  AppNotification,
  UserStatus,
  UserWarning,
  // WarningAction - not used directly
  Draft,
  DraftType,
  User,
  SupportTicket,
  SupportTicketStatus,
  ExchangeStatus,
} from "@/types"
import { apiCall, TIMEOUT_CONFIG, type ApiResponse } from "./api-wrapper"

// Items
export const createItem = async (itemData: Omit<Item, "id" | "postedAt" | "updatedAt">) => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      const docRef = await addDoc(collection(db, "items"), {
        ...itemData,
        postedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return docRef.id
    },
    'createItem',
    TIMEOUT_CONFIG.STANDARD
  )
}

export const getItems = async (filters?: { 
  category?: ItemCategory; 
  status?: ItemStatus;
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
}): Promise<ApiResponse<{ items: Item[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }>> => {
  return apiCall(
    async () => {
      const startTime = performance.now()
      const db = getFirebaseDb()
      const pageSize = filters?.pageSize || 20
      const constraints: QueryConstraint[] = [orderBy("postedAt", "desc"), limit(pageSize)]
      
      if (filters?.category) constraints.push(where("category", "==", filters.category))
      if (filters?.status) constraints.push(where("status", "==", filters.status))
      if (filters?.lastDoc) constraints.push(startAfter(filters.lastDoc))

      const q = query(collection(db, "items"), ...constraints)
      const snapshot = await getDocs(q)
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Item)
      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null
      
      // Log query performance
      const duration = performance.now() - startTime
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Query] getItems: ${duration.toFixed(2)}ms, ${items.length} items`)
      }
      
      return { items, lastDoc: lastVisible, hasMore: snapshot.docs.length === pageSize }
    },
    'getItems',
    TIMEOUT_CONFIG.STANDARD
  )
}

export const getItemById = async (id: string): Promise<ApiResponse<Item | null>> => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      const docRef = doc(db, "items", id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Item
      }
      return null
    },
    'getItemById',
    TIMEOUT_CONFIG.QUICK
  )
}

export const updateItem = async (id: string, data: Partial<Item>): Promise<ApiResponse<void>> => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      const docRef = doc(db, "items", id)
      
      // Check if document exists before updating
      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) {
        throw new Error(`Item with ID ${id} does not exist`)
      }
      
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      })
    },
    'updateItem',
    TIMEOUT_CONFIG.STANDARD
  )
}

export const deleteItem = async (id: string): Promise<ApiResponse<void>> => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      await deleteDoc(doc(db, "items", id))
    },
    'deleteItem',
    TIMEOUT_CONFIG.STANDARD
  )
}

// Exchanges
export const createExchange = async (exchangeData: Omit<Exchange, "id" | "createdAt" | "updatedAt">) => {
  const db = getFirebaseDb()
  const docRef = await addDoc(collection(db, "exchanges"), {
    ...exchangeData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  
  // Notify owner of new request
  await createNotification({
    userId: exchangeData.ownerId,
    title: "มีคำขอใหม่",
    message: `มีผู้ขอแลกเปลี่ยน "${exchangeData.itemTitle}" ของคุณ`,
    type: "exchange",
    relatedId: docRef.id
  })

  return docRef.id
}

export const getExchangesByUser = async (userId: string) => {
  const db = getFirebaseDb()
  const q = query(collection(db, "exchanges"), where("requesterId", "==", userId), orderBy("createdAt", "desc"))

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Exchange)
}

export const getExchangeById = async (id: string): Promise<ApiResponse<Exchange | null>> => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      const docRef = doc(db, "exchanges", id)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        return null
      }
      
      return { id: docSnap.id, ...docSnap.data() } as Exchange
    },
    'getExchangeById',
    TIMEOUT_CONFIG.QUICK
  )
}

export const updateExchange = async (id: string, data: Partial<Exchange>) => {
  const db = getFirebaseDb()
  const docRef = doc(db, "exchanges", id)
  
  // Get current data to check status change
  const currentDoc = await getDoc(docRef)
  const currentData = currentDoc.data() as Exchange
  
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })

// Notify on status change
  if (data.status && data.status !== currentData.status) {
    let title = ""
    let message = ""
    let targetUserId = currentData.requesterId

    if (data.status === 'accepted') {
      title = "รับคำขอแล้ว"
      message = `เจ้าของสิ่งของ "ตกลง" แลกเปลี่ยน "${currentData.itemTitle}" กับคุณแล้ว`
    } else if (data.status === 'rejected') {
      title = "คำขอถูกปฏิเสธ"
      message = `เสียใจด้วย เจ้าของสิ่งของ "ปฏิเสธ" คำขอแลกเปลี่ยน "${currentData.itemTitle}"`
    }

    if (title && message) {
      await createNotification({
        userId: targetUserId,
        title,
        message,
        type: "exchange",
        relatedId: id
      })
    }
  }
}

/**
 * Atomically confirm an exchange and check for completion
 */
export const confirmExchange = async (exchangeId: string, role: 'owner' | 'requester'): Promise<ApiResponse<{ status: ExchangeStatus }>> => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      const exchangeRef = doc(db, "exchanges", exchangeId)

      const result = await runTransaction(db, async (transaction) => {
        // 1. Read exchange
        const exchangeDoc = await transaction.get(exchangeRef)
        if (!exchangeDoc.exists()) throw new Error("Exchange not found")
        
        const exchange = exchangeDoc.data() as Exchange
        
        // 2. Update confirmation status
        const updates: Partial<Exchange> = {
          updatedAt: serverTimestamp() as any
        }
        
        let ownerConfirmed = exchange.ownerConfirmed
        let requesterConfirmed = exchange.requesterConfirmed

        if (role === 'owner') {
          updates.ownerConfirmed = true
          ownerConfirmed = true
        } else {
          updates.requesterConfirmed = true
          requesterConfirmed = true
        }

        // 3. Check if both confirmed
        let newStatus = exchange.status
        if (ownerConfirmed && requesterConfirmed) {
          updates.status = 'completed'
          newStatus = 'completed'
          
          // Update ITEM status to completed
          const itemRef = doc(db, "items", exchange.itemId)
          transaction.update(itemRef, { 
            status: 'completed',
            updatedAt: serverTimestamp()
          })
        }

        transaction.update(exchangeRef, updates)
        return { status: newStatus, exchange }
      })

      // 4. Send notifications (outside transaction to avoid complex logic inside)
      if (result.status === 'completed') {
        // Notify Owner
        await createNotification({
          userId: result.exchange.ownerId,
          title: "การแลกเปลี่ยนเสร็จสิ้น",
          message: `การแลกเปลี่ยน "${result.exchange.itemTitle}" สำเร็จเรียบร้อยแล้ว!`,
          type: "exchange",
          relatedId: exchangeId
        })
        
        // Notify Requester
        await createNotification({
          userId: result.exchange.requesterId,
          title: "การแลกเปลี่ยนเสร็จสิ้น",
          message: `การแลกเปลี่ยน "${result.exchange.itemTitle}" สำเร็จเรียบร้อยแล้ว!`,
          type: "exchange",
          relatedId: exchangeId
        })
      }

      return { status: result.status }
    },
    'confirmExchange',
    TIMEOUT_CONFIG.STANDARD
  )
}

export const cancelExchange = async (
  exchangeId: string,
  itemId: string,
  userId: string,
  reason?: string,
) => {
  const db = getFirebaseDb()

  console.log("[cancelExchange] Starting cancellation:", { exchangeId, itemId, userId, reason })

  try {
    // First, get the exchange data and check other active exchanges
    // These queries must be done OUTSIDE the transaction
    const exchangeDoc = await getDoc(doc(db, "exchanges", exchangeId))
    if (!exchangeDoc.exists()) {
      throw new Error("Exchange not found")
    }
    const exchangeData = exchangeDoc.data() as Exchange

    // Query all active exchanges for this item
    const q = query(
      collection(db, "exchanges"),
      where("itemId", "==", itemId),
      where("status", "in", ["pending", "accepted", "in_progress"]),
    )
    const snapshot = await getDocs(q)

    console.log("[cancelExchange] Found active exchanges:", snapshot.docs.length)
    console.log(
      "[cancelExchange] Exchange IDs:",
      snapshot.docs.map((doc) => ({ id: doc.id, status: doc.data().status })),
    )

    // Count active exchanges excluding the current one
    const otherActiveExchanges = snapshot.docs.filter((doc) => doc.id !== exchangeId)

    console.log("[cancelExchange] Other active exchanges (excluding current):", otherActiveExchanges.length)

    // Use a transaction to ensure atomicity
    await runTransaction(db, async (transaction) => {
      const exchangeRef = doc(db, "exchanges", exchangeId)
      const itemRef = doc(db, "items", itemId)

      // Update exchange status to cancelled
      console.log("[cancelExchange] Updating exchange to cancelled...")
      transaction.update(exchangeRef, {
        status: "cancelled",
        cancelReason: reason || "ไม่ระบุเหตุผล",
        cancelledBy: userId,
        cancelledAt: serverTimestamp(),
      })

      // If no other active exchanges, set item back to available
      if (otherActiveExchanges.length === 0) {
        console.log("[cancelExchange] No other active exchanges, setting item to available...")
        transaction.update(itemRef, { 
          status: "available",
          updatedAt: serverTimestamp(),
        })
      } else {
        console.log("[cancelExchange] Other active exchanges exist, keeping item as pending")
      }
    })

    console.log("[cancelExchange] Transaction completed successfully")

    // Notify the other party (outside transaction)
    const targetUserId = exchangeData.requesterId === userId ? exchangeData.ownerId : exchangeData.requesterId
    await createNotification({
      userId: targetUserId,
      title: "รายการถูกยกเลิก",
      message: `การแลกเปลี่ยน "${exchangeData.itemTitle}" ถูกยกเลิกโดยอีกฝ่าย`,
      type: "exchange",
      relatedId: exchangeId
    })

    console.log("[cancelExchange] Cancellation completed successfully")
  } catch (error) {
    console.error("[cancelExchange] Error during cancellation:", error)
    throw error
  }
}

export const deleteExchange = async (exchangeId: string) => {
  const db = getFirebaseDb()

  console.log("[deleteExchange] Starting deletion:", exchangeId)

  // Delete all chat messages for this exchange
  console.log("[deleteExchange] Deleting chat messages...")
  const messagesQuery = query(collection(db, "chatMessages"), where("exchangeId", "==", exchangeId))
  const messagesSnapshot = await getDocs(messagesQuery)

  console.log("[deleteExchange] Found chat messages:", messagesSnapshot.docs.length)

  // Delete messages in batch
  const deletePromises = messagesSnapshot.docs.map((doc) => deleteDoc(doc.ref))
  await Promise.all(deletePromises)

  console.log("[deleteExchange] Chat messages deleted")

  // Delete the exchange
  console.log("[deleteExchange] Deleting exchange...")
  await deleteDoc(doc(db, "exchanges", exchangeId))

  console.log("[deleteExchange] Exchange deleted successfully")
}

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

  // Log admin action
  await createAdminLog({
    actionType: status === 'resolved' ? 'report_resolve' : 'report_status_change',
    adminId,
    adminEmail,
    targetType: 'report',
    targetId: reportId,
    targetInfo: reportData.targetTitle || reportData.reportType,
    description: `เปลี่ยนสถานะรายงานเป็น: ${status}${note ? ` - ${note}` : ''}`,
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

export const getReports = async () => {
  const db = getFirebaseDb()
  const q = query(collection(db, "reports"), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Report)
}

// Notifications
export const createNotification = async (notificationData: Omit<AppNotification, "id" | "createdAt" | "isRead">) => {
  const db = getFirebaseDb()
  const docRef = await addDoc(collection(db, "notifications"), {
    ...notificationData,
    isRead: false,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export const getNotifications = async (userId: string) => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AppNotification)
}

export const markNotificationAsRead = async (notificationId: string) => {
  const db = getFirebaseDb()
  const docRef = doc(db, "notifications", notificationId)
  await updateDoc(docRef, { isRead: true })
}

export const markAllNotificationsAsRead = async (userId: string) => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("isRead", "==", false)
  )
  const snapshot = await getDocs(q)
  const promises = snapshot.docs.map((doc) => updateDoc(doc.ref, { isRead: true }))
  await Promise.all(promises)
}

export const deleteNotification = async (notificationId: string) => {
  const db = getFirebaseDb()
  const docRef = doc(db, "notifications", notificationId)
  await deleteDoc(docRef)
}
// ============ User Profile Management ============

export const updateUserProfile = async (userId: string, data: Partial<{ displayName: string, photoURL: string, email: string }>) => {
  const db = getFirebaseDb()
  const userRef = doc(db, 'users', userId)
  
  // Clean undefined values to prevent Firestore error
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  )
  
  await setDoc(userRef, {
    ...cleanData,
    uid: userId,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export const getUserProfile = async (userId: string) => {
  const db = getFirebaseDb()
  const userRef = doc(db, 'users', userId)
  const docSnap = await getDoc(userRef)
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as any as User
  }
  return null
}

// ============ User Status & Warning Management ============

export const updateUserStatus = async (
  userId: string,
  status: UserStatus,
  adminId: string,
  adminEmail: string,
  reason?: string,
  suspendDays?: number,
  suspendMinutes?: number
) => {
  const db = getFirebaseDb()
  const userRef = doc(db, 'users', userId)
  
  // Check if user document exists, create if not
  const userDoc = await getDoc(userRef)
  if (!userDoc.exists()) {
    console.log("[updateUserStatus] User document doesn't exist, creating...")
    // Create minimal user document
    await setDoc(userRef, {
      uid: userId,
      status: 'ACTIVE',
      warningCount: 0,
      createdAt: serverTimestamp(),
    })
  }
  
  const updates: any = {
    status,
    updatedAt: serverTimestamp(),
  }

  if (status === 'SUSPENDED' && (suspendDays !== undefined || suspendMinutes !== undefined)) {
    const suspendUntil = new Date()
    // Add days
    if (suspendDays && suspendDays > 0) {
      suspendUntil.setDate(suspendUntil.getDate() + suspendDays)
    }
    // Add minutes
    if (suspendMinutes && suspendMinutes > 0) {
      suspendUntil.setMinutes(suspendUntil.getMinutes() + suspendMinutes)
    }
    updates.suspendedUntil = Timestamp.fromDate(suspendUntil)
    updates.restrictions = {
      canPost: false,
      canExchange: false,
      canChat: false,
    }
  }

  if (status === 'BANNED') {
    updates.bannedReason = reason
    updates.restrictions = {
      canPost: false,
      canExchange: false,
      canChat: false,
    }
  }

  if (status === 'ACTIVE') {
    updates.warningCount = 0
    updates.restrictions = {
      canPost: true,
      canExchange: true,
      canChat: true,
    }
    updates.suspendedUntil = null
    updates.bannedReason = null
  }

  await updateDoc(userRef, updates)
  
  // Notify the user of account status change
  let statusText = status === 'ACTIVE' ? 'ได้รับสิทธิ์ใช้งานปกติ' : status === 'SUSPENDED' ? 'ถูกระงับการใช้งานชั่วคราว' : 'ถูกระงับการใช้งานถาวร'
  let msg = `บัญชีของคุณได้ถูกเปลี่ยนสถานะเป็น: ${statusText}`
  if (reason) msg += ` เนื่องด้วยเหตุผล: ${reason}`

  await createNotification({
    userId: userId,
    title: "อัปเดตสถานะบัญชี",
    message: msg,
    type: status === 'ACTIVE' ? 'system' : 'warning',
    relatedId: userId
  })

  // Create warning record
  await addDoc(collection(db, 'userWarnings'), {
    userId,
    reason: reason || 'Status updated by admin',
    issuedBy: adminId,
    issuedByEmail: adminEmail,
    issuedAt: serverTimestamp(),
    action: status === 'WARNING' ? 'WARNING' : status === 'SUSPENDED' ? 'SUSPEND' : 'BAN',
    resolved: false,
  })

  // Log admin action
  await createAdminLog({
    actionType: status === 'ACTIVE' ? 'user_activate' : status === 'SUSPENDED' ? 'user_suspend' : 'user_ban',
    adminId,
    adminEmail,
    targetType: 'user',
    targetId: userId,
    targetInfo: (await getDoc(userRef)).data()?.email || userId,
    description: `เปลี่ยนสถานะเป็น ${status}${reason ? `: ${reason}` : ''}`,
    metadata: { status, reason, suspendDays, suspendMinutes }
  })

  // Send LINE notification for account status change (async)
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://rmu-app-3-1-2569-wwn2.vercel.app'
  
  try {
    fetch(`${baseUrl}/api/line/notify-user-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action: 'status_change',
        status,
        reason,
        suspendedUntil: updates.suspendedUntil?.toDate?.()?.toISOString()
      })
    }).catch(err => console.log('[LINE] Notify status change error:', err))
  } catch (lineError) {
    console.log('[LINE] Notify status change error:', lineError)
  }
}

// Issue warning - Admin approval required (not auto-escalate)
export const issueWarning = async (
  userId: string,
  userEmail: string,
  reason: string,
  adminId: string,
  adminEmail: string,
  relatedReportId?: string,
  relatedItemId?: string
) => {
  const db = getFirebaseDb()
  const userRef = doc(db, 'users', userId)
  const userDoc = await getDoc(userRef)
  
  if (!userDoc.exists()) throw new Error('User not found')
  
  const userData = userDoc.data()
  const currentWarnings = userData.warningCount || 0
  const newWarningCount = currentWarnings + 1

  const updates: any = {
    warningCount: newWarningCount,
    lastWarningDate: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  // Only update warning count - Admin must manually change status
  await updateDoc(userRef, updates)

  // Create warning record
  const warningData: any = {
    userId,
    userEmail,
    reason,
    issuedBy: adminId,
    issuedByEmail: adminEmail,
    issuedAt: serverTimestamp(),
    action: 'WARNING',
    resolved: false,
  }
  
  // Only add optional fields if they are defined
  if (relatedReportId) warningData.relatedReportId = relatedReportId
  if (relatedItemId) warningData.relatedItemId = relatedItemId
  
  await addDoc(collection(db, 'userWarnings'), warningData)

  // Send notification
  await createNotification({
    userId,
    title: 'ได้รับคำเตือน',
    message: `${reason} (คำเตือนครั้งที่ ${newWarningCount})`,
    type: 'warning',
  })

  // Log admin action
  await createAdminLog({
    actionType: 'user_warning',
    adminId,
    adminEmail,
    targetType: 'user',
    targetId: userId,
    targetInfo: userEmail,
    description: `ออกคำเตือนครั้งที่ ${newWarningCount}: ${reason}`,
    metadata: { warningCount: newWarningCount, relatedReportId, relatedItemId }
  })

  // Send LINE notification for warning (async)
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://rmu-app-3-1-2569-wwn2.vercel.app'
  
  try {
    fetch(`${baseUrl}/api/line/notify-user-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action: 'warning',
        reason,
        warningCount: newWarningCount
      })
    }).catch(err => console.log('[LINE] Notify warning error:', err))
  } catch (lineError) {
    console.log('[LINE] Notify warning error:', lineError)
  }
}

export const deleteUserAndData = async (userId: string) => {
  const db = getFirebaseDb()
  console.log("[deleteUserAndData] Starting full delete for:", userId)

  try {
    // 1. Delete User Document
    await deleteDoc(doc(db, "users", userId))

    // 2. Delete Items
    const itemsQ = query(collection(db, "items"), where("ownerId", "==", userId))
    const itemsSnap = await getDocs(itemsQ)
    const itemDeletes = itemsSnap.docs.map(d => deleteDoc(d.ref))
    await Promise.all(itemDeletes)

    // 3. Delete Exchanges (as requester or owner)
    const exchangesQ1 = query(collection(db, "exchanges"), where("requesterId", "==", userId))
    const exchangesQ2 = query(collection(db, "exchanges"), where("ownerId", "==", userId))
    const [exchangesSnap1, exchangesSnap2] = await Promise.all([getDocs(exchangesQ1), getDocs(exchangesQ2)])
    const exchangeDeletes = [
      ...exchangesSnap1.docs.map(d => deleteDoc(d.ref)),
      ...exchangesSnap2.docs.map(d => deleteDoc(d.ref))
    ]
    await Promise.all(exchangeDeletes)

    // 4. Delete Reports (Critical for Ghost Fix - delete if reporter OR reported)
    const reportsQ1 = query(collection(db, "reports"), where("reporterId", "==", userId))
    const reportsQ2 = query(collection(db, "reports"), where("reportedUserId", "==", userId))
    const reportsQ3 = query(collection(db, "reports"), where("targetId", "==", userId))
    
    const [reportsSnap1, reportsSnap2, reportsSnap3] = await Promise.all([
      getDocs(reportsQ1), 
      getDocs(reportsQ2),
      getDocs(reportsQ3)
    ])
    
    // Use Set to avoid duplicate deletes if queries overlap
    const uniqueReportRefs = new Set([...reportsSnap1.docs, ...reportsSnap2.docs, ...reportsSnap3.docs].map(d => d.ref.path))
    const uniqueReportDeletes = Array.from(uniqueReportRefs).map(path => deleteDoc(doc(db, path)))
    await Promise.all(uniqueReportDeletes)

    // 5. Delete Warnings
    const warningsQ = query(collection(db, "userWarnings"), where("userId", "==", userId))
    const warningsSnap = await getDocs(warningsQ)
    const warningDeletes = warningsSnap.docs.map(d => deleteDoc(d.ref))
    await Promise.all(warningDeletes)

    console.log("[deleteUserAndData] Cleanup complete")
  } catch (error) {
    console.error("[deleteUserAndData] Error:", error)
    throw error
  }
}

// Get user warnings
export const getUserWarnings = async (userId: string) => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, 'userWarnings'),
    where('userId', '==', userId),
    orderBy('issuedAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UserWarning)
}

// Get all warnings (admin)
export const getAllWarnings = async () => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, 'userWarnings'),
    orderBy('issuedAt', 'desc'),
    limit(100)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UserWarning)
}

// ============ Draft Auto-save ============

export const saveDraft = async (
  userId: string,
  type: DraftType,
  data: any
) => {
  const db = getFirebaseDb()
  const draftsRef = collection(db, 'drafts')
  
  // Check if draft exists for this user and type
  const q = query(draftsRef, where('userId', '==', userId), where('type', '==', type))
  const existing = await getDocs(q)
  
  if (!existing.empty && existing.docs[0]) {
    // Update existing draft
    await updateDoc(existing.docs[0].ref, {
      data,
      updatedAt: serverTimestamp(),
    })
    return existing.docs[0].id
  } else {
    // Create new draft
    const docRef = await addDoc(draftsRef, {
      userId,
      type,
      data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  }
}

export const getDraft = async (userId: string, type: DraftType) => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, 'drafts'),
    where('userId', '==', userId),
    where('type', '==', type)
  )
  const snapshot = await getDocs(q)
  
  if (snapshot.empty || !snapshot.docs[0]) return null
  
  const draft = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Draft
  
  // Check if draft is older than 1 day
  const createdAt = (draft.createdAt as any)?.toDate?.() || new Date()
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)
  
  if (createdAt < oneDayAgo) {
    // Delete expired draft
    await deleteDoc(snapshot.docs[0].ref)
    return null
  }
  
  return draft
}

export const deleteDraft = async (draftId: string) => {
  const db = getFirebaseDb()
  await deleteDoc(doc(db, 'drafts', draftId))
}

// Clean up old drafts (can be run periodically)
export const cleanupOldDrafts = async () => {
  const db = getFirebaseDb()
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)
  
  const q = query(collection(db, 'drafts'))
  const snapshot = await getDocs(q)
  
  const deletePromises = snapshot.docs
    .filter((doc) => {
      const createdAt = (doc.data().createdAt as any)?.toDate?.() || new Date()
      return createdAt < oneDayAgo
    })
    .map((doc) => deleteDoc(doc.ref))
  
  await Promise.all(deletePromises)
}

// ============ Auto-Unsuspend System ============

/**
 * Check if a user's suspension has expired and auto-unsuspend them
 * Should be called when user logs in or performs actions
 */
export const checkAndAutoUnsuspend = async (userId: string): Promise<boolean> => {
  const db = getFirebaseDb()
  const userRef = doc(db, 'users', userId)
  
  try {
    const userDoc = await getDoc(userRef)
    if (!userDoc.exists()) return false
    
    const userData = userDoc.data()
    
    // Only process SUSPENDED users
    if (userData.status !== 'SUSPENDED') return false
    
    // Check if suspendedUntil exists and has expired
    const suspendedUntil = userData.suspendedUntil?.toDate?.()
    if (!suspendedUntil) return false
    
    const now = new Date()
    if (now >= suspendedUntil) {
      // Suspension has expired - auto unsuspend
      await updateDoc(userRef, {
        status: 'ACTIVE',
        updatedAt: serverTimestamp(),
      })
      
      // Notify user about auto-unsuspend
      await createNotification({
        userId,
        title: "🔓 บัญชีของคุณถูกปลดล็อคแล้ว",
        message: "ระยะเวลาระงับบัญชีของคุณสิ้นสุดแล้ว คุณสามารถใช้งานได้ตามปกติ",
        type: "system",
        relatedId: userId,
      })
      
      console.log(`[AutoUnsuspend] User ${userId} has been auto-unsuspended`)
      return true
    }
    
    return false
  } catch (error) {
    console.error("[AutoUnsuspend] Error checking suspension:", error)
    return false
  }
}

// ============ Support Ticket System ============

export const createSupportTicket = async (
  ticketData: Omit<SupportTicket, "id" | "createdAt" | "updatedAt" | "status" | "priority">
) => {
  const db = getFirebaseDb()
  
  const docRef = await addDoc(collection(db, "support_tickets"), {
    ...ticketData,
    status: "new" as const,
    priority: 2, // Default: medium priority
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // Notify all admins about new support ticket
  const adminsSnapshot = await getDocs(collection(db, "admins"))
  const notifyPromises = adminsSnapshot.docs.map(async (adminDoc) => {
    const adminData = adminDoc.data()
    // Get admin user ID from users collection by email
    const usersQuery = query(collection(db, "users"), where("email", "==", adminData.email))
    const usersSnapshot = await getDocs(usersQuery)
    
    if (!usersSnapshot.empty && usersSnapshot.docs[0]) {
      const adminUserId = usersSnapshot.docs[0].data().uid
      await createNotification({
        userId: adminUserId,
        title: "📩 Support Ticket ใหม่",
        message: `"${ticketData.subject}" จาก ${ticketData.userEmail}`,
        type: "support",
        relatedId: docRef.id,
      })
    }
  })
  
  await Promise.all(notifyPromises)
  
  return docRef.id
}

export const getSupportTickets = async (status?: SupportTicketStatus) => {
  const db = getFirebaseDb()
  
  let q
  if (status) {
    q = query(
      collection(db, "support_tickets"),
      where("status", "==", status),
      orderBy("createdAt", "desc")
    )
  } else {
    q = query(
      collection(db, "support_tickets"),
      orderBy("createdAt", "desc")
    )
  }
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SupportTicket)
}

export const getUserSupportTickets = async (userId: string) => {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "support_tickets"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SupportTicket)
}

export const updateTicketStatus = async (
  ticketId: string,
  status: SupportTicketStatus,
  adminId?: string,
  adminEmail?: string
) => {
  const db = getFirebaseDb()
  
  const updates: any = {
    status,
    updatedAt: serverTimestamp(),
  }
  
  if (status === "resolved" || status === "closed") {
    updates.resolvedAt = serverTimestamp()
  }
  
  await updateDoc(doc(db, "support_tickets", ticketId), updates)
  
  // Notify user about status change
  const ticketDoc = await getDoc(doc(db, "support_tickets", ticketId))
  const ticketData = ticketDoc.data() as SupportTicket
  
  const statusLabels: Record<SupportTicketStatus, string> = {
    new: "ใหม่",
    in_progress: "กำลังดำเนินการ",
    resolved: "แก้ไขแล้ว",
    closed: "ปิด",
  }
  
  await createNotification({
    userId: ticketData.userId,
    title: "อัปเดตสถานะ Ticket",
    message: `Ticket "${ticketData.subject}" ถูกเปลี่ยนเป็น: ${statusLabels[status]}`,
    type: "support",
    relatedId: ticketId,
  })

  // Log admin action (only if admin info is provided)
  if (adminId && adminEmail) {
    await createAdminLog({
      actionType: 'ticket_status_change',
      adminId,
      adminEmail,
      targetType: 'ticket',
      targetId: ticketId,
      targetInfo: ticketData.subject,
      description: `เปลี่ยนสถานะ Ticket เป็น: ${statusLabels[status]}`,
      metadata: { status, category: ticketData.category }
    })
  }
}

export const replyToTicket = async (
  ticketId: string,
  reply: string,
  adminId: string,
  adminEmail: string
) => {
  const db = getFirebaseDb()
  
  const newMessage = {
    id: Date.now().toString(),
    sender: 'admin',
    senderEmail: adminEmail,
    content: reply,
    createdAt: Timestamp.now()
  }

  await updateDoc(doc(db, "support_tickets", ticketId), {
    adminReply: reply, // Keep for legacy
    messages: arrayUnion(newMessage),
    repliedBy: adminId,
    repliedByEmail: adminEmail,
    repliedAt: serverTimestamp(),
    status: "in_progress",
    updatedAt: serverTimestamp(),
  })
  
  // Notify user about the reply
  const ticketDoc = await getDoc(doc(db, "support_tickets", ticketId))
  const ticketData = ticketDoc.data() as SupportTicket
  
  await createNotification({
    userId: ticketData.userId,
    title: "📬 ได้รับการตอบกลับจาก Support",
    message: `Ticket "${ticketData.subject}" ได้รับการตอบกลับจากทีมงานแล้ว`,
    type: "support",
    relatedId: ticketId,
  })

  // Log admin action
  await createAdminLog({
    actionType: 'ticket_reply',
    adminId,
    adminEmail,
    targetType: 'ticket',
    targetId: ticketId,
    targetInfo: ticketData.subject,
    description: `ตอบกลับ Ticket: ${reply.substring(0, 100)}${reply.length > 100 ? '...' : ''}`,
    metadata: { category: ticketData.category }
  })
}

export const userReplyToTicket = async (
  ticketId: string,
  reply: string,
  userEmail: string
) => {
  const db = getFirebaseDb()
  
  const newMessage = {
    id: Date.now().toString(),
    sender: 'user', 
    senderEmail: userEmail,
    content: reply,
    createdAt: Timestamp.now()
  }

  await updateDoc(doc(db, "support_tickets", ticketId), {
    messages: arrayUnion(newMessage),
    status: "new",
    updatedAt: serverTimestamp(),
  })
}

// ============ Admin Activity Logs ============

export type AdminActionType = 
  | 'user_warning'
  | 'user_suspend' 
  | 'user_ban'
  | 'user_activate'
  | 'report_status_change'
  | 'report_resolve'
  | 'item_delete'
  | 'item_status_change'
  | 'ticket_reply'
  | 'ticket_status_change'
  | 'other'

export interface AdminLog {
  id: string
  actionType: AdminActionType
  adminId: string
  adminEmail: string
  targetType: 'user' | 'item' | 'report' | 'ticket' | 'exchange'
  targetId: string
  targetInfo?: string // e.g. user email, item title
  description: string
  metadata?: Record<string, any>
  createdAt: any
}

/**
 * Create an admin activity log entry
 */
export const createAdminLog = async (
  logData: Omit<AdminLog, 'id' | 'createdAt'>
): Promise<string> => {
  const db = getFirebaseDb()
  
  const docRef = await addDoc(collection(db, "adminLogs"), {
    ...logData,
    createdAt: serverTimestamp(),
  })
  
  return docRef.id
}

/**
 * Get admin activity logs with optional filters
 */
export const getAdminLogs = async (
  options?: {
    adminId?: string
    actionType?: AdminActionType
    targetType?: 'user' | 'item' | 'report' | 'ticket' | 'exchange'
    limitCount?: number
  }
): Promise<AdminLog[]> => {
  const db = getFirebaseDb()
  
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")]
  
  if (options?.adminId) {
    constraints.push(where("adminId", "==", options.adminId))
  }
  
  if (options?.actionType) {
    constraints.push(where("actionType", "==", options.actionType))
  }
  
  if (options?.targetType) {
    constraints.push(where("targetType", "==", options.targetType))
  }
  
  constraints.push(limit(options?.limitCount || 100))
  
  const q = query(collection(db, "adminLogs"), ...constraints)
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AdminLog)
}

/**
 * Get admin logs for a specific target
 */
export const getAdminLogsByTarget = async (
  targetType: 'user' | 'item' | 'report' | 'ticket' | 'exchange',
  targetId: string
): Promise<AdminLog[]> => {
  const db = getFirebaseDb()
  
  const q = query(
    collection(db, "adminLogs"),
    where("targetType", "==", targetType),
    where("targetId", "==", targetId),
    orderBy("createdAt", "desc")
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AdminLog)
}

// ============ LINE Notification Helpers ============

/**
 * Get all admin LINE User IDs for notifications
 * Returns array of LINE User IDs from users collection where isAdmin=true and lineUserId exists
 */
export const getAdminLineUserIds = async (): Promise<string[]> => {
  const db = getFirebaseDb()
  
  // Get all admin emails from admins collection
  const adminsSnapshot = await getDocs(collection(db, "admins"))
  const adminEmails = adminsSnapshot.docs.map(doc => doc.data().email)
  
  if (adminEmails.length === 0) {
    return []
  }
  
  // Find users with those emails who have LINE linked
  const lineUserIds: string[] = []
  
  for (const email of adminEmails) {
    const usersQuery = query(
      collection(db, "users"),
      where("email", "==", email)
    )
    const usersSnapshot = await getDocs(usersQuery)
    
    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0]!.data() as User
      if (userData.lineUserId && userData.lineNotifications?.enabled) {
        lineUserIds.push(userData.lineUserId)
      }
    }
  }
  
  return lineUserIds
}

/**
 * Get user LINE settings for notification
 */
export const getUserLineSettings = async (userId: string) => {
  const db = getFirebaseDb()
  const userRef = doc(db, "users", userId)
  const userDoc = await getDoc(userRef)
  
  if (!userDoc.exists()) {
    return null
  }
  
  const userData = userDoc.data() as User
  return {
    lineUserId: userData.lineUserId,
    enabled: userData.lineNotifications?.enabled ?? false,
    settings: userData.lineNotifications
  }
}

/**
 * Update user LINE notification settings
 */
export const updateUserLineSettings = async (
  userId: string,
  settings: User['lineNotifications']
) => {
  const db = getFirebaseDb()
  await updateDoc(doc(db, "users", userId), {
    lineNotifications: settings,
    updatedAt: serverTimestamp()
  })
}

/**
 * Link LINE account to user
 */
export const linkLineAccount = async (
  userId: string,
  lineUserId: string
) => {
  const db = getFirebaseDb()
  await updateDoc(doc(db, "users", userId), {
    lineUserId,
    lineNotifications: {
      enabled: true,
      exchangeRequest: true,
      exchangeStatus: true,
      exchangeComplete: true,
    },
    updatedAt: serverTimestamp()
  })
}

/**
 * Unlink LINE account from user
 */
export const unlinkLineAccount = async (userId: string) => {
  const db = getFirebaseDb()
  await updateDoc(doc(db, "users", userId), {
    lineUserId: null,
    lineNotifications: {
      enabled: false,
      exchangeRequest: false,
      exchangeStatus: false,
      exchangeComplete: false,
    },
    updatedAt: serverTimestamp()
  })
}

