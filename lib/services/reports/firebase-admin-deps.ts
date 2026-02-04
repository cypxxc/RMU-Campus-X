import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import type { User } from "@/types"
import { notifyAdminsNewReport } from "@/lib/line"
import type { AdminNotificationInput, ReportCreateDeps } from "@/lib/services/reports/types"

const toString = (value: unknown): string => (typeof value === "string" ? value : "")

/** Remove undefined values so Firestore accepts the document */
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    out[k] = v
  }
  return out
}

export function createFirebaseAdminReportDeps(): ReportCreateDeps {
  const db = getAdminDb()

  return {
    getItemById: async (id: string) => {
      const snap = await db.collection("items").doc(id).get()
      return snap.exists ? (snap.data() as Record<string, unknown>) : null
    },
    getExchangeById: async (id: string) => {
      const snap = await db.collection("exchanges").doc(id).get()
      return snap.exists ? (snap.data() as Record<string, unknown>) : null
    },
    getUserById: async (id: string) => {
      const snap = await db.collection("users").doc(id).get()
      return snap.exists ? (snap.data() as Record<string, unknown>) : null
    },
    createReport: async (data: Record<string, unknown>) => {
      const dataToSave = stripUndefined({
        ...data,
        status: data.status || "new",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      } as Record<string, unknown>)
      const docRef = await db.collection("reports").add(dataToSave)
      return docRef.id
    },
    listAdminEmails: async () => {
      const adminsSnapshot = await db.collection("admins").get()
      return adminsSnapshot.docs
        .map(doc => toString(doc.data().email))
        .filter(email => email.length > 0)
    },
    findUserIdByEmail: async (email: string) => {
      const usersSnapshot = await db.collection("users")
        .where("email", "==", email)
        .get()
      if (usersSnapshot.empty) return null
      const data = usersSnapshot.docs[0]!.data()
      const userId = toString(data.uid)
      return userId || null
    },
    createNotification: async (data: AdminNotificationInput) => {
      await db.collection("notifications").add({
        ...data,
        isRead: data.isRead ?? false,
        createdAt: FieldValue.serverTimestamp(),
      })
    },
    getAdminLineUserIds: async () => {
      const adminsSnapshot = await db.collection("admins").get()
      const adminEmails = adminsSnapshot.docs
        .map(doc => toString(doc.data().email))
        .filter(email => email.length > 0)

      if (adminEmails.length === 0) return []

      const lineUserIds: string[] = []

      for (const email of adminEmails) {
        const usersSnapshot = await db.collection("users")
          .where("email", "==", email)
          .get()

        if (!usersSnapshot.empty) {
          const userData = usersSnapshot.docs[0]!.data() as User
          const enabled = userData.lineNotifications?.enabled !== false
          if (userData.lineUserId && enabled) {
            lineUserIds.push(userData.lineUserId)
          }
        }
      }

      return lineUserIds
    },
    notifyAdminsNewReport,
  }
}
