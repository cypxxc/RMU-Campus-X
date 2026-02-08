/**
 * Firestore Data Converters - Type-safe read/write สำหรับทุก collection
 * ใช้ withConverter() เพื่อให้ TypeScript รู้โครงสร้างข้อมูลโดยอัตโนมัติ
 */

import type {
  Item,
  User,
  Exchange,
  ChatMessage,
  Report,
  Announcement,
  AppNotification,
  UserWarning,
  Draft,
  SupportTicket,
  SupportMessage,
  AdminLog,
  Case,
} from "@/types"
import type { QueryDocumentSnapshot, DocumentData } from "firebase-admin/firestore"

/** Helper: แปลง snapshot เป็น typed object พร้อม id */
function fromSnap<T extends { id: string }>(
  snap: QueryDocumentSnapshot,
  mapFn: (data: DocumentData) => Omit<T, "id">
): T {
  const data = snap.data()
  return { id: snap.id, ...mapFn(data ?? {}) } as T
}

// ============ Item ============
export const itemConverter = {
  toFirestore(item: Partial<Item> | DocumentData): DocumentData {
    if (item && typeof item === "object" && "id" in item) {
      const { id: _id, ...rest } = item as Item
      return rest as DocumentData
    }
    return item as DocumentData
  },
  fromFirestore(snap: QueryDocumentSnapshot): Item {
    return fromSnap<Item>(snap, (d) => ({
      title: d.title ?? "",
      description: d.description ?? "",
      category: d.category ?? "other",
      imagePublicIds: d.imagePublicIds,
      imageUrl: d.imageUrl,
      imageUrls: d.imageUrls,
      location: d.location,
      locationDetail: d.locationDetail,
      status: d.status ?? "available",
      postedBy: d.postedBy ?? "",
      postedByEmail: d.postedByEmail ?? "",
      postedByName: d.postedByName,
      postedAt: d.postedAt,
      updatedAt: d.updatedAt,
      searchKeywords: d.searchKeywords,
    }))
  },
}

// ============ User ============
export const userConverter = {
  toFirestore(user: Partial<User>): DocumentData {
    return user as DocumentData
  },
  fromFirestore(snap: QueryDocumentSnapshot): User {
    const d = snap.data() ?? {}
    return {
      uid: snap.id,
      email: d.email ?? "",
      displayName: d.displayName,
      bio: d.bio,
      photoURL: d.photoURL,
      createdAt: d.createdAt,
      isAdmin: d.isAdmin,
      termsAccepted: d.termsAccepted,
      termsAcceptedAt: d.termsAcceptedAt,
      status: d.status ?? "ACTIVE",
      warningCount: d.warningCount ?? 0,
      lastWarningDate: d.lastWarningDate,
      suspendedUntil: d.suspendedUntil,
      bannedReason: d.bannedReason,
      restrictions: d.restrictions,
      hasSeenOnboarding: d.hasSeenOnboarding,
      lineUserId: d.lineUserId,
      lineLinkCode: d.lineLinkCode,
      lineLinkCodeExpires: d.lineLinkCodeExpires,
      lineConnectedAt: d.lineConnectedAt,
      lineInviteSkipped: d.lineInviteSkipped,
      lineNotifications: d.lineNotifications,
      rating: d.rating,
    }
  },
}

// ============ Exchange ============
export const exchangeConverter = {
  toFirestore(exchange: Omit<Exchange, "id">): DocumentData {
    const { id: _id, ...rest } = exchange as Exchange
    return rest
  },
  fromFirestore(snap: QueryDocumentSnapshot): Exchange {
    return fromSnap<Exchange>(snap, (d) => ({
      itemId: d.itemId ?? "",
      itemTitle: d.itemTitle ?? "",
      ownerId: d.ownerId ?? "",
      ownerEmail: d.ownerEmail ?? "",
      requesterId: d.requesterId ?? "",
      requesterEmail: d.requesterEmail ?? "",
      requesterName: d.requesterName,
      status: d.status ?? "pending",
      ownerConfirmed: d.ownerConfirmed ?? false,
      requesterConfirmed: d.requesterConfirmed ?? false,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      cancelReason: d.cancelReason,
      cancelledBy: d.cancelledBy,
      cancelledAt: d.cancelledAt,
    }))
  },
}

