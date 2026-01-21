// ============================================================
// Firebase Admin Dependencies (SOLID: Dependency Inversion)
// Concrete implementations for admin service interfaces
// ============================================================

import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import type {
  UserData,
  UserStatusUpdateDeps,
  WarningIssueDeps,
  AuditLogInput,
  NotificationInput,
  WarningRecordInput,
} from "@/lib/services/admin/types"

// Helper to convert Firestore data to UserData
function toUserData(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined
): UserData | null {
  if (!data) return null
  return {
    uid: id,
    email: data.email,
    status: data.status,
    warningCount: data.warningCount,
    suspendedUntil: data.suspendedUntil?.toDate?.() ?? data.suspendedUntil,
    bannedReason: data.bannedReason,
    restrictions: data.restrictions,
    lastWarningDate: data.lastWarningDate?.toDate?.() ?? data.lastWarningDate,
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
  }
}

/**
 * Create dependencies for UserStatusUpdate service using Firebase Admin SDK
 */
export function createUserStatusDeps(): UserStatusUpdateDeps {
  const db = getAdminDb()

  return {
    async getUserById(id: string): Promise<UserData | null> {
      const doc = await db.collection("users").doc(id).get()
      return doc.exists ? toUserData(id, doc.data()) : null
    },

    async createUser(id: string, data: Partial<UserData>): Promise<void> {
      await db
        .collection("users")
        .doc(id)
        .set({
          uid: id,
          ...data,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
    },

    async updateUser(id: string, data: Partial<UserData>): Promise<void> {
      await db
        .collection("users")
        .doc(id)
        .update({
          ...data,
          updatedAt: FieldValue.serverTimestamp(),
        })
    },

    async createAuditLog(log: AuditLogInput): Promise<void> {
      await db.collection("adminLogs").add({
        ...log,
        createdAt: FieldValue.serverTimestamp(),
      })
    },

    async createNotification(notif: NotificationInput): Promise<void> {
      await db.collection("notifications").add({
        ...notif,
        createdAt: FieldValue.serverTimestamp(),
        isRead: notif.isRead ?? false,
      })
    },

    async createWarningRecord(warning: WarningRecordInput): Promise<void> {
      await db.collection("userWarnings").add({
        ...warning,
        issuedAt: FieldValue.serverTimestamp(),
        resolved: warning.resolved ?? false,
      })
    },
  }
}

/**
 * Create dependencies for WarningIssue service using Firebase Admin SDK
 */
export function createWarningIssueDeps(): WarningIssueDeps {
  const db = getAdminDb()

  return {
    async getUserById(id: string): Promise<UserData | null> {
      const doc = await db.collection("users").doc(id).get()
      return doc.exists ? toUserData(id, doc.data()) : null
    },

    async updateUser(id: string, data: Partial<UserData>): Promise<void> {
      await db
        .collection("users")
        .doc(id)
        .update({
          ...data,
          updatedAt: FieldValue.serverTimestamp(),
        })
    },

    async createAuditLog(log: AuditLogInput): Promise<void> {
      await db.collection("adminLogs").add({
        ...log,
        createdAt: FieldValue.serverTimestamp(),
      })
    },

    async createNotification(notif: NotificationInput): Promise<void> {
      await db.collection("notifications").add({
        ...notif,
        createdAt: FieldValue.serverTimestamp(),
        isRead: notif.isRead ?? false,
      })
    },

    async createWarningRecord(warning: WarningRecordInput): Promise<void> {
      await db.collection("userWarnings").add({
        ...warning,
        issuedAt: FieldValue.serverTimestamp(),
        resolved: warning.resolved ?? false,
      })
    },
  }
}
