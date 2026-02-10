/**
 * LINE Webhook API Route
 * เชื่อมบัญชีอัตโนมัติด้วยอีเมล (ใช้ Firebase REST API)
 */

import { NextRequest, NextResponse } from "next/server"
import {
  verifySignature,
  sendReplyMessage,
  sendLinkCodeMessage,
  sendPushMessage,
  applyDefaultRichMenuToUser,
  removeRichMenuFromUser,
} from "@/lib/line"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import type { ExchangeStatus } from "@/types"

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
const LIST_CHOICE_TIMEOUT_MS = 15 * 60 * 1000   // 15 นาที (เลือกรายการแชท)

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

/** สถานะที่ยังแชทได้ — ไม่รวม cancelled, rejected, completed (ตามแนวทาง marketplace: แชทที่ deal เสร็จแล้วไม่แสดงในรายการ) */
const CHATABLE_STATUSES = ["pending", "accepted", "in_progress"]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RMU_EMAIL_REGEX = /^[a-zA-Z0-9._+-]{1,64}@rmu\.ac\.th$/i

const HELP_COMMANDS = [
  "help",
  "คู่มือ",
  "วิธีใช้",
  "ช่วยเหลือ",
  "คำสั่ง",
  "เมนู",
  "manual",
  "guide",
]
const NOTE_COMMANDS = ["note", "โน้ต", "สรุปคำสั่ง", "notebot", "linenote"]
const CHAT_COMMANDS = ["chat", "แชท", "คุย", "เริ่มแชท", "เลือกแชท"]
const LINK_COMMANDS = ["link", "เชื่อมบัญชี", "ผูกบัญชี", "linkaccount", "connectline"]
const STATUS_COMMANDS = ["status", "สถานะ", "เช็คสถานะ", "ตรวจสอบสถานะ", "linkstatus"]
const UNLINK_COMMANDS = [
  "unlink",
  "ยกเลิก",
  "ยกเลิกการเชื่อมต่อ",
  "ยกเลิกเชื่อมต่อ",
  "ยกเลิกเชื่อมบัญชี",
  "disconnect",
]
const EXIT_CHAT_COMMANDS = ["exit", "ออก", "หยุดแชท", "จบแชท", "ออกจากแชท"]
const CONFIRM_COMMANDS = [
  "confirm",
  "confirmexchange",
  "ยืนยัน",
  "ยืนยันแลกเปลี่ยน",
  "ยืนยันการแลกเปลี่ยน",
]
const CONFIRM_EXCHANGE_PREFIX = "confirm_exchange:"

function normalizeCommandText(value: string): { lower: string; compact: string } {
  const lower = value.normalize("NFC").trim().toLowerCase()
  const compact = lower.replace(/\s+/g, "")
  return { lower, compact }
}

function isCommand(compact: string, commands: string[]): boolean {
  return commands.some((command) => compact === command.replace(/\s+/g, "").toLowerCase())
}

function hasKeyword(lower: string, keywords: string[]): boolean {
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()))
}

function extractConfirmExchangeId(text: string): string | null {
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()
  if (!lower.startsWith(CONFIRM_EXCHANGE_PREFIX)) return null
  const exchangeId = trimmed.slice(CONFIRM_EXCHANGE_PREFIX.length).trim()
  return exchangeId.length > 0 ? exchangeId : null
}

function buildChatQuickReply(_exchangeId: string) {
  return {
    items: [
      {
        type: "action" as const,
        action: {
          type: "message" as const,
          label: "ยืนยันแลกเปลี่ยน",
          text: "ยืนยันการแลกเปลี่ยน",
        },
      },
      {
        type: "action" as const,
        action: {
          type: "message" as const,
          label: "ออกจากแชท",
          text: "ออก",
        },
      },
    ],
  }
}

