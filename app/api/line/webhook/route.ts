/**
 * LINE Webhook API Route
 * เชื่อมบัญชีอัตโนมัติด้วยอีเมล (ใช้ Firebase REST API)
 */

import { NextRequest, NextResponse } from "next/server"
import { verifySignature, sendReplyMessage, sendLinkCodeMessage, sendPushMessage } from "@/lib/line"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

interface LineEvent {
  type: string
  replyToken: string
  source: {
    type: string
    userId: string
  }
  message?: {
    type: string
    text: string
  }
}

interface LineWebhookBody {
  events: LineEvent[]
}

type FirestoreQueryResult = {
  id: string
  path: string
  data: FirebaseFirestore.DocumentData
}

async function firestoreQueryOne(
  collectionPath: string,
  field: string,
  value: string
): Promise<FirestoreQueryResult | null> {
  const db = getAdminDb()
  const snapshot = await db
    .collection(collectionPath)
    .where(field, "==", value)
    .limit(1)
    .get()

  if (snapshot.empty) return null

  const doc = snapshot.docs[0]!
  return { id: doc.id, path: `${collectionPath}/${doc.id}`, data: doc.data() }
}

async function firestoreUpdate(documentPath: string, fields: Record<string, unknown>) {
  const db = getAdminDb()
  console.log("[LINE Webhook] Updating:", documentPath, "with fields:", Object.keys(fields))
  await db.doc(documentPath).set(fields, { merge: true })
  console.log("[LINE Webhook] Update success!")
}

// ============ LINE Chat Relay (แชทระหว่างผู้โพส-ผู้รับผ่านบอท) ============
const CHAT_SESSION_TIMEOUT_MS = 30 * 60 * 1000   // 30 นาที
const LIST_CHOICE_TIMEOUT_MS = 2 * 60 * 1000    // 2 นาที (เลือกรายการ)

const LINE_CHAT_SESSIONS = "lineChatSessions"

type ChatSession = {
  exchangeId?: string
  exchangeIds?: string[]
  listSentAt?: Timestamp
  updatedAt?: Timestamp
}

function timestampToMs(t?: Timestamp): number | null {
  if (!t) return null
  if (typeof (t as { toDate?: () => Date }).toDate === "function") return (t as Timestamp).toDate().getTime()
  if (typeof (t as unknown as { _seconds?: number })._seconds === "number") return (t as unknown as { _seconds: number })._seconds * 1000
  if (typeof (t as { seconds?: number }).seconds === "number") return (t as { seconds: number }).seconds * 1000
  return null
}

async function getChatSession(lineUserId: string): Promise<ChatSession | null> {
  const db = getAdminDb()
  const docRef = await db.collection(LINE_CHAT_SESSIONS).doc(lineUserId).get()
  if (!docRef.exists) return null
  const data = docRef.data() as ChatSession
  const now = Date.now()
  if (data.exchangeId && data.updatedAt) {
    const updatedAt = timestampToMs(data.updatedAt)
    if (updatedAt != null && now - updatedAt > CHAT_SESSION_TIMEOUT_MS) {
      await docRef.ref.update({ exchangeId: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() })
      return { ...data, exchangeId: undefined }
    }
  }
  if (data.exchangeIds && data.listSentAt) {
    const listSentAt = timestampToMs(data.listSentAt)
    if (listSentAt != null && now - listSentAt > LIST_CHOICE_TIMEOUT_MS) {
      await docRef.ref.update({ exchangeIds: FieldValue.delete(), listSentAt: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() })
      return { ...data, exchangeIds: undefined, listSentAt: undefined }
    }
  }
  return data
}

