/**
 * Client-side Firestore service layer
 * แยก Logic ออกจาก UI: Component ต้องไม่เรียก getDocs/getDoc/onSnapshot ตรงๆ
 * เมื่อ Firebase อัปเดตเวอร์ชัน แก้โค้ดแค่ที่เดียว
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import type { ChatMessage } from "@/types"

// ============ Admin ============

/**
 * ตรวจสอบว่า email นี้เป็นแอดมินหรือไม่ (จาก collection admins)
 */
export async function checkIsAdmin(userEmail: string | null | undefined): Promise<boolean> {
  if (!userEmail) return false
  const db = getFirebaseDb()
  const q = query(collection(db, "admins"), where("email", "==", userEmail))
  const snapshot = await getDocs(q)
  return !snapshot.empty
}

// ============ Get document by ID (for admin reports etc.) ============

/**
 * ดึง document เดียวตาม collection และ id
 * คืนค่า data ของ document หรือ null ถ้าไม่มี
 */
export async function getDocById(
  collectionName: "users" | "items" | "exchanges" | "support_tickets" | "reports",
  id: string
): Promise<Record<string, unknown> | null> {
  const db = getFirebaseDb()
  const snap = await getDoc(doc(db, collectionName, id))
  if (!snap.exists()) return null
  const data = snap.data()
  return data as Record<string, unknown>
}

// ============ Chat (real-time) ============

function toIso(v: unknown): string | undefined {
  if (v && typeof (v as { toDate?: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().toISOString()
  }
  return undefined
}

/**
 * Subscribe ข้อความแชท real-time
 * @returns ฟังก์ชันยกเลิกการ subscribe
 */
export function subscribeToChatMessages(
  exchangeId: string,
  pageSize: number,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: () => void
): () => void {
  const db = getFirebaseDb()
  const q = query(
    collection(db, "chatMessages"),
    where("exchangeId", "==", exchangeId),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  )
  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const list: ChatMessage[] = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          exchangeId: data.exchangeId as string,
          senderId: data.senderId as string,
          senderEmail: (data.senderEmail ?? "") as string,
          message: (data.message ?? "") as string,
          createdAt: (toIso(data.createdAt) ?? new Date().toISOString()) as unknown as ChatMessage["createdAt"],
          imageUrl: (data.imageUrl ?? null) as ChatMessage["imageUrl"],
          imageType: (data.imageType ?? null) as ChatMessage["imageType"],
          readAt: data.readAt != null ? (toIso(data.readAt) as unknown as ChatMessage["readAt"]) : undefined,
          updatedAt: data.updatedAt != null ? (toIso(data.updatedAt) as unknown as ChatMessage["updatedAt"]) : undefined,
        }
      })
      const ordered = [...list].reverse()
      onUpdate(ordered)
    },
    () => {
      onError?.()
    }
  )
  return () => unsub()
}

/**
 * อัปเดตสถานะกำลังพิมพ์ (typing) ในแชท
 */
export function setChatTyping(
  exchangeId: string,
  key: "ownerTypingAt" | "requesterTypingAt",
  value: boolean
): void {
  const db = getFirebaseDb()
  setDoc(
    doc(db, "chatTyping", exchangeId),
    { [key]: value ? serverTimestamp() : null },
    { merge: true }
  ).catch(() => {})
}

/**
 * Subscribe สถานะกำลังพิมพ์ของอีกฝั่ง
 * @param otherKey คีย์ของอีกฝั่ง (ownerTypingAt หรือ requesterTypingAt)
 * @returns ฟังก์ชันยกเลิกการ subscribe
 */
export function subscribeToChatTyping(
  exchangeId: string,
  otherKey: "ownerTypingAt" | "requesterTypingAt",
  onTypingChange: (typing: boolean) => void,
  onError?: () => void
): () => void {
  const db = getFirebaseDb()
  const unsub = onSnapshot(
    doc(db, "chatTyping", exchangeId),
    (snap) => {
      if (!snap.exists()) {
        onTypingChange(false)
        return
      }
      const data = snap.data()
      const t = data?.[otherKey]
      const millis =
        t && typeof (t as { toMillis?: () => number }).toMillis === "function"
          ? (t as { toMillis: () => number }).toMillis()
          : 0
      onTypingChange(millis > 0 && Date.now() - millis < 5000)
    },
    () => {
      onError?.()
    }
  )
  return () => unsub()
}