function buildHelpText(): string {
  return `🧭 คู่มือ LINE Bot (สรุปเร็ว)

คำสั่งที่ใช้ได้:
• "เชื่อมบัญชี" / "link" = ขอรหัส 6 หลักไปกรอกบนเว็บ
• พิมพ์อีเมล @rmu.ac.th = เชื่อมบัญชีตรง
• "สถานะ" / "status" = ตรวจสอบสถานะการเชื่อม
• "แชท" / "chat" = ดูรายการแลกเปลี่ยนที่คุยได้
• พิมพ์เลข 1..N = เลือกห้องแชท
• พิมพ์ข้อความ = ส่งข้อความไปยังห้องที่เลือก
• "ออก" / "exit" = ออกจากโหมดแชท
• "ยกเลิกการเชื่อมต่อ" / "unlink" = ตัดการเชื่อม LINE
• "โน้ต" / "note" = ส่งคู่มือแบบยาวสำหรับเก็บเป็นโน้ต

หมายเหตุ:
• ถ้าอีกฝ่ายยังไม่เชื่อม LINE ข้อความจะยังถูกส่งเข้าเว็บแชทปกติ
• พิมพ์ "คู่มือ" ซ้ำได้ทุกเมื่อ`
}

function buildUsageNoteText(): string {
  return `📝 NOTE: วิธีใช้งาน LINE Bot RMU-Campus X

[เริ่มต้นเชื่อมบัญชี]
1) พิมพ์ "เชื่อมบัญชี" เพื่อรับรหัส 6 หลัก (หมดอายุ 5 นาที)
2) เข้าเว็บ > โปรไฟล์ > แจ้งเตือนผ่าน LINE
3) กรอกรหัส 6 หลัก แล้วกดยืนยัน
4) พิมพ์ "สถานะ" เพื่อเช็กว่าเชื่อมสำเร็จ

[คำสั่งทั้งหมด]
• help | คู่มือ | วิธีใช้
• note | โน้ต
• เชื่อมบัญชี | link
• สถานะ | status
• แชท | chat
• ออก | หยุดแชท | exit
• ยกเลิกการเชื่อมต่อ | unlink

[โหมดแชท]
• พิมพ์ "แชท" เพื่อดูรายการที่ยังคุยได้
• พิมพ์เลข 1..N เพื่อเลือกห้อง
• จากนั้นพิมพ์ข้อความได้ทันที
• พิมพ์ "ออก" เพื่อออกจากห้อง

[ข้อควรรู้]
• ยกเลิกการเชื่อมจากเว็บหรือจากบอท มีผลทันทีทั้งระบบ
• ถ้าอีกฝ่ายยังไม่เชื่อม LINE ข้อความยังขึ้นในเว็บแชทปกติ
• ถ้าสงสัย พิมพ์ "คู่มือ"`
}

function buildFollowWelcomeText(): string {
  return `สวัสดี 👋 ยินดีต้อนรับสู่ RMU-Campus X LINE Bot

เริ่มใช้งานแบบเร็ว:
1) พิมพ์ "เชื่อมบัญชี" เพื่อรับรหัส 6 หลัก
2) ไปกรอกรหัสบนหน้าโปรไฟล์ในเว็บ
3) พิมพ์ "สถานะ" เพื่อตรวจสอบผล

ต้องการคู่มือทั้งหมด พิมพ์ "คู่มือ"
ต้องการข้อความแบบโน้ตสำหรับเก็บไว้ พิมพ์ "โน้ต"`
}

async function getExchangeStatus(exchangeId: string): Promise<string | null> {
  const db = getAdminDb()
  const doc = await db.collection("exchanges").doc(exchangeId).get()
  if (!doc.exists) return null
  return (doc.data()?.status as string) || null
}

