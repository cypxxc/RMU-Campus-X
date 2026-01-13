import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  QueryConstraint 
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"


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
  targetType: 'user' | 'item' | 'report' | 'ticket' | 'exchange' | 'system'
  targetId: string
  targetInfo?: string
  description: string
  // Audit Fields
  status: 'success' | 'failed'
  reason?: string // Error message or manual note
  beforeState?: Record<string, any> // Data snapshot before action
  afterState?: Record<string, any> // Data snapshot after action
  metadata?: Record<string, any>
  createdAt: any
}

/**
 * Create an admin activity log entry
 * Uses server-side API for audit trail integrity (Admin SDK bypasses rules)
 */
export const createAdminLog = async (
  logData: Omit<AdminLog, 'id' | 'createdAt' | 'adminId' | 'adminEmail'>
): Promise<string> => {
  try {
    // Get auth token for API call
    const { getAuth } = await import("firebase/auth")
    const auth = getAuth()
    const token = await auth.currentUser?.getIdToken()
    
    if (!token) {
      throw new Error("Authentication required for admin logging")
    }

    const response = await fetch('/api/admin/log', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to create admin log")
    }

    const result = await response.json()
    return result.data?.logId || 'logged'
  } catch (error) {
    console.error("Failed to write admin log:", error)
    // Critical: Rethrow to ensure UI shows failure if logging fails
    throw error 
  }
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
