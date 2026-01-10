import type { Timestamp, FieldValue } from "firebase/firestore"

export type ItemCategory = "electronics" | "books" | "furniture" | "clothing" | "sports" | "other"

export type ItemStatus = "available" | "pending" | "completed"

export type ExchangeStatus =
  | "pending" // รอการตอบรับ (เดิม: requested)
  | "accepted" // ตอบรับแล้ว
  | "in_progress" // กำลังดำเนินการ
  | "completed" // เสร็จสิ้น
  | "cancelled" // ยกเลิก
  | "rejected" // ปฏิเสธ

export type UserStatus = 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'BANNED'

export interface User {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  createdAt: Timestamp
  isAdmin?: boolean
  termsAccepted?: boolean
  
  // User Status & Restrictions
  status: UserStatus
  warningCount: number
  lastWarningDate?: Timestamp | FieldValue
  suspendedUntil?: Timestamp | FieldValue
  bannedReason?: string
  restrictions?: {
    canPost: boolean
    canExchange: boolean
    canChat: boolean
  }
  
  // Onboarding
  hasSeenOnboarding?: boolean

  // LINE Notification Settings
  lineUserId?: string                    // LINE User ID (เชื่อมผ่าน Webhook)
  lineLinkCode?: string                  // 6-digit code (ชั่วคราวสำหรับ linking)
  lineLinkCodeExpires?: Timestamp        // หมดอายุ 5 นาที
  lineConnectedAt?: Timestamp            // เวลาที่เชื่อมบัญชี LINE
  lineInviteSkipped?: boolean            // ผู้ใช้กด "ข้ามไปก่อน" ที่ popup
  lineNotifications?: {
    enabled: boolean                     // เปิด/ปิดการแจ้งเตือน LINE
    exchangeRequest: boolean             // แจ้งเตือนเมื่อมีคนขอของ
    exchangeStatus: boolean              // แจ้งเตือนเมื่อสถานะเปลี่ยน
    exchangeComplete: boolean            // แจ้งเตือนเมื่อแลกเปลี่ยนสำเร็จ
  }
}

export interface Item {
  id: string
  title: string
  description: string
  category: ItemCategory
  imageUrl?: string // @deprecated - use imageUrls instead. Kept for backward compatibility
  imageUrls?: string[] // Array of image URLs (Cloudinary CDN or legacy Base64)
  location?: string
  locationDetail?: string
  status: ItemStatus
  postedBy: string
  postedByEmail: string
  postedByName?: string // Display name of poster (cached for fast display)
  postedAt: Timestamp
  updatedAt: Timestamp
  searchKeywords?: string[] // For server-side simple search
}

export interface Exchange {
  id: string
  itemId: string
  itemTitle: string
  ownerId: string
  ownerEmail: string
  requesterId: string
  requesterEmail: string
  status: ExchangeStatus
  ownerConfirmed: boolean
  requesterConfirmed: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  cancelReason?: string // เหตุผลการยกเลิก
  cancelledBy?: string // UID ของผู้ยกเลิก
  cancelledAt?: Timestamp | FieldValue // เวลาที่ยกเลิก
}

export interface ChatMessage {
  id: string
  exchangeId: string
  senderId: string
  senderEmail: string
  message: string
  createdAt: Timestamp
  imageUrl?: string
  imageType?: 'image/jpeg' | 'image/png' | 'image/webp'
}

export type ReportType = "item_report" | "exchange_report" | "chat_report" | "user_report"

export type ReportStatus =
  | "new" // รายงานใหม่
  | "under_review" // กำลังตรวจสอบ
  | "waiting_user" // รอข้อมูลเพิ่มเติมจากผู้ใช้
  | "action_taken" // ดำเนินการแล้ว
  | "resolved" // แก้ไขเสร็จสิ้น
  | "closed" // ปิดเคส
  | "rejected" // ปฏิเสธรายงาน

export interface Report {
  id: string
  reportType: ReportType
  status: ReportStatus
  reasonCode: string // รหัสเหตุผล เช่น "item_fake_info", "exchange_no_show"
  reason: string // ข้อความเหตุผล (แปลจาก reasonCode)
  description: string
  reporterId: string
  reporterEmail: string

  // Evidence
  evidenceUrls?: string[] // URLs หรือ Base64 รูปภาพหลักฐาน

