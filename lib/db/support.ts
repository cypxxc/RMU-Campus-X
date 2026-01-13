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
  Timestamp
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

export const getSupportTickets = async (status?: SupportTicketStatus) => {
  const db = getFirebaseDb()
  
  let q
  if (status) {
    q = query(
      collection(db, "support_tickets"),
      where("status", "==", status),
      orderBy("createdAt", "desc")
    )
  } else {
    q = query(
      collection(db, "support_tickets"),
      orderBy("createdAt", "desc")
    )
  }
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SupportTicket)
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

  // Log admin action (only if admin info is provided)
  if (adminId && adminEmail) {
    await createAdminLog({
      actionType: 'ticket_status_change',
      adminId,
      adminEmail,
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
    adminId,
    adminEmail,
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
