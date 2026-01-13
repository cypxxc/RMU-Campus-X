import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { Exchange, ExchangeStatus } from "@/types"
import { apiCall, TIMEOUT_CONFIG, type ApiResponse } from "@/lib/api-wrapper"
import { createNotification } from "./notifications"

// Exchanges
export const createExchange = async (exchangeData: Omit<Exchange, "id" | "createdAt" | "updatedAt">) => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      
      const result = await runTransaction(db, async (transaction) => {
        // 1. Check item availability
        const itemRef = doc(db, "items", exchangeData.itemId)
        const itemDoc = await transaction.get(itemRef)
        
        if (!itemDoc.exists()) {
          throw new Error("Item not found")
        }
        
        const item = itemDoc.data() as any
        if (item.status !== "available") {
          throw new Error(`Item is no longer available (status: ${item.status})`)
        }
        
        // 2. Create Exchange
        const newExchangeRef = doc(collection(db, "exchanges"))
        transaction.set(newExchangeRef, {
          ...exchangeData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        
        // 3. Update Item Status
        transaction.update(itemRef, {
          status: "pending",
          updatedAt: serverTimestamp()
        })
        
        return newExchangeRef.id
      })

      // 4. Notify (outside transaction)
      try {
        await createNotification({
          userId: exchangeData.ownerId,
          title: "มีคำขอใหม่",
          message: `มีผู้ขอแลกเปลี่ยน "${exchangeData.itemTitle}" ของคุณ`,
          type: "exchange",
          relatedId: result
        })
      } catch (error) {
        console.error("[createExchange] Notification failed:", error)
        // Consume error so it doesn't fail the transaction result
      }

      return result
    },
    'createExchange',
    TIMEOUT_CONFIG.STANDARD
  )
}

export const getExchangesByUser = async (userId: string) => {
  const db = getFirebaseDb()
  const q = query(collection(db, "exchanges"), where("requesterId", "==", userId), orderBy("createdAt", "desc"))

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Exchange)
}

export const getExchangeById = async (id: string): Promise<ApiResponse<Exchange | null>> => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      const docRef = doc(db, "exchanges", id)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        return null
      }
      
      return { id: docSnap.id, ...docSnap.data() } as Exchange
    },
    'getExchangeById',
    TIMEOUT_CONFIG.QUICK
  )
}

export const updateExchange = async (id: string, data: Partial<Exchange>) => {
  const db = getFirebaseDb()
  const docRef = doc(db, "exchanges", id)
  
  // Get current data to check status change
  const currentDoc = await getDoc(docRef)
  const currentData = currentDoc.data() as Exchange
  
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })

// Notify on status change
  if (data.status && data.status !== currentData.status) {
    let title = ""
    let message = ""
    let targetUserId = currentData.requesterId

    if (data.status === 'accepted') {
      title = "รับคำขอแล้ว"
      message = `เจ้าของสิ่งของ "ตกลง" แลกเปลี่ยน "${currentData.itemTitle}" กับคุณแล้ว`
    } else if (data.status === 'rejected') {
      title = "คำขอถูกปฏิเสธ"
      message = `เสียใจด้วย เจ้าของสิ่งของ "ปฏิเสธ" คำขอแลกเปลี่ยน "${currentData.itemTitle}"`
    }

    if (title && message) {
      await createNotification({
        userId: targetUserId,
        title,
        message,
        type: "exchange",
        relatedId: id
      })
    }
  }
}

/**
 * Atomically confirm an exchange and check for completion
 */
export const confirmExchange = async (exchangeId: string, role: 'owner' | 'requester'): Promise<ApiResponse<{ status: ExchangeStatus }>> => {
  return apiCall(
    async () => {
      const db = getFirebaseDb()
      const exchangeRef = doc(db, "exchanges", exchangeId)

      const result = await runTransaction(db, async (transaction) => {
        // 1. Read exchange
        const exchangeDoc = await transaction.get(exchangeRef)
        if (!exchangeDoc.exists()) throw new Error("Exchange not found")
        
        const exchange = exchangeDoc.data() as Exchange
        
        // Guard: Only allow confirmation if status is acceptable
        if (!['in_progress', 'accepted'].includes(exchange.status)) {
            throw new Error(`Cannot confirm exchange in status: ${exchange.status}`)
        }
        
        // 2. Update confirmation status
        const updates: Partial<Exchange> = {
          updatedAt: serverTimestamp() as any
        }
        
        let ownerConfirmed = exchange.ownerConfirmed
        let requesterConfirmed = exchange.requesterConfirmed

        if (role === 'owner') {
          updates.ownerConfirmed = true
          ownerConfirmed = true
        } else {
          updates.requesterConfirmed = true
          requesterConfirmed = true
        }

        // 3. Check if both confirmed
        let newStatus = exchange.status
        if (ownerConfirmed && requesterConfirmed) {
          updates.status = 'completed'
          newStatus = 'completed'
          
          // Update ITEM status to completed
          const itemRef = doc(db, "items", exchange.itemId)
          transaction.update(itemRef, { 
            status: 'completed',
            updatedAt: serverTimestamp()
          })
        }

        transaction.update(exchangeRef, updates)
        return { status: newStatus, exchange }
      })

      // 4. Send notifications (outside transaction to avoid complex logic inside)
      if (result.status === 'completed') {
        // Notify Owner
        await createNotification({
          userId: result.exchange.ownerId,
          title: "การแลกเปลี่ยนเสร็จสิ้น",
          message: `การแลกเปลี่ยน "${result.exchange.itemTitle}" สำเร็จเรียบร้อยแล้ว!`,
          type: "exchange",
          relatedId: exchangeId
        })
        
        // Notify Requester
        await createNotification({
          userId: result.exchange.requesterId,
          title: "การแลกเปลี่ยนเสร็จสิ้น",
          message: `การแลกเปลี่ยน "${result.exchange.itemTitle}" สำเร็จเรียบร้อยแล้ว!`,
          type: "exchange",
          relatedId: exchangeId
        })
      }

      return { status: result.status }
    },
    'confirmExchange',
    TIMEOUT_CONFIG.STANDARD
  )
}

export const cancelExchange = async (
  exchangeId: string,
  _itemId: string, // Kept for signature compatibility
  userId: string,
  reason?: string,
) => {
  return apiCall(
    async () => {
      const response = await fetch("/api/exchanges/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchangeId, userId, reason })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to cancel exchange")
      }
    },
    'cancelExchange',
    TIMEOUT_CONFIG.STANDARD
  )
}

export const deleteExchange = async (exchangeId: string) => {
  const db = getFirebaseDb()

  console.log("[deleteExchange] Starting deletion:", exchangeId)

  // Delete all chat messages for this exchange
  console.log("[deleteExchange] Deleting chat messages...")
  const messagesQuery = query(collection(db, "chatMessages"), where("exchangeId", "==", exchangeId))
  const messagesSnapshot = await getDocs(messagesQuery)

  console.log("[deleteExchange] Found chat messages:", messagesSnapshot.docs.length)

  // Delete messages in batch
  const deletePromises = messagesSnapshot.docs.map((doc) => deleteDoc(doc.ref))
  await Promise.all(deletePromises)

  console.log("[deleteExchange] Chat messages deleted")

  // Delete the exchange
  console.log("[deleteExchange] Deleting exchange...")
  await deleteDoc(doc(db, "exchanges", exchangeId))

  console.log("[deleteExchange] Exchange deleted successfully")
}