  // Target fields (depends on reportType)
  targetId: string // itemId, exchangeId, chatId, or userId
  targetType?: string // item, user, exchange, chat
  targetTitle?: string // item title, exchange title, etc.
  
  // Reported user info (for all report types)
  reportedUserId: string // Owner of item/exchange, participant in chat, or direct user
  reportedUserEmail: string

  // Item report specific
  itemId?: string
  itemTitle?: string
  itemStatus?: string

  // Exchange report specific
  exchangeId?: string
  exchangeTitle?: string
  exchangeStatus?: string

  // Chat report specific
  chatId?: string
  messageId?: string

  // User report specific (no additional fields needed now)
  userStatus?: string

  // Admin fields
  handledBy?: string // admin UID
  handledByEmail?: string
  adminNote?: string

  // Timestamps
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
  resolvedAt?: Timestamp | FieldValue
}

export type NotificationType = "exchange" | "chat" | "report" | "system" | "warning" | "support"

export interface AppNotification {
  id: string
  userId: string // ผู้รับการแจ้งเตือน
  title: string
  message: string
  type: NotificationType
  relatedId?: string // ID ของสิ่งที่เกี่ยวข้อง (เช่น exchangeId, reportId)
  isRead: boolean
  createdAt: Timestamp | FieldValue
  senderId?: string // ผู้ส่ง (ถ้ามี)
}

export type WarningAction = 'WARNING' | 'SUSPEND' | 'BAN'

export interface UserWarning {
  id: string
  userId: string
  userEmail: string
  reason: string
  issuedBy: string // Admin UID
  issuedByEmail: string
  issuedAt: Timestamp | FieldValue
  relatedReportId?: string
  relatedItemId?: string
  action: WarningAction
  expiresAt?: Timestamp | FieldValue
  resolved: boolean
  adminNote?: string
}

export type DraftType = 'item' | 'report'

export interface Draft {
  id: string
  userId: string
  type: DraftType
  data: any // JSON object with form data
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
}

// ============ Admin Panel V2 Types ============

export type CaseType = 'item' | 'user' | 'exchange' | 'chat'
export type CaseStatus = 'new' | 'under_review' | 'resolved' | 'rejected'
export type CaseDecision = 'dismiss' | 'warning' | 'request_edit' | 'suspend' | 'ban' | 'delete_item' | 'hide_item'

export interface Case {
  id: string
  type: CaseType
  targetId: string
  targetTitle: string
  targetOwnerId?: string
  targetOwnerEmail?: string
  status: CaseStatus
  reportCount: number
  reportIds: string[]
  priority: number
  assignedTo?: string
  assignedToEmail?: string
  decision?: CaseDecision
  decisionNote?: string
  suspendDays?: number
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
  resolvedAt?: Timestamp | FieldValue
  resolvedBy?: string
  resolvedByEmail?: string
}

export type AdminAction = 
  | 'case_created'
  | 'case_assigned'
  | 'case_resolved'
  | 'case_rejected'
  | 'warning_issued'
  | 'user_suspended'
  | 'user_banned'
  | 'user_activated'
  | 'item_hidden'
  | 'item_deleted'
  | 'item_restored'

export interface AdminLog {
  id: string
  action: AdminAction
  adminId: string
  adminEmail: string
  targetType: 'case' | 'item' | 'user' | 'report'
  targetId: string
  targetTitle?: string
  details?: Record<string, any>
  reason: string
  createdAt: Timestamp | FieldValue
}

// ============ Support Ticket System ============

export type SupportTicketCategory = 'general' | 'bug' | 'feature' | 'account' | 'exchange' | 'other'

export type SupportTicketStatus = 'new' | 'in_progress' | 'resolved' | 'closed'

export interface SupportTicket {
  id: string
  subject: string
  category: SupportTicketCategory
  description: string
  userId: string
  userEmail: string
  status: SupportTicketStatus
  priority: number // 1 = low, 2 = medium, 3 = high
  
// Admin response (Legacy)
  adminReply?: string
  repliedBy?: string
  repliedByEmail?: string
  repliedAt?: Timestamp | FieldValue

  // Chat History (New)
  messages?: SupportMessage[]
  
  // Timestamps
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
  resolvedAt?: Timestamp | FieldValue
}

export interface SupportMessage {
  id: string
  sender: 'user' | 'admin'
  senderEmail: string
  content: string
  createdAt: Timestamp | FieldValue
}

