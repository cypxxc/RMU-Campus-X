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
  getCountFromServer
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { SupportTicket, SupportTicketStatus } from "@/types"
import { createNotification } from "./notifications"
import { createAdminLog } from "./logs"

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
  const adminEmails = new Set(adminsSnapshot.docs.map(doc => doc.data().email))
  const notifiedUserIds = new Set<string>()

  const notifyPromises = Array.from(adminEmails).map(async (email) => {
    // Get admin user ID from users collection by email
    const usersQuery = query(collection(db, "users"), where("email", "==", email))
    const usersSnapshot = await getDocs(usersQuery)
    
    if (!usersSnapshot.empty && usersSnapshot.docs[0]) {
      const adminUserId = usersSnapshot.docs[0].data().uid
      
      // Prevent duplicate notifications if multiple emails map to same UID (unlikely but safe)
      if (!notifiedUserIds.has(adminUserId)) {
        notifiedUserIds.add(adminUserId)
        
        await createNotification({
          userId: adminUserId,
          title: "📩 Support Ticket ใหม่",
          message: `"${ticketData.subject}" จาก ${ticketData.userEmail}`,
          type: "support",
          relatedId: docRef.id,
        })
      }
    }
  })
  
  await Promise.all(notifyPromises)
  
  return docRef.id
}

// Imports update already done in file? No, need to check imports.
// Wait, I need to add 'limit', 'startAfter', 'getCountFromServer' to imports if not present.
// The previous view_file showed imports.

export const getSupportTickets = async (
  status?: SupportTicketStatus | SupportTicketStatus[],
  pageSize: number = 20,
  lastDoc: any = null
): Promise<{ tickets: SupportTicket[]; lastDoc: any; hasMore: boolean; totalCount: number }> => {
  const db = getFirebaseDb()
  
  // Base constraints
  const constraints: any[] = [orderBy("createdAt", "desc")]
  
  if (status) {
    if (Array.isArray(status)) {
       constraints.unshift(where("status", "in", status))
    } else {
       constraints.unshift(where("status", "==", status))
    }
  }
  
  // 1. Get Count
  let totalCount = 0
  try {
     const countQ = query(collection(db, "support_tickets"), ...constraints.filter(c => c.type !== 'limit' && c.type !== 'startAfter')) 
     const countSnap = await getCountFromServer(countQ)
     totalCount = countSnap.data().count
  } catch (e) {
     console.warn("Count failed", e)
  }

  // 2. Add Pagination
  constraints.push(limit(pageSize))
  if (lastDoc) {
    constraints.push(startAfter(lastDoc))
  }

  const q = query(collection(db, "support_tickets"), ...constraints)
  
  const snapshot = await getDocs(q)
  const tickets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SupportTicket)
  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null
  
  return {
    tickets,
    lastDoc: lastVisible,
    hasMore: snapshot.docs.length === pageSize,
    totalCount
  }
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

  // Log admin action (only if admin is making the change)
  if (adminId && adminEmail) {
    await createAdminLog({
      actionType: 'ticket_status_change',
      targetType: 'ticket',
      targetId: ticketId,
      targetInfo: ticketData.subject,
      description: `เปลี่ยนสถานะ Ticket เป็น: ${statusLabels[status]}`,
      status: 'success',
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
    targetType: 'ticket',
    targetId: ticketId,
    targetInfo: ticketData.subject,
    description: `ตอบกลับ Ticket: ${reply.substring(0, 100)}${reply.length > 100 ? '...' : ''}`,
    status: 'success',
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