async function getActiveExchangesForUser(userId: string): Promise<Array<{ id: string; itemTitle: string; otherDisplayName: string }>> {
  const db = getAdminDb()
  const [ownerSnap, requesterSnap] = await Promise.all([
    db.collection("exchanges").where("ownerId", "==", userId).get(),
    db.collection("exchanges").where("requesterId", "==", userId).get(),
  ])
  const statusOk = (s: string) => CHATABLE_STATUSES.includes(s)
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

/** คืนค่าข้อมูลอีกฝ่าย — lineUserId เป็น optional (อีกฝ่ายอาจยังไม่เชื่อม LINE) */
async function getExchangeOtherParty(exchangeId: string, currentUserId: string): Promise<{ lineUserId?: string; displayName: string; itemTitle: string } | null> {
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
  const displayName = (u.displayName as string) || (u.email as string) || "ผู้ใช้"
  return { lineUserId, displayName: displayName.split("@")[0] ?? "ผู้ใช้", itemTitle }
}

type ConfirmExchangeFromLineResult = {
  status: ExchangeStatus
  role: "owner" | "requester"
  itemTitle: string
  ownerId: string
  requesterId: string
  otherUserId: string
  otherLineUserId?: string
  alreadyConfirmed: boolean
  shouldNotifyOther: boolean
}

async function confirmExchangeFromLine(
  exchangeId: string,
  userId: string
): Promise<ConfirmExchangeFromLineResult> {
  const db = getAdminDb()
  const exchangeRef = db.collection("exchanges").doc(exchangeId)

  const result = await db.runTransaction(async (transaction) => {
    const exchangeDoc = await transaction.get(exchangeRef)
    if (!exchangeDoc.exists) {
      throw new Error("Exchange not found")
    }

    const exchange = exchangeDoc.data() as {
      status: ExchangeStatus
      ownerId: string
      requesterId: string
      ownerConfirmed?: boolean
      requesterConfirmed?: boolean
      itemId: string
      itemTitle: string
    }

    if (!["accepted", "in_progress"].includes(exchange.status)) {
      throw new Error(`Cannot confirm exchange in status: ${exchange.status}`)
    }

    const isOwner = exchange.ownerId === userId
    const isRequester = exchange.requesterId === userId
    if (!isOwner && !isRequester) {
      throw new Error("Only the owner or requester can confirm")
    }

    const role: "owner" | "requester" = isOwner ? "owner" : "requester"
    const ownerConfirmedBefore = exchange.ownerConfirmed === true
    const requesterConfirmedBefore = exchange.requesterConfirmed === true
    const alreadyConfirmed = role === "owner" ? ownerConfirmedBefore : requesterConfirmedBefore

    let ownerConfirmed = ownerConfirmedBefore
    let requesterConfirmed = requesterConfirmedBefore
    if (role === "owner") ownerConfirmed = true
    else requesterConfirmed = true

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      ownerConfirmed,
      requesterConfirmed,
    }

    let newStatus: ExchangeStatus = exchange.status
    if (exchange.status === "accepted") {
      newStatus = "in_progress"
      updates.status = "in_progress"
    }

    if (ownerConfirmed && requesterConfirmed) {
      newStatus = "completed"
      updates.status = "completed"
      const itemRef = db.collection("items").doc(exchange.itemId)
      transaction.update(itemRef, {
        status: "completed",
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    transaction.update(exchangeRef, updates)

    return {
      status: newStatus,
      role,
      itemTitle: exchange.itemTitle,
      ownerId: exchange.ownerId,
      requesterId: exchange.requesterId,
      otherUserId: role === "owner" ? exchange.requesterId : exchange.ownerId,
      alreadyConfirmed,
      shouldNotifyOther: !alreadyConfirmed && newStatus !== "completed",
    }
  })

  if (result.status === "completed") {
    await db.collection("notifications").add({
      userId: result.ownerId,
      title: "การแลกเปลี่ยนเสร็จสิ้น",
      message: `การแลกเปลี่ยน "${result.itemTitle}" สำเร็จเรียบร้อยแล้ว!`,
      type: "exchange",
      relatedId: exchangeId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    })
    await db.collection("notifications").add({
      userId: result.requesterId,
      title: "การแลกเปลี่ยนเสร็จสิ้น",
      message: `การแลกเปลี่ยน "${result.itemTitle}" สำเร็จเรียบร้อยแล้ว!`,
      type: "exchange",
      relatedId: exchangeId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    })
  } else if (result.shouldNotifyOther) {
    const message =
      result.role === "owner"
        ? `เจ้าของสิ่งของ "${result.itemTitle}" ยืนยันแล้ว กรุณายืนยันเพื่อให้การแลกเปลี่ยนเสร็จสมบูรณ์`
        : `ผู้ขอรับ "${result.itemTitle}" ยืนยันแล้ว กรุณายืนยันเพื่อให้การแลกเปลี่ยนเสร็จสมบูรณ์`

    await db.collection("notifications").add({
      userId: result.otherUserId,
      title: "อีกฝ่ายยืนยันแล้ว",
      message,
      type: "exchange",
      relatedId: exchangeId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    })
  }

  const otherUserDoc = await db.collection("users").doc(result.otherUserId).get()
  if (!otherUserDoc.exists) return result
  const otherUserData = otherUserDoc.data() as {
    lineUserId?: string
    lineNotifications?: { enabled?: boolean }
  }
  const lineEnabled = otherUserData?.lineNotifications?.enabled !== false
  if (!lineEnabled) return result

  return {
    ...result,
    otherLineUserId: otherUserData?.lineUserId,
  }
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
            text: buildFollowWelcomeText(),
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
  const { lower, compact } = normalizeCommandText(text)

  try {
    // ========== แชท (ตรวจก่อนคำสั่งอื่น เพื่อให้จับ "แชท" ได้เสมอ) ==========
    const wantChat =
      isCommand(compact, CHAT_COMMANDS) ||
      /^แชท\s*$/i.test(text) ||
      (compact.length <= 20 && compact.includes("แชท") && !compact.includes("@"))
    if (wantChat) {
      try {
        console.log("[LINE Webhook] Chat command from:", lineUserId?.slice(0, 8), "text length:", text.length)
        const userId = await getUserIdByLineUserId(lineUserId)
        if (!userId) {
          await sendReplyMessage(event.replyToken, [
            {
              type: "text",
              text: `❌ ยังไม่ได้เชื่อมบัญชี LINE

วิธีเชื่อมบัญชี:
1) พิมพ์ "เชื่อมบัญชี" เพื่อรับรหัส 6 หลัก
2) ไปที่หน้าโปรไฟล์บนเว็บแล้วกรอกรหัส
หรือพิมพ์อีเมล @rmu.ac.th เพื่อเชื่อมตรง`,
            },
          ])
          return
        }
        const exchanges = await getActiveExchangesForUser(userId)
        if (exchanges.length === 0) {
          await sendReplyMessage(event.replyToken, [
            { type: "text", text: "📭 ไม่มีรายการแลกเปลี่ยนที่ยังดำเนินการอยู่\n\nรายการที่เสร็จสิ้น/ยกเลิกแล้วจะไม่แสดง — เมื่อมีคนขอรับของ หรือคุณขอรับของคนอื่น จะแสดงรายการให้เลือกแชทได้ที่นี่" },
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

    const wantHelp = isCommand(compact, HELP_COMMANDS) || hasKeyword(lower, ["คู่มือ", "วิธีใช้", "ช่วยเหลือ", "help"])
    if (wantHelp) {
      await sendReplyMessage(event.replyToken, [{ type: "text", text: buildHelpText() }])
      return
    }

    const wantNote = isCommand(compact, NOTE_COMMANDS) || hasKeyword(lower, ["โน้ต", "note"])
    if (wantNote) {
      await sendReplyMessage(event.replyToken, [
        { type: "text", text: buildUsageNoteText() },
        {
          type: "text",
          text: `📌 หมายเหตุ: LINE Bot ไม่สามารถเขียน "โน้ต" ให้โดยอัตโนมัติได้
คุณสามารถปักหมุดหรือคัดลอกข้อความนี้ไปเก็บในโน้ตได้ทันที`,
        },
      ])
      return
    }

    // เชื่อมบัญชีด้วยรหัส: สร้างรหัส 6 หลัก แล้วให้ผู้ใช้ไปกรอกบนเว็บ
    const wantLinkCode = isCommand(compact, LINK_COMMANDS) || hasKeyword(lower, ["เชื่อมบัญชี", "link account"])
    if (wantLinkCode) {
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
    if (EMAIL_REGEX.test(text)) {
      const email = text.trim().toLowerCase()
      if (!RMU_EMAIL_REGEX.test(email)) {
        await sendReplyMessage(event.replyToken, [
          {
            type: "text",
            text: `❌ รองรับเฉพาะอีเมล @rmu.ac.th

อีเมลที่พิมพ์: ${email}
ตัวอย่างที่ถูกต้อง: 6531xxxxxxx@rmu.ac.th

ถ้าต้องการดูคำสั่งทั้งหมด พิมพ์ "คู่มือ"`,
          },
        ])
        return
      }

      // Find user by email
      let result: FirestoreQueryResult | null
      try {
        result = await firestoreQueryOne("users", "email", email)
      } catch (queryError) {
        console.error("[LINE Webhook] Query user by email error:", queryError)
        await sendReplyMessage(event.replyToken, [
          { type: "text", text: "❌ ระบบค้นหาบัญชีมีปัญหาชั่วคราว กรุณาลองใหม่อีกครั้ง" },
        ])
        return
      }
      
      // Check if user found
      if (!result) {
        await sendReplyMessage(event.replyToken, [
          {
            type: "text",
            text: `❌ ไม่พบบัญชีที่ใช้อีเมล "${email}"

กรุณาตรวจสอบอีเมลให้ถูกต้อง หรือลงทะเบียนบนเว็บก่อน
หากต้องการคู่มือ พิมพ์ "คู่มือ"`,
          },
        ])
        return
      }

      const targetLineUserId =
        typeof result.data?.lineUserId === "string" && result.data.lineUserId.trim()
          ? result.data.lineUserId.trim()
          : null

      if (targetLineUserId && targetLineUserId !== lineUserId) {
        await sendReplyMessage(event.replyToken, [
          {
            type: "text",
            text: `❌ อีเมลนี้เชื่อมกับ LINE อื่นอยู่แล้ว

กรุณายกเลิกการเชื่อมจากบัญชีนั้นก่อน
หรือลองพิมพ์ "เชื่อมบัญชี" แล้วกรอกรหัส 6 หลักบนเว็บแทน`,
          },
        ])
        return
      }

      const currentLinkedUser = await firestoreQueryOne("users", "lineUserId", lineUserId)
      if (currentLinkedUser && currentLinkedUser.id !== result.id) {
        await firestoreUpdate(currentLinkedUser.path, {
          lineUserId: null,
          lineNotifications: {
            enabled: false,
            exchangeRequest: false,
            exchangeStatus: false,
            exchangeComplete: false,
          },
        })
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
        console.error("[LINE Webhook] Link update error:", updateError)
        await sendReplyMessage(event.replyToken, [
          { type: "text", text: "❌ ระบบเชื่อมบัญชีขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" },
        ])
        return
      }

      const richMenuResult = await applyDefaultRichMenuToUser(lineUserId)
      if (!richMenuResult.success && !richMenuResult.skipped) {
        console.warn("[LINE Webhook] Failed to apply default rich menu:", richMenuResult.error)
      }

      await clearChatSession(lineUserId)
      await sendReplyMessage(event.replyToken, [
        {
          type: "text",
          text: `✅ เชื่อมบัญชีสำเร็จ!

📧 ${email}

จากนี้คุณจะได้รับการแจ้งเตือนผ่าน LINE 🎉
พิมพ์ "แชท" เพื่อคุยกับคู่แลกเปลี่ยนได้ทันที
พิมพ์ "สถานะ" เพื่อตรวจสอบการเชื่อม`,
        },
      ])
      return
    }

    // Check status
    const wantStatus = isCommand(compact, STATUS_COMMANDS) || hasKeyword(lower, ["สถานะ", "status"])
    if (wantStatus) {
      try {
        const result = await firestoreQueryOne("users", "lineUserId", lineUserId)
        
        if (!result) {
          await sendReplyMessage(event.replyToken, [
            {
              type: "text",
              text: `❌ ยังไม่ได้เชื่อมบัญชี LINE

เริ่มเชื่อมได้ 2 วิธี:
• พิมพ์ "เชื่อมบัญชี" เพื่อรับรหัส 6 หลัก
• หรือพิมพ์อีเมล @rmu.ac.th โดยตรง`,
            },
          ])
        } else {
          const email = (result.data?.email as string | undefined) || "ไม่ระบุ"
          const settings = (result.data?.lineNotifications as {
            enabled?: boolean
            exchangeRequest?: boolean
            exchangeStatus?: boolean
            exchangeComplete?: boolean
          }) || { enabled: true }
          const enabled = settings.enabled !== false
          await sendReplyMessage(event.replyToken, [
            {
              type: "text",
              text: `✅ เชื่อมบัญชีแล้ว

📧 ${email}
🔔 แจ้งเตือนรวม: ${enabled ? "เปิด" : "ปิด"}
• คำขอแลกเปลี่ยน: ${settings.exchangeRequest === false ? "ปิด" : "เปิด"}
• สถานะแลกเปลี่ยน: ${settings.exchangeStatus === false ? "ปิด" : "เปิด"}
• แลกเปลี่ยนสำเร็จ: ${settings.exchangeComplete === false ? "ปิด" : "เปิด"}

พิมพ์ "แชท" เพื่อเริ่มคุยกับคู่แลกเปลี่ยน`,
            },
          ])
        }
      } catch (statusError) {
        console.error("[LINE Webhook] Status error:", statusError)
        await sendReplyMessage(event.replyToken, [
          { type: "text", text: "❌ ตรวจสอบสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
        ])
      }
      return
    }

    // Unlink account
    const wantUnlink = isCommand(compact, UNLINK_COMMANDS) || hasKeyword(lower, ["ยกเลิกการเชื่อม", "unlink", "disconnect"])
    if (wantUnlink) {
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

          const removeRichMenuResult = await removeRichMenuFromUser(lineUserId)
          if (!removeRichMenuResult.success) {
            console.warn("[LINE Webhook] Failed to remove user rich menu:", removeRichMenuResult.error)
          }

          await clearChatSession(lineUserId)
          
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
        console.error("[LINE Webhook] Unlink error:", unlinkError)
        await sendReplyMessage(event.replyToken, [
          { type: "text", text: "❌ ยกเลิกการเชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
        ])
      }
      return
    }

    // ออกจากโหมดแชท
    if (isCommand(compact, EXIT_CHAT_COMMANDS)) {
      await clearChatSession(lineUserId)
      await sendReplyMessage(event.replyToken, [
        { type: "text", text: "ออกจากแชทแล้ว\n\nพิมพ์ \"แชท\" เมื่อต้องการแชทกับรายการอื่น" },
      ])
      return
    }

    const session = await getChatSession(lineUserId)
    const confirmExchangeId = extractConfirmExchangeId(text)
    const wantConfirmExchange = confirmExchangeId !== null || isCommand(compact, CONFIRM_COMMANDS)
    if (wantConfirmExchange) {
      const userId = await getUserIdByLineUserId(lineUserId)
      if (!userId) {
        await sendReplyMessage(event.replyToken, [
          { type: "text", text: "❌ ไม่พบบัญชีผู้ใช้ที่เชื่อมกับ LINE นี้" },
        ])
        return
      }

      const targetExchangeId = confirmExchangeId || session?.exchangeId
      if (!targetExchangeId) {
        await sendReplyMessage(event.replyToken, [
          {
            type: "text",
            text: "⚠️ กรุณาเลือกห้องแชทก่อนยืนยัน\n\nพิมพ์ \"แชท\" แล้วเลือกเลขรายการที่ต้องการ",
          },
        ])
        return
      }

      try {
        const confirmResult = await confirmExchangeFromLine(targetExchangeId, userId)

        if (confirmResult.status === "completed") {
          await clearChatSession(lineUserId)
          await sendReplyMessage(event.replyToken, [
            {
              type: "text",
              text: `✅ ยืนยันสำเร็จ\n\nการแลกเปลี่ยน "${confirmResult.itemTitle}" เสร็จสมบูรณ์แล้ว`,
            },
          ])

          if (confirmResult.otherLineUserId) {
            await clearChatSession(confirmResult.otherLineUserId)
            await sendPushMessage(confirmResult.otherLineUserId, [
              {
                type: "text",
                text: `🎉 การแลกเปลี่ยน "${confirmResult.itemTitle}" เสร็จสมบูรณ์แล้ว`,
              },
            ])
          }
        } else {
          await setChatSession(lineUserId, { exchangeId: targetExchangeId })
          await sendReplyMessage(event.replyToken, [
            {
              type: "text",
              text: confirmResult.alreadyConfirmed
                ? `✅ คุณยืนยันไว้แล้วสำหรับ "${confirmResult.itemTitle}"\n\nระบบกำลังรออีกฝ่ายยืนยัน`
                : `✅ ยืนยันแล้วสำหรับ "${confirmResult.itemTitle}"\n\nระบบกำลังรออีกฝ่ายยืนยัน`,
              quickReply: buildChatQuickReply(targetExchangeId),
            },
          ])

          if (confirmResult.otherLineUserId && confirmResult.shouldNotifyOther) {
            await setChatSession(confirmResult.otherLineUserId, { exchangeId: targetExchangeId })
            await sendPushMessage(confirmResult.otherLineUserId, [
              {
                type: "text",
                text: `🔔 อีกฝ่ายยืนยันแล้วสำหรับ "${confirmResult.itemTitle}"\nกรุณากดยืนยันการแลกเปลี่ยนเพื่อปิดรายการ`,
                quickReply: buildChatQuickReply(targetExchangeId),
              },
            ])
          }
        }
      } catch (confirmError) {
        const message = confirmError instanceof Error ? confirmError.message : String(confirmError)
        if (message.includes("Exchange not found")) {
          await sendReplyMessage(event.replyToken, [
            { type: "text", text: "❌ ไม่พบรายการแลกเปลี่ยนนี้แล้ว" },
          ])
          return
        }
        if (message.includes("Only the owner or requester")) {
          await sendReplyMessage(event.replyToken, [
            { type: "text", text: "❌ คุณไม่มีสิทธิ์ยืนยันรายการนี้" },
          ])
          return
        }
        if (message.includes("Cannot confirm exchange in status")) {
          await sendReplyMessage(event.replyToken, [
            { type: "text", text: "⚠️ รายการนี้ยังยืนยันไม่ได้ หรือจบรายการแล้ว" },
          ])
          return
        }
        console.error("[LINE Webhook] Confirm exchange error:", confirmError)
        await sendReplyMessage(event.replyToken, [
          { type: "text", text: "❌ ยืนยันการแลกเปลี่ยนไม่สำเร็จ กรุณาลองอีกครั้ง" },
        ])
      }
      return
    }

    // รองรับ "1", "2", "1-1", "10" ฯลฯ — ดึงเลขตัวแรกมาใช้เป็นลำดับ
    const numMatch = text.match(/^(\d+)/)
    if (session?.exchangeIds && session.exchangeIds.length > 0 && numMatch) {
      const idx = parseInt(numMatch[1] ?? "", 10) - 1
      if (idx >= 0 && idx < session.exchangeIds.length) {
        const exchangeId = session.exchangeIds[idx]!
        const userId = await getUserIdByLineUserId(lineUserId)
        if (!userId) {
          await sendReplyMessage(event.replyToken, [{ type: "text", text: "❌ ไม่พบบัญชี" }])
          return
        }
        const other = await getExchangeOtherParty(exchangeId, userId)
        if (!other) {
          await sendReplyMessage(event.replyToken, [
            { type: "text", text: "❌ ไม่พบรายการแชท กรุณาพิมพ์ \"แชท\" เพื่อดูรายการใหม่" },
          ])
          return
        }
        const exStatus = await getExchangeStatus(exchangeId)
        if (!exStatus || !CHATABLE_STATUSES.includes(exStatus)) {
          await sendReplyMessage(event.replyToken, [
            { type: "text", text: "📭 รายการนี้เสร็จสิ้นหรือถูกยกเลิกแล้ว\n\nพิมพ์ \"แชท\" เพื่อดูรายการที่ยังดำเนินการอยู่" },
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
        const noLineNote = !other.lineUserId
          ? "\n\n📌 อีกฝ่ายยังไม่เชื่อม LINE — ข้อความจะแสดงบนเว็บเท่านั้น"
          : ""
        await sendReplyMessage(event.replyToken, [
          {
            type: "text",
            text: `💬 กำลังแชทเรื่อง "${other.itemTitle}" กับ ${other.displayName}\n\nพิมพ์ข้อความได้เลย\nพิมพ์ "ออก" เพื่อออกจากแชท${noLineNote}`,
            quickReply: buildChatQuickReply(exchangeId),
          },
        ])
        return
      }
      // เลขที่เลือกเกินช่วง — แจ้งให้เลือกใหม่
      await sendReplyMessage(event.replyToken, [
        { type: "text", text: `⚠️ กรุณาเลือกเลข 1-${session.exchangeIds.length} เท่านั้น\n\nพิมพ์ "แชท" เพื่อดูรายการใหม่` },
      ])
      return
    }

    // ส่งข้อความในห้องแชท (บันทึกลง Firestore ด้วย — ให้โผล่ในห้องแชทบนเว็บแอป)
    if (session?.exchangeId) {
      const userId = await getUserIdByLineUserId(lineUserId)
      if (!userId) {
        await sendReplyMessage(event.replyToken, [{ type: "text", text: "❌ ไม่พบบัญชี" }])
        return
      }
      const exStatus = await getExchangeStatus(session.exchangeId)
      if (!exStatus || !CHATABLE_STATUSES.includes(exStatus)) {
        await clearChatSession(lineUserId)
        await sendReplyMessage(event.replyToken, [
          { type: "text", text: "📭 การแลกเปลี่ยนนี้เสร็จสิ้นหรือถูกยกเลิกแล้ว ไม่สามารถส่งข้อความได้\n\nพิมพ์ \"แชท\" เพื่อดูรายการที่ยังดำเนินการอยู่" },
        ])
        return
      }
      const other = await getExchangeOtherParty(session.exchangeId, userId)
      if (!other) {
        await sendReplyMessage(event.replyToken, [
          { type: "text", text: "❌ ไม่พบรายการแชท กรุณาพิมพ์ \"แชท\" เพื่อดูรายการใหม่" },
        ])
        return
      }
      const db = getAdminDb()
      const senderDoc = await db.collection("users").doc(userId).get()
      const senderData = senderDoc.exists ? senderDoc.data() : null
      const senderEmail = (senderData?.email as string) ?? ""
      const senderName = (senderData?.displayName as string) || (senderData?.email as string) || "ผู้ใช้"
      const senderNameShort = senderName.split("@")[0] ?? "ผู้ใช้"

      // บันทึกลง chatMessages — ข้อความจาก LINE จะโผล่ในห้องแชทบนเว็บแอปเหมือนส่งจากเว็บ
      await db.collection("chatMessages").add({
        exchangeId: session.exchangeId,
        senderId: userId,
        senderEmail,
        message: text,
        createdAt: FieldValue.serverTimestamp(),
      })

      // แจ้งอีกฝ่ายผ่าน LINE (ถ้าเชื่อม LINE อยู่เท่านั้น)
      if (other.lineUserId) {
        await setChatSession(other.lineUserId, { exchangeId: session.exchangeId })
        await sendPushMessage(other.lineUserId, [
          {
            type: "text",
            text: `💬 จาก ${senderNameShort} (รายการ: ${other.itemTitle})\n\n${text}\n\nพิมพ์ข้อความเพื่อตอบกลับได้`,
            quickReply: buildChatQuickReply(session.exchangeId),
          },
        ])
      }
      await setChatSession(lineUserId, { exchangeId: session.exchangeId })
      const sentNote = other.lineUserId ? "✓ ส่งแล้ว (แสดงในแชทบนเว็บ + แจ้งอีกฝ่ายผ่าน LINE)" : "✓ ส่งแล้ว (แสดงในแชทบนเว็บ — อีกฝ่ายยังไม่เชื่อม LINE จะไม่ได้รับแจ้ง)"
      await sendReplyMessage(event.replyToken, [{
        type: "text",
        text: sentNote,
        quickReply: buildChatQuickReply(session.exchangeId),
      }])
      return
    }

    // Default help
    await sendReplyMessage(event.replyToken, [
      {
        type: "text",
        text: `🤖 ไม่เข้าใจคำสั่ง "${text}"

พิมพ์ "คู่มือ" เพื่อดูวิธีใช้ทั้งหมด
หรือพิมพ์ "โน้ต" เพื่อรับคู่มือแบบละเอียด`,
      },
    ])
  } catch (error) {
    console.error("[LINE Webhook] handleTextMessage error:", error)
    await sendReplyMessage(event.replyToken, [
      { type: "text", text: "เกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้ง หรือพิมพ์ \"คู่มือ\"" },
    ])
  }
}
