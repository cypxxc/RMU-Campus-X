// ============================================================
// Admin Service Types (SOLID: Interface Segregation Principle)
// ============================================================

// ============ User Data Types ============

export interface UserData {
  uid: string
  email?: string
  status?: 'ACTIVE' | 'SUSPENDED' | 'BANNED'
  warningCount?: number
  suspensionCount?: number
  suspendedUntil?: Date | null
  bannedReason?: string | null
  restrictions?: {
    canPost: boolean
    canExchange: boolean
    canChat: boolean
  }
  lastWarningDate?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

// ============ Audit Log Types ============

export type AdminActionType =
  | 'user_activate'
  | 'user_suspend'
  | 'user_ban'
  | 'user_warning'

export interface AuditLogInput {
  actionType: AdminActionType
  adminId: string
  adminEmail: string
  targetType: 'user'
  targetId: string
  targetInfo?: string
  description?: string
  status: 'success' | 'failed'
  reason?: string
  beforeState?: Record<string, unknown>
  afterState?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

// ============ Notification Types ============

export interface NotificationInput {
  userId: string
  title: string
  message: string
  type: 'system' | 'warning'
  relatedId?: string
  isRead?: boolean
}

// ============ Warning Types ============

export type WarningAction = 'WARNING' | 'SUSPEND' | 'BAN'

export interface WarningRecordInput {
  userId: string
  userEmail?: string
  reason: string
  issuedBy: string
  issuedByEmail: string
  action: WarningAction
  resolved?: boolean
}

// ============ Action Parameters ============

export interface AdminActionParams {
  adminId: string
  adminEmail: string
  userId: string
  reason?: string
}

export interface UpdateStatusParams extends AdminActionParams {
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'
  suspendDays?: number
  suspendMinutes?: number
}

// ============ Dependencies Interface (DIP) ============

export interface UserStatusUpdateDeps {
  // Read operations
  getUserById: (id: string) => Promise<UserData | null>
  
  // Write operations
  createUser: (id: string, data: Partial<UserData>) => Promise<void>
  updateUser: (id: string, data: Partial<UserData>) => Promise<void>
  
  // Side effects
  createAuditLog: (log: AuditLogInput) => Promise<void>
  createNotification: (notif: NotificationInput) => Promise<void>
  createWarningRecord: (warning: WarningRecordInput) => Promise<void>
}

export interface WarningIssueDeps {
  // Read operations
  getUserById: (id: string) => Promise<UserData | null>
  
  // Write operations
  updateUser: (id: string, data: Partial<UserData>) => Promise<void>
  
  // Side effects
  createAuditLog: (log: AuditLogInput) => Promise<void>
  createNotification: (notif: NotificationInput) => Promise<void>
  createWarningRecord: (warning: WarningRecordInput) => Promise<void>
}

// ============ Service Result Types ============

export interface UpdateStatusResult {
  success: boolean
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'
  userId: string
  suspendedUntil?: Date | null
}

export interface IssueWarningResult {
  success: boolean
  warningCount: number
  autoAction?: 'NONE' | 'SUSPENDED' | 'BANNED'
  suspendedUntil?: Date | null
  suspensionCount?: number
}