// ============ ChatMessage ============
export const chatMessageConverter = {
  toFirestore(msg: Omit<ChatMessage, "id">): DocumentData {
    const { id: _id, ...rest } = msg as ChatMessage
    return rest
  },
  fromFirestore(snap: QueryDocumentSnapshot): ChatMessage {
    return fromSnap<ChatMessage>(snap, (d) => ({
      exchangeId: d.exchangeId ?? "",
      senderId: d.senderId ?? "",
      senderEmail: d.senderEmail ?? "",
      message: d.message ?? "",
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      imageUrl: d.imageUrl ?? null,
      imageType: d.imageType ?? null,
      readAt: d.readAt ?? null,
    }))
  },
}

// ============ Report ============
export const reportConverter = {
  toFirestore(report: Omit<Report, "id">): DocumentData {
    const { id: _id, ...rest } = report as Report
    return rest
  },
  fromFirestore(snap: QueryDocumentSnapshot): Report {
    return fromSnap<Report>(snap, (d) => ({
      reportType: d.reportType ?? "item_report",
      status: d.status ?? "new",
      reasonCode: d.reasonCode ?? "",
      reason: d.reason ?? "",
      description: d.description ?? "",
      reporterId: d.reporterId ?? "",
      reporterEmail: d.reporterEmail ?? "",
      evidenceUrls: d.evidenceUrls,
      targetId: d.targetId ?? "",
      targetType: d.targetType,
      targetTitle: d.targetTitle,
      reportedUserId: d.reportedUserId ?? "",
      reportedUserEmail: d.reportedUserEmail ?? "",
      itemId: d.itemId,
      itemTitle: d.itemTitle,
      itemStatus: d.itemStatus,
      exchangeId: d.exchangeId,
      exchangeTitle: d.exchangeTitle,
      exchangeStatus: d.exchangeStatus,
      chatId: d.chatId,
      messageId: d.messageId,
      userStatus: d.userStatus,
      handledBy: d.handledBy,
      handledByEmail: d.handledByEmail,
      adminNote: d.adminNote,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      resolvedAt: d.resolvedAt,
    }))
  },
}

// ============ Announcement ============
export const announcementConverter = {
  toFirestore(announcement: Omit<Announcement, "id">): DocumentData {
    const { id: _id, ...rest } = announcement as Announcement
    return rest
  },
  fromFirestore(snap: QueryDocumentSnapshot): Announcement {
    return fromSnap<Announcement>(snap, (d) => ({
      title: d.title ?? "",
      message: d.message ?? "",
      type: d.type ?? "info",
      isActive: d.isActive ?? true,
      startAt: d.startAt ?? null,
      endAt: d.endAt ?? null,
      linkUrl: d.linkUrl ?? null,
      linkLabel: d.linkLabel ?? null,
      createdBy: d.createdBy ?? "",
      createdByEmail: d.createdByEmail,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }))
  },
}

// ============ AppNotification ============
export const appNotificationConverter = {
  toFirestore(notification: Omit<AppNotification, "id">): DocumentData {
    const { id: _id, ...rest } = notification as AppNotification
    return rest
  },
  fromFirestore(snap: QueryDocumentSnapshot): AppNotification {
    return fromSnap<AppNotification>(snap, (d) => ({
      userId: d.userId ?? "",
      title: d.title ?? "",
      message: d.message ?? "",
      type: d.type ?? "exchange",
      relatedId: d.relatedId,
      isRead: d.isRead ?? false,
      createdAt: d.createdAt,
      senderId: d.senderId,
    }))
  },
}

