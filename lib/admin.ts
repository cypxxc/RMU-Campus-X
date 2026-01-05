import {
  collection,
  addDoc,
  updateDoc,
  // deleteDoc imported but not used - keeping for potential future use
  deleteDoc as _deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { getFirebaseDb } from "./firebase"
import type { 
  Case, 
  CaseType, 
  CaseStatus, 
  CaseDecision,
  AdminLog,
  AdminAction,
  Report,
} from "@/types"

// ============ Case Management ============

export async function createCase(caseData: Omit<Case, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const db = getFirebaseDb()
  const docRef = await addDoc(collection(db, "cases"), {
    ...caseData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getCases(filters?: { 
  status?: CaseStatus
  type?: CaseType
  stale?: boolean // cases older than 24 hours
}): Promise<Case[]> {
  const db = getFirebaseDb()
  const constraints: any[] = [orderBy("priority", "desc"), orderBy("createdAt", "desc")]
  
  if (filters?.status) {
    constraints.unshift(where("status", "==", filters.status))
  }
  if (filters?.type) {
    constraints.unshift(where("type", "==", filters.type))
  }

  const q = query(collection(db, "cases"), ...constraints)
  const snapshot = await getDocs(q)
  
  let cases = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Case[]

  // Filter stale cases (older than 24 hours)
  if (filters?.stale) {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    cases = cases.filter(c => {
      const createdAt = (c.createdAt as Timestamp)?.toDate?.()
      return createdAt && createdAt < oneDayAgo && (c.status === 'new' || c.status === 'under_review')
    })
  }

  return cases
}

export async function getCaseById(id: string): Promise<Case | null> {
  const db = getFirebaseDb()
  const docRef = doc(db, "cases", id)
  const snapshot = await getDoc(docRef)
  
  if (!snapshot.exists()) return null
  
  return {
    id: snapshot.id,
    ...snapshot.data()
  } as Case
}

export async function updateCase(id: string, data: Partial<Case>): Promise<void> {
  const db = getFirebaseDb()
  const docRef = doc(db, "cases", id)
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function assignCase(
  caseId: string, 
  adminId: string, 
  adminEmail: string
): Promise<void> {
  await updateCase(caseId, {
    status: 'under_review',
    assignedTo: adminId,
    assignedToEmail: adminEmail,
  })
  
  await createAdminLog({
    action: 'case_assigned',
    adminId,
    adminEmail,
    targetType: 'case',
    targetId: caseId,
    reason: 'เปิดตรวจสอบเคส',
  })
}

export async function resolveCase(
  caseId: string,
  decision: CaseDecision,
  adminId: string,
  adminEmail: string,
  note: string,
  suspendDays?: number
): Promise<void> {
  await updateCase(caseId, {
    status: 'resolved',
    decision,
    decisionNote: note,
    suspendDays,
    resolvedAt: serverTimestamp() as any,
    resolvedBy: adminId,
    resolvedByEmail: adminEmail,
  })

  await createAdminLog({
    action: 'case_resolved',
    adminId,
    adminEmail,
    targetType: 'case',
    targetId: caseId,
    details: { decision, suspendDays },
    reason: note,
  })
}

export async function rejectCase(
  caseId: string,
  adminId: string,
  adminEmail: string,
  note: string
): Promise<void> {
  await updateCase(caseId, {
    status: 'rejected',
    decisionNote: note,
    resolvedAt: serverTimestamp() as any,
    resolvedBy: adminId,
    resolvedByEmail: adminEmail,
  })

  await createAdminLog({
    action: 'case_rejected',
    adminId,
    adminEmail,
    targetType: 'case',
    targetId: caseId,
    reason: note,
  })
}

// Create or update case from reports
export async function syncCaseFromReports(
  type: CaseType,
  targetId: string,
  targetTitle: string,
  targetOwnerId?: string,
  targetOwnerEmail?: string
): Promise<string> {
  const db = getFirebaseDb()
  
  // Check if case exists
  const q = query(
    collection(db, "cases"),
    where("type", "==", type),
    where("targetId", "==", targetId),
    where("status", "in", ["new", "under_review"])
  )
  const snapshot = await getDocs(q)
  
  // Get all reports for this target
  const reportsQuery = query(
    collection(db, "reports"),
    where("targetId", "==", targetId),
    where("status", "in", ["new", "under_review"])
  )
  const reportsSnapshot = await getDocs(reportsQuery)
  const reportIds = reportsSnapshot.docs.map(d => d.id)
  const reportCount = reportIds.length

  // Calculate priority (more reports = higher priority)
  const priority = reportCount * 10

  if (!snapshot.empty) {
    // Update existing case
    const caseDoc = snapshot.docs[0]
    if (caseDoc) {
      await updateCase(caseDoc.id, {
        reportCount,
        reportIds,
        priority,
      })
      return caseDoc.id
    }
  }
  
  // Create new case
  return await createCase({
    type,
    targetId,
    targetTitle,
    targetOwnerId,
    targetOwnerEmail,
    status: 'new',
    reportCount,
    reportIds,
    priority,
  })
}

// ============ Admin Logs ============

export async function createAdminLog(
  logData: Omit<AdminLog, "id" | "createdAt">
): Promise<string> {
  const db = getFirebaseDb()
  const docRef = await addDoc(collection(db, "admin_logs"), {
    ...logData,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getAdminLogs(filters?: {
  adminId?: string
  action?: AdminAction
  targetType?: string
  limit?: number
}): Promise<AdminLog[]> {
  const db = getFirebaseDb()
  const constraints: any[] = [orderBy("createdAt", "desc")]
  
  if (filters?.adminId) {
    constraints.unshift(where("adminId", "==", filters.adminId))
  }
  if (filters?.action) {
    constraints.unshift(where("action", "==", filters.action))
  }
  if (filters?.targetType) {
    constraints.unshift(where("targetType", "==", filters.targetType))
  }

  const q = query(collection(db, "admin_logs"), ...constraints)
  const snapshot = await getDocs(q)
  
  const logs = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AdminLog[]

  return filters?.limit ? logs.slice(0, filters.limit) : logs
}

// ============ Admin Statistics (uses existing collections - no cases needed) ============

export async function getAdminStats(): Promise<{
  newReports: number
  underReviewReports: number
  totalReports: number
  totalUsers: number
  totalItems: number
  totalExchanges: number
  warnedUsers: number
  suspendedUsers: number
  bannedUsers: number
}> {
  const db = getFirebaseDb()

  // Reports stats from existing reports collection
  let newReports = 0
  let underReviewReports = 0
  let totalReports = 0
  
  try {
    const reportsSnapshot = await getDocs(collection(db, "reports"))
    totalReports = reportsSnapshot.size
    reportsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.status === 'new') newReports++
      if (data.status === 'under_review') underReviewReports++
    })
  } catch (e) {
    console.log("[Admin] Reports collection error:", e)
  }

  // Users stats
  let totalUsers = 0
  let warnedUsers = 0
  let suspendedUsers = 0
  let bannedUsers = 0

  try {
    const usersSnapshot = await getDocs(collection(db, "users"))
    totalUsers = usersSnapshot.size
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.status === 'WARNING') warnedUsers++
      if (data.status === 'SUSPENDED') suspendedUsers++
      if (data.status === 'BANNED') bannedUsers++
    })
  } catch (e) {
    console.log("[Admin] Users collection may not exist")
  }

  // Items stats
  let totalItems = 0
  try {
    const itemsSnapshot = await getDocs(collection(db, "items"))
    totalItems = itemsSnapshot.size
  } catch (e) {}

  // Exchanges stats
  let totalExchanges = 0
  try {
    const exchangesSnapshot = await getDocs(collection(db, "exchanges"))
    totalExchanges = exchangesSnapshot.size
  } catch (e) {}

  return {
    newReports,
    underReviewReports,
    totalReports,
    totalUsers,
    totalItems,
    totalExchanges,
    warnedUsers,
    suspendedUsers,
    bannedUsers,
  }
}

// Get users under action (for moderation tab)
export async function getUsersUnderAction(): Promise<{
  warned: Array<{ uid: string; email: string; warningCount: number }>
  suspended: Array<{ uid: string; email: string; suspendedUntil?: any }>
  banned: Array<{ uid: string; email: string; bannedReason?: string }>
}> {
  const db = getFirebaseDb()
  const warned: Array<{ uid: string; email: string; warningCount: number }> = []
  const suspended: Array<{ uid: string; email: string; suspendedUntil?: any }> = []
  const banned: Array<{ uid: string; email: string; bannedReason?: string }> = []

  try {
    const usersSnapshot = await getDocs(collection(db, "users"))
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.status === 'WARNING') {
        warned.push({ uid: data.uid, email: data.email, warningCount: data.warningCount || 0 })
      }
      if (data.status === 'SUSPENDED') {
        suspended.push({ uid: data.uid, email: data.email, suspendedUntil: data.suspendedUntil })
      }
      if (data.status === 'BANNED') {
        banned.push({ uid: data.uid, email: data.email, bannedReason: data.bannedReason })
      }
    })
  } catch (e) {
    console.log("[Admin] Error fetching users under action")
  }

  return { warned, suspended, banned }
}

// Get items under action (hidden/deleted)
export async function getItemsUnderAction(): Promise<{
  hidden: Array<{ id: string; title: string; ownerEmail: string }>
  deleted: Array<{ id: string; title: string; ownerEmail: string; deletedAt: any }>
}> {
  // For now, return empty since we don't track hidden items yet
  // This can be extended later
  return {
    hidden: [],
    deleted: [],
  }
}

// Get reports linked to a case
export async function getReportsForCase(reportIds: string[]): Promise<Report[]> {
  if (!reportIds.length) return []
  
  const db = getFirebaseDb()
  const reports: Report[] = []
  
  for (const id of reportIds) {
    const docRef = doc(db, "reports", id)
    const snapshot = await getDoc(docRef)
    if (snapshot.exists()) {
      reports.push({ id: snapshot.id, ...snapshot.data() } as Report)
    }
  }
  
  return reports
}