async function setChatSession(lineUserId: string, fields: Record<string, unknown>) {
  const db = getAdminDb()
  await db.collection(LINE_CHAT_SESSIONS).doc(lineUserId).set(
    { ...fields, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  )
}

async function clearChatSession(lineUserId: string) {
  const db = getAdminDb()
  const ref = db.collection(LINE_CHAT_SESSIONS).doc(lineUserId)
  const snap = await ref.get()
  if (snap.exists) {
    await ref.update({
      exchangeId: FieldValue.delete(),
      exchangeIds: FieldValue.delete(),
      listSentAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
}

async function getUserIdByLineUserId(lineUserId: string): Promise<string | null> {
  const r = await firestoreQueryOne("users", "lineUserId", lineUserId)
  return r ? r.id : null
}

async function getActiveExchangesForUser(userId: string): Promise<Array<{ id: string; itemTitle: string; otherDisplayName: string }>> {
  const db = getAdminDb()
  const [ownerSnap, requesterSnap] = await Promise.all([
    db.collection("exchanges").where("ownerId", "==", userId).get(),
    db.collection("exchanges").where("requesterId", "==", userId).get(),
  ])
  const statusOk = (s: string) => s !== "cancelled" && s !== "rejected"
  const list: Array<{ id: string; itemTitle: string; ownerId: string; requesterId: string }> = []
  ownerSnap.docs.forEach((d) => {
    const d2 = d.data()
    if (statusOk((d2.status as string) || "")) list.push({ id: d.id, itemTitle: (d2.itemTitle as string) || "", ownerId: d2.ownerId as string, requesterId: d2.requesterId as string })
  })
  requesterSnap.docs.forEach((d) => {
    const d2 = d.data()
    if (statusOk((d2.status as string) || "")) {
      const id = d.id
      if (!list.some((x) => x.id === id)) list.push({ id, itemTitle: (d2.itemTitle as string) || "", ownerId: d2.ownerId as string, requesterId: d2.requesterId as string })
    }
  })
  const slice = list.slice(0, 9)
  const otherIds = slice.map((ex) => (ex.ownerId === userId ? ex.requesterId : ex.ownerId))
  const userSnaps = await Promise.all(otherIds.map((id) => db.collection("users").doc(id).get()))
  return slice.map((ex, i) => {
    const userDoc = userSnaps[i]
    const name: string = userDoc?.exists ? ((userDoc.data()?.displayName as string) || (userDoc.data()?.email as string) || "ผู้ใช้").split("@")[0] ?? "ผู้ใช้" : "ผู้ใช้"
    return { id: ex.id, itemTitle: ex.itemTitle, otherDisplayName: name }
  })
}

async function getExchangeOtherParty(exchangeId: string, currentUserId: string): Promise<{ lineUserId: string; displayName: string; itemTitle: string } | null> {
  const db = getAdminDb()
  const exDoc = await db.collection("exchanges").doc(exchangeId).get()
  if (!exDoc.exists) return null
  const d = exDoc.data()!
  const ownerId = d.ownerId as string
  const requesterId = d.requesterId as string
  const itemTitle = (d.itemTitle as string) || "รายการ"
  const otherId = ownerId === currentUserId ? requesterId : ownerId
  const userDoc = await db.collection("users").doc(otherId).get()
  if (!userDoc.exists) return null
  const u = userDoc.data()!
  const lineUserId = u.lineUserId as string | undefined
  if (!lineUserId) return null
  const displayName = (u.displayName as string) || (u.email as string) || "ผู้ใช้"
  return { lineUserId: lineUserId as string, displayName: displayName.split("@")[0] ?? "ผู้ใช้", itemTitle }
}

export async function POST(request: NextRequest) {
  console.log("[LINE Webhook] Received request")
  
  try {
    const body = await request.text()
    const signature = request.headers.get("x-line-signature")

    console.log("[LINE Webhook] Signature present:", !!signature)
    console.log("[LINE Webhook] Body length:", body.length)

    if (!signature) {
      console.error("[LINE Webhook] Missing signature header")
      return NextResponse.json({ error: "Missing signature" }, { status: 401 })
    }

    const isValid = await verifySignature(body, signature)
    console.log("[LINE Webhook] Signature verification result:", isValid)
    
    if (!isValid) {
      console.error("[LINE Webhook] Invalid signature - check LINE_CHANNEL_SECRET env var")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const data: LineWebhookBody = JSON.parse(body)
    console.log("[LINE Webhook] Events count:", data.events.length)

    for (const event of data.events) {
      console.log("[LINE Webhook] Processing event:", event.type, "from:", event.source?.userId?.substring(0, 10) + "...")
      
      if (event.type === "follow") {
        console.log("[LINE Webhook] Handling follow event")
        const result = await sendReplyMessage(event.replyToken, [
          {
            type: "text",
            text: `สวัสดี! 👋 ยินดีต้อนรับสู่ RMU-Campus X Notification

📧 พิมพ์อีเมลของคุณเพื่อเชื่อมบัญชี
(ตัวอย่าง: student@rmu.ac.th)`,
          },
        ])
        console.log("[LINE Webhook] Follow reply result:", result)
      } else if (event.type === "message" && event.message?.type === "text") {
        console.log("[LINE Webhook] Handling text message:", event.message.text?.substring(0, 30))
        await handleTextMessage(event)
      }
    }

    console.log("[LINE Webhook] Completed successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[LINE Webhook] Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

async function handleTextMessage(event: LineEvent) {
  const raw = (event.message?.text || "").replace(/^\uFEFF/, "").trim()
  const text = raw.normalize("NFC")
  const lineUserId = event.source.userId

  try {
    // ========== แชท (ตรวจก่อนคำสั่งอื่น เพื่อให้จับ "แชท" ได้เสมอ) ==========
    const wantChat =
      text === "แชท" ||
      text.toLowerCase() === "chat" ||
      /^แชท\s*$/.test(text) ||
      (text.length <= 20 && text.includes("แชท") && !text.includes("@"))
    if (wantChat) {
      try {
        console.log("[LINE Webhook] Chat command from:", lineUserId?.slice(0, 8), "text length:", text.length)
        const userId = await getUserIdByLineUserId(lineUserId)
        if (!userId) {
          await sendReplyMessage(event.replyToken, [
            { type: "text", text: "❌ ยังไม่ได้เชื่อมบัญชี\n\n📧 พิมพ์อีเมล @rmu.ac.th เพื่อเชื่อมบัญชีก่อน" },
          ])
          return
        }
        const exchanges = await getActiveExchangesForUser(userId)
        if (exchanges.length === 0) {
          await sendReplyMessage(event.replyToken, [
            { type: "text", text: "📭 ไม่มีรายการแลกเปลี่ยนที่กำลังดำเนินการ\n\nเมื่อมีคนขอรับของ หรือคุณขอรับของคนอื่น จะแสดงรายการให้เลือกแชทได้ที่นี่" },
          ])
          return
        }
        const exchangeIds = exchanges.map((e) => e.id)
        await setChatSession(lineUserId, { exchangeIds, listSentAt: FieldValue.serverTimestamp() })
        const listText = exchanges.map((e, i) => `${i + 1}. ${e.itemTitle} กับ ${e.otherDisplayName}`).join("\n")
        await sendReplyMessage(event.replyToken, [
          {
            type: "text",
            text: `💬 เลือกรายการที่ต้องการแชท\n\n${listText}\n\nพิมพ์เลข 1-${exchanges.length} เพื่อเริ่มแชท`,
          },
        ])
        console.log("[LINE Webhook] Chat list sent, count:", exchanges.length)
      } catch (chatErr) {
        console.error("[LINE Webhook] Chat command error:", chatErr)
        try {
          await sendReplyMessage(event.replyToken, [
            { type: "text", text: "❌ โหลดรายการแชทไม่สำเร็จ กรุณาลองใหม่หรือพิมพ์ \"แชท\" อีกครั้ง" },
          ])
        } catch (replyErr) {
          console.error("[LINE Webhook] Failed to send error reply:", replyErr)
        }
      }
      return
    }

    // เชื่อมบัญชีด้วยรหัส: สร้างรหัส 6 หลัก แล้วให้ผู้ใช้ไปกรอกบนเว็บ
    if (text === "เชื่อมบัญชี" || text.toLowerCase() === "link") {
      const db = getAdminDb()
      const linkCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 นาที
      await db.collection("pendingLineLinks").add({
        linkCode,
        lineUserId,
        expiresAt,
      })
      await sendLinkCodeMessage(event.replyToken, linkCode)
      return
    }

    // Check if text looks like an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRegex.test(text)) {
      // Find user by email
      let result: FirestoreQueryResult | null
      try {
        result = await firestoreQueryOne("users", "email", text.trim().toLowerCase())
      } catch (queryError) {
        // Show the actual error to user for debugging
        await sendReplyMessage(event.replyToken, [
          { type: "text", text: `❌ Query Error: ${String(queryError)}` },
        ])
        return
      }
      
      // Check if user found
      if (!result) {
        await sendReplyMessage(event.replyToken, [
          {
            type: "text",
            text: `❌ ไม่พบบัญชีที่ใช้อีเมล "${text}"

กรุณาตรวจสอบอีเมลให้ถูกต้อง หรือลงทะเบียนบนเว็บก่อน`,
          },
        ])
        return
      }

      const docPath = result.path
      
      // Link the account
      try {
        await firestoreUpdate(docPath, {
          lineUserId: lineUserId,
          lineNotifications: {
            enabled: true,
            exchangeRequest: true,
            exchangeStatus: true,
            exchangeComplete: true,
          },
        })
      } catch (updateError) {
        await sendReplyMessage(event.replyToken, [
          { type: "text", text: `❌ Update Error: ${String(updateError)}` },
        ])
        return
      }

      await sendReplyMessage(event.replyToken, [
        {
          type: "text",
          text: `✅ เชื่อมบัญชีสำเร็จ!

📧 ${text}

คุณจะได้รับการแจ้งเตือนผ่าน LINE แล้ว 🎉`,
        },
      ])
      return
    }

    // Check status
    if (text === "สถานะ" || text === "status") {
      try {
        const result = await firestoreQueryOne("users", "lineUserId", lineUserId)
        
        if (!result) {
          await sendReplyMessage(event.replyToken, [
            { type: "text", text: "❌ ยังไม่ได้เชื่อมบัญชี\n\n📧 พิมพ์อีเมลเพื่อเชื่อมบัญชี" },
          ])
        } else {
          const email = (result.data?.email as string | undefined) || "ไม่ระบุ"
          await sendReplyMessage(event.replyToken, [
            { type: "text", text: `✅ เชื่อมบัญชีแล้ว\n\n📧 ${email}` },
          ])
        }
      } catch (statusError) {
        await sendReplyMessage(event.replyToken, [
          { type: "text", text: `❌ Status Error: ${String(statusError)}` },
        ])
      }
      return
    }

    // Unlink account
    if (text === "ยกเลิก" || text === "unlink" || text === "ยกเลิกการเชื่อมต่อ") {
      try {
        const result = await firestoreQueryOne("users", "lineUserId", lineUserId)
        
        if (!result) {
          await sendReplyMessage(event.replyToken, [
            { type: "text", text: "❌ ไม่พบบัญชีที่เชื่อมกับ LINE นี้" },
          ])
        } else {
          const docPath = result.path
          
          // Remove LINE connection
          await firestoreUpdate(docPath, {
            lineUserId: null,
            lineNotifications: {
              enabled: false,
              exchangeRequest: false,
              exchangeStatus: false,
              exchangeComplete: false,
            },
          })
          
          const email = (result.data?.email as string | undefined) || "บัญชี"
          await sendReplyMessage(event.replyToken, [
            { 
              type: "text", 
              text: `✅ ยกเลิกการเชื่อมต่อสำเร็จ!

📧 ${email}

คุณจะไม่ได้รับการแจ้งเตือนผ่าน LINE อีกต่อไป

💡 หากต้องการเชื่อมใหม่ พิมพ์อีเมลของคุณ` 
            },
          ])
        }
      } catch (unlinkError) {
        await sendReplyMessage(event.replyToken, [
          { type: "text", text: `❌ Unlink Error: ${String(unlinkError)}` },
        ])
      }
      return
    }

    // ออกจากโหมดแชท
    if (text === "ออก" || text === "หยุดแชท" || text.toLowerCase() === "exit") {
      await clearChatSession(lineUserId)
      await sendReplyMessage(event.replyToken, [
        { type: "text", text: "ออกจากแชทแล้ว\n\nพิมพ์ \"แชท\" เมื่อต้องการแชทกับรายการอื่น" },
      ])
      return
    }

    const session = await getChatSession(lineUserId)
    const num = /^[1-9]$/.exec(text)
    if (session?.exchangeIds && session.exchangeIds.length > 0 && num) {
      const idx = parseInt(text, 10) - 1
      if (idx < session.exchangeIds.length) {
        const exchangeId = session.exchangeIds[idx]!
        const userId = await getUserIdByLineUserId(lineUserId)
        if (!userId) {
          await sendReplyMessage(event.replyToken, [{ type: "text", text: "❌ ไม่พบบัญชี" }])
          return
        }
        const other = await getExchangeOtherParty(exchangeId, userId)
        if (!other) {
          await sendReplyMessage(event.replyToken, [
            { type: "text", text: "❌ อีกฝ่ายยังไม่ได้เชื่อม LINE หรือรายการไม่พบ" },
          ])
          return
        }
        const db = getAdminDb()
        await db.collection(LINE_CHAT_SESSIONS).doc(lineUserId).set(
          { exchangeId, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        )
        await db.collection(LINE_CHAT_SESSIONS).doc(lineUserId).update({
          exchangeIds: FieldValue.delete(),
          listSentAt: FieldValue.delete(),
        })
        await sendReplyMessage(event.replyToken, [
          {
            type: "text",
            text: `💬 กำลังแชทเรื่อง "${other.itemTitle}" กับ ${other.displayName}\n\nพิมพ์ข้อความได้เลย\nพิมพ์ "ออก" เพื่อออกจากแชท`,
          },
        ])
        return
      }
    }

    if (session?.exchangeId) {
      const userId = await getUserIdByLineUserId(lineUserId)
      if (!userId) {
        await sendReplyMessage(event.replyToken, [{ type: "text", text: "❌ ไม่พบบัญชี" }])
        return
      }
      const other = await getExchangeOtherParty(session.exchangeId, userId)
      if (!other) {
        await sendReplyMessage(event.replyToken, [
          { type: "text", text: "❌ อีกฝ่ายยังไม่ได้เชื่อม LINE หรือรายการไม่พบ" },
        ])
        return
      }
      const db = getAdminDb()
      const senderDoc = await db.collection("users").doc(userId).get()
      const senderName = senderDoc.exists ? ((senderDoc.data()?.displayName as string) || (senderDoc.data()?.email as string) || "ผู้ใช้").split("@")[0] : "ผู้ใช้"
      await sendPushMessage(other.lineUserId, [
        {
          type: "text",
          text: `💬 จาก ${senderName} (รายการ: ${other.itemTitle})\n\n${text}`,
        },
      ])
      await setChatSession(lineUserId, { exchangeId: session.exchangeId })
      await sendReplyMessage(event.replyToken, [{ type: "text", text: "✓ ส่งแล้ว" }])
      return
    }

    // Default help
    await sendReplyMessage(event.replyToken, [
      {
        type: "text",
        text: `📋 วิธีใช้งาน RMU-Campus X

📧 พิมพ์อีเมล @rmu.ac.th เพื่อเชื่อมบัญชี
🔗 "เชื่อมบัญชี" - ขอรหัสไปกรอกบนเว็บ
💬 "แชท" - แชทกับคู่แลกเปลี่ยนผ่าน LINE (ไม่ต้องแอดเพื่อน)
• "สถานะ" - ตรวจสอบสถานะ
• "ยกเลิก" - ยกเลิกการเชื่อมต่อ`,
      },
    ])
  } catch (error) {
    console.error("[LINE Webhook] handleTextMessage error:", error)
    await sendReplyMessage(event.replyToken, [
      { type: "text", text: `เกิดข้อผิดพลาด: ${String(error)}` },
    ])
  }
}
