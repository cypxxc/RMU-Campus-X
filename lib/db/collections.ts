/**
 * Typed Firestore Collections - ใช้ withConverter() สำหรับ type-safe access
 * Import จากไฟล์นี้แทน db.collection("items") โดยตรง
 */

import { getAdminDb } from "@/lib/firebase-admin"
import {
  itemConverter,
  userConverter,
  exchangeConverter,
  chatMessageConverter,
  reportConverter,
  announcementConverter,
  appNotificationConverter,
  userWarningConverter,
  draftConverter,
  supportTicketConverter,
  supportMessageConverter,
  adminLogConverter,
  caseConverter,
} from "./converters"

/** ดึง collection พร้อม converter สำหรับ type-safe read/write */
export function itemsCollection() {
  return getAdminDb().collection("items").withConverter(itemConverter)
}

export function usersCollection() {
  return getAdminDb().collection("users").withConverter(userConverter)
}

export function exchangesCollection() {
  return getAdminDb().collection("exchanges").withConverter(exchangeConverter)
}

export function chatMessagesCollection(exchangeId: string) {
  return getAdminDb()
    .collection("exchanges")
    .doc(exchangeId)
    .collection("chatMessages")
    .withConverter(chatMessageConverter)
}

export function reportsCollection() {
  return getAdminDb().collection("reports").withConverter(reportConverter)
}

export function announcementsCollection() {
  return getAdminDb().collection("announcements").withConverter(announcementConverter)
}

export function notificationsCollection() {
  return getAdminDb().collection("notifications").withConverter(appNotificationConverter)
}

export function userWarningsCollection() {
  return getAdminDb().collection("userWarnings").withConverter(userWarningConverter)
}

export function draftsCollection() {
  return getAdminDb().collection("drafts").withConverter(draftConverter)
}

export function supportTicketsCollection() {
  return getAdminDb().collection("support_tickets").withConverter(supportTicketConverter)
}

export function supportMessagesCollection(ticketId: string) {
  return getAdminDb()
    .collection("support_tickets")
    .doc(ticketId)
    .collection("messages")
    .withConverter(supportMessageConverter)
}

export function adminLogsCollection() {
  return getAdminDb().collection("adminLogs").withConverter(adminLogConverter)
}

export function casesCollection() {
  return getAdminDb().collection("cases").withConverter(caseConverter)
}

/** Collections ที่ยังไม่มี typed converter (ใช้ raw access) */
export function adminsCollection() {
  return getAdminDb().collection("admins")
}
