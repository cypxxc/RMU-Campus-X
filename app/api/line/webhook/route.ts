/**
 * LINE Webhook API Route
 * เชื่อมบัญชีอัตโนมัติด้วยอีเมล (ใช้ Firebase REST API)
 */

import { NextRequest, NextResponse } from "next/server"
import { verifySignature, sendReplyMessage } from "@/lib/line"
import { getAdminDb } from "@/lib/firebase-admin"

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
  const text = event.message?.text?.trim() || ""
  const lineUserId = event.source.userId

  try {
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

    // Default help
    await sendReplyMessage(event.replyToken, [
      {
        type: "text",
        text: `📋 วิธีใช้งาน:

📧 พิมพ์อีเมลของคุณเพื่อเชื่อมบัญชี
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