// ============ UserWarning ============
export const userWarningConverter = {
  toFirestore(warning: Omit<UserWarning, "id">): DocumentData {
    const { id: _id, ...rest } = warning as UserWarning
    return rest
  },
  fromFirestore(snap: QueryDocumentSnapshot): UserWarning {
    return fromSnap<UserWarning>(snap, (d) => ({
      userId: d.userId ?? "",
      userEmail: d.userEmail ?? "",
      reason: d.reason ?? "",
      issuedBy: d.issuedBy ?? "",
      issuedByEmail: d.issuedByEmail ?? "",
      issuedAt: d.issuedAt,
      relatedReportId: d.relatedReportId,
      relatedItemId: d.relatedItemId,
      action: d.action ?? "WARNING",
      expiresAt: d.expiresAt,
      resolved: d.resolved ?? false,
      adminNote: d.adminNote,
    }))
  },
}

// ============ Draft ============
export const draftConverter = {
  toFirestore(draft: Omit<Draft, "id">): DocumentData {
    const { id: _id, ...rest } = draft as Draft
    return rest
  },
  fromFirestore(snap: QueryDocumentSnapshot): Draft {
    return fromSnap<Draft>(snap, (d) => ({
      userId: d.userId ?? "",
      type: d.type ?? "item",
      data: d.data ?? {},
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }))
  },
}

// ============ SupportTicket ============
export const supportTicketConverter = {
  toFirestore(ticket: Omit<SupportTicket, "id">): DocumentData {
    const { id: _id, ...rest } = ticket as SupportTicket
    return rest
  },
  fromFirestore(snap: QueryDocumentSnapshot): SupportTicket {
    return fromSnap<SupportTicket>(snap, (d) => ({
      subject: d.subject ?? "",
      category: d.category ?? "general",
      description: d.description ?? "",
      userId: d.userId ?? "",
      userEmail: d.userEmail ?? "",
      status: d.status ?? "new",
      priority: d.priority,
      adminReply: d.adminReply,
      repliedBy: d.repliedBy,
      repliedByEmail: d.repliedByEmail,
      repliedAt: d.repliedAt,
      messages: d.messages,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      resolvedAt: d.resolvedAt,
    }))
  },
}

// ============ SupportMessage ============
export const supportMessageConverter = {
  toFirestore(msg: Omit<SupportMessage, "id">): DocumentData {
    const { id: _id, ...rest } = msg as SupportMessage
    return rest
  },
  fromFirestore(snap: QueryDocumentSnapshot): SupportMessage {
    return fromSnap<SupportMessage>(snap, (d) => ({
      sender: d.sender ?? "user",
      senderEmail: d.senderEmail ?? "",
      content: d.content ?? "",
      createdAt: d.createdAt,
    }))
  },
}

// ============ AdminLog ============
export const adminLogConverter = {
  toFirestore(log: Omit<AdminLog, "id">): DocumentData {
    const { id: _id, ...rest } = log as AdminLog
    return rest
  },
  fromFirestore(snap: QueryDocumentSnapshot): AdminLog {
    return fromSnap<AdminLog>(snap, (d) => ({
      action: d.action ?? "case_created",
      adminId: d.adminId ?? "",
      adminEmail: d.adminEmail ?? "",
      targetType: d.targetType ?? "case",
      targetId: d.targetId ?? "",
      targetTitle: d.targetTitle,
      details: d.details,
      reason: d.reason ?? "",
      createdAt: d.createdAt,
    }))
  },
}

// ============ Case ============
export const caseConverter = {
  toFirestore(c: Omit<Case, "id">): DocumentData {
    const { id: _id, ...rest } = c as Case
    return rest
  },
  fromFirestore(snap: QueryDocumentSnapshot): Case {
    return fromSnap<Case>(snap, (d) => ({
      type: d.type ?? "item",
      targetId: d.targetId ?? "",
      targetTitle: d.targetTitle ?? "",
      targetOwnerId: d.targetOwnerId,
      targetOwnerEmail: d.targetOwnerEmail,
      status: d.status ?? "new",
      reportCount: d.reportCount ?? 0,
      reportIds: d.reportIds ?? [],
      priority: d.priority ?? 0,
      assignedTo: d.assignedTo,
      assignedToEmail: d.assignedToEmail,
      decision: d.decision,
      decisionNote: d.decisionNote,
      suspendDays: d.suspendDays,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      resolvedAt: d.resolvedAt,
      resolvedBy: d.resolvedBy,
      resolvedByEmail: d.resolvedByEmail,
    }))
  },
}
