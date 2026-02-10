import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  Timestamp,
  limit,
  startAfter,
  getCountFromServer,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { SupportTicket, SupportTicketStatus } from "@/types"
import { createNotification } from "./notifications"
import { createAdminLog } from "./logs"
import { authFetchJson } from "@/lib/api-client"

// ============ Support Ticket System ============
const isClient = typeof window !== "undefined"

type SupportTicketsApiPayload = {
  tickets?: SupportTicket[]
  lastId?: string | null
  hasMore?: boolean
  totalCount?: number
}

function normalizeSupportTickets(tickets: SupportTicket[]): SupportTicket[] {
  return tickets
}

export const createSupportTicket = async (
  ticketData: Omit<SupportTicket, "id" | "createdAt" | "updatedAt" | "status">
) => {
  if (isClient) {
    const res = await authFetchJson<{ ticketId?: string }>("/api/support", {
      method: "POST",
      body: {
        subject: ticketData.subject,
        category: ticketData.category,
        description: ticketData.description,
      },
    })
    const ticketId = res?.data?.ticketId
    if (!ticketId) throw new Error(res?.error || "ไม่สามารถสร้างคำร้องได้")
    return ticketId
  }

  const db = getFirebaseDb()
  const docRef = await addDoc(collection(db, "support_tickets"), {
    ...ticketData,
    status: "new" as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export const getSupportTickets = async (
  status?: SupportTicketStatus | SupportTicketStatus[],
  pageSize: number = 20,
  lastDoc: any = null
): Promise<{ tickets: SupportTicket[]; lastDoc: any; hasMore: boolean; totalCount: number }> => {
  if (isClient) {
    const params = new URLSearchParams()
    params.set("limit", String(pageSize))
    if (Array.isArray(status) && status.length > 0) {
      params.set("status", status.join(","))
    } else if (status) {
      params.set("status", String(status))
    }
    if (typeof lastDoc === "string" && lastDoc.length > 0) {
      params.set("cursor", lastDoc)
    }

    const res = await authFetchJson<SupportTicketsApiPayload>(`/api/admin/support?${params.toString()}`, {
      method: "GET",
    })

    const tickets = normalizeSupportTickets(res?.data?.tickets ?? [])
    return {
      tickets,
      lastDoc: res?.data?.lastId ?? null,
      hasMore: res?.data?.hasMore === true,
      totalCount: Number(res?.data?.totalCount ?? tickets.length),
    }
  }

  const db = getFirebaseDb()

  const constraints: any[] = [orderBy("createdAt", "desc")]

  if (status) {
    if (Array.isArray(status)) {
      constraints.unshift(where("status", "in", status))
    } else {
      constraints.unshift(where("status", "==", status))
    }
  }

  let totalCount = 0
  try {
    const countQ = query(
      collection(db, "support_tickets"),
      ...constraints.filter((c) => c.type !== "limit" && c.type !== "startAfter")
    )
    const countSnap = await getCountFromServer(countQ)
    totalCount = countSnap.data().count
  } catch (e) {
    console.warn("Count failed", e)
  }

  constraints.push(limit(pageSize))
  if (lastDoc) {
    constraints.push(startAfter(lastDoc))
  }

  const q = query(collection(db, "support_tickets"), ...constraints)
  const snapshot = await getDocs(q)
  const tickets = snapshot.docs.map((ticketDoc) => ({ id: ticketDoc.id, ...ticketDoc.data() }) as SupportTicket)
  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null

  return {
    tickets,
    lastDoc: lastVisible,
    hasMore: snapshot.docs.length === pageSize,
    totalCount,
  }
}

export const getUserSupportTickets = async (userId: string) => {
  if (isClient) {
    const res = await authFetchJson<{ tickets?: SupportTicket[] }>("/api/support", { method: "GET" })
    return normalizeSupportTickets(res?.data?.tickets ?? [])
  }
  const db = getFirebaseDb()
  const q = query(
    collection(db, "support_tickets"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((ticketDoc) => ({ id: ticketDoc.id, ...ticketDoc.data() }) as SupportTicket)
}

/** ตรวจว่าผู้ใช้มีคำร้องหรือไม่ (ใช้ใน navbar เพื่อแสดง/ซ่อนปุ่ม คำร้องของฉัน) */
export const userHasSupportTickets = async (userId: string): Promise<boolean> => {
  if (isClient) {
    try {
      const res = await authFetchJson<{ hasTickets?: boolean }>("/api/support?summary=hasTickets", { method: "GET" })
      return res?.data?.hasTickets === true
    } catch {
      return false
    }
  }
  const db = getFirebaseDb()
  const q = query(
    collection(db, "support_tickets"),
    where("userId", "==", userId),
    limit(1)
  )
  const snapshot = await getDocs(q)
  return !snapshot.empty
}

export const updateTicketStatus = async (
  ticketId: string,
  status: SupportTicketStatus,
  adminId?: string,
  adminEmail?: string
) => {
  if (isClient) {
    await authFetchJson(`/api/admin/support/${ticketId}/status`, {
      method: "PATCH",
      body: { status },
    })
    return
  }

  const db = getFirebaseDb()

  const updates: any = {
    status,
    updatedAt: serverTimestamp(),
  }

  if (status === "resolved" || status === "closed") {
    updates.resolvedAt = serverTimestamp()
  }

  await updateDoc(doc(db, "support_tickets", ticketId), updates)

  const ticketDoc = await getDoc(doc(db, "support_tickets", ticketId))
  const ticketData = ticketDoc.data() as SupportTicket

  const statusLabels: Record<SupportTicketStatus, string> = {
    new: "ใหม่",
    in_progress: "กำลังดำเนินการ",
    resolved: "ดำเนินการแล้ว",
    closed: "ปิด",
  }

  await createNotification({
    userId: ticketData.userId,
    title: "อัปเดตสถานะ Ticket",
    message: `Ticket "${ticketData.subject}" ถูกเปลี่ยนเป็น: ${statusLabels[status]}`,
    type: "support",
    relatedId: ticketId,
  })

  if (adminId && adminEmail) {
    await createAdminLog({
      actionType: "ticket_status_change",
      targetType: "ticket",
      targetId: ticketId,
      targetInfo: ticketData.subject,
      description: `เปลี่ยนสถานะ Ticket เป็น: ${statusLabels[status]}`,
      status: "success",
      metadata: { status, category: ticketData.category },
    })
  }
}

export const replyToTicket = async (
  ticketId: string,
  reply: string,
  adminId: string,
  adminEmail: string
) => {
  if (isClient) {
    await authFetchJson(`/api/admin/support/${ticketId}/reply`, {
      method: "POST",
      body: { reply },
    })
    return
  }

  const db = getFirebaseDb()

  const newMessage = {
    id: Date.now().toString(),
    sender: "admin",
    senderEmail: adminEmail,
    content: reply,
    createdAt: Timestamp.now(),
  }

  await updateDoc(doc(db, "support_tickets", ticketId), {
    adminReply: reply,
    messages: arrayUnion(newMessage),
    repliedBy: adminId,
    repliedByEmail: adminEmail,
    repliedAt: serverTimestamp(),
    status: "in_progress",
    updatedAt: serverTimestamp(),
  })

  const ticketDoc = await getDoc(doc(db, "support_tickets", ticketId))
  const ticketData = ticketDoc.data() as SupportTicket
  const replyPreview = reply.length > 300 ? `${reply.slice(0, 300).trim()}...` : reply

  await createNotification({
    userId: ticketData.userId,
    title: "ได้รับการตอบกลับจาก Support",
    message: `[${ticketData.subject}]\n\n${replyPreview}`,
    type: "support",
    relatedId: ticketId,
  })

  await createAdminLog({
    actionType: "ticket_reply",
    targetType: "ticket",
    targetId: ticketId,
    targetInfo: ticketData.subject,
    description: `ตอบกลับ Ticket: ${reply.substring(0, 100)}${reply.length > 100 ? "..." : ""}`,
    status: "success",
    metadata: { category: ticketData.category },
  })
}

export const userReplyToTicket = async (
  ticketId: string,
  reply: string,
  userEmail: string
) => {
  if (isClient) {
    await authFetchJson(`/api/support/${ticketId}/messages`, {
      method: "POST",
      body: { message: reply },
    })
    return
  }

  const db = getFirebaseDb()

  const newMessage = {
    id: Date.now().toString(),
    sender: "user",
    senderEmail: userEmail,
    content: reply,
    createdAt: Timestamp.now(),
  }

  await updateDoc(doc(db, "support_tickets", ticketId), {
    messages: arrayUnion(newMessage),
    status: "new",
    updatedAt: serverTimestamp(),
  })
}
