/**
 * LINE Core Functions
 * Basic API communication with LINE Messaging API
 */

import type { LineMessage, LinePushResponse, LineQuickReply } from "./types"

// ============ Configuration ============

const LINE_API_BASE = "https://api.line.me/v2/bot"

const DEFAULT_REPLY_QUICK_REPLY: LineQuickReply = {
  items: [
    { type: "action", action: { type: "message", label: "คู่มือ", text: "คู่มือ" } },
    { type: "action", action: { type: "message", label: "แชท", text: "แชท" } },
    { type: "action", action: { type: "message", label: "สถานะ", text: "สถานะ" } },
    { type: "action", action: { type: "message", label: "เชื่อมบัญชี", text: "เชื่อมบัญชี" } },
    { type: "action", action: { type: "message", label: "ยกเลิกเชื่อม", text: "ยกเลิกการเชื่อมต่อ" } },
    { type: "action", action: { type: "message", label: "ออก", text: "ออก" } },
  ],
}

function withDefaultReplyQuickReply(messages: LineMessage[]): LineMessage[] {
  return messages.map((message) => {
    if (message.type !== "text") return message
    if (message.quickReply && message.quickReply.items?.length) return message
    return { ...message, quickReply: DEFAULT_REPLY_QUICK_REPLY }
  })
}

export function getChannelAccessToken(): string | null {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN is not configured - skipping LINE notification")
    return null
  }
  return token
}

export function getChannelSecret(): string | null {
  const secret = process.env.LINE_CHANNEL_SECRET
  if (!secret) {
    console.warn("LINE_CHANNEL_SECRET is not configured - skipping verification")
    return null
  }
  return secret
}

// ============ Core Functions ============

/**
 * ส่ง Push Message ไปยัง LINE User
 */
export async function sendPushMessage(
  lineUserId: string,
  messages: LineMessage[]
): Promise<LinePushResponse> {
  try {
    const token = getChannelAccessToken()
    if (!token) {
      return { success: false, error: "LINE_CHANNEL_ACCESS_TOKEN not configured" }
    }

    const response = await fetch(`${LINE_API_BASE}/message/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: messages.slice(0, 5), // LINE allows max 5 messages per request
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      let errorMessage = `HTTP ${response.status}`
      try {
        const error = JSON.parse(text) as { message?: string }
        if (error?.message) errorMessage = error.message
      } catch {
        if (text) errorMessage = text.slice(0, 200)
      }
      console.error("[LINE] Push message failed:", errorMessage)
      return { success: false, error: errorMessage }
    }

    return { success: true }
  } catch (error) {
    console.error("[LINE] Push message error:", error)
    return { success: false, error: String(error) }
  }
}

/**
 * ส่ง Reply Message (ตอบกลับ event จาก webhook)
 */
export async function sendReplyMessage(
  replyToken: string,
  messages: LineMessage[]
): Promise<LinePushResponse> {
  try {
    const token = getChannelAccessToken()
    if (!token) {
      return { success: false, error: "LINE_CHANNEL_ACCESS_TOKEN not configured" }
    }

    const response = await fetch(`${LINE_API_BASE}/message/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: withDefaultReplyQuickReply(messages).slice(0, 5),
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      let errorMessage = `HTTP ${response.status}`
      try {
        const error = JSON.parse(text) as { message?: string }
        if (error?.message) errorMessage = error.message
      } catch {
        if (text) errorMessage = text.slice(0, 200)
      }
      console.error("[LINE] Reply message failed:", errorMessage)
      return { success: false, error: errorMessage }
    }

    return { success: true }
  } catch (error) {
    console.error("[LINE] Reply message error:", error)
    return { success: false, error: String(error) }
  }
}

/**
 * ตรวจสอบ LINE Webhook Signature
 */
export async function verifySignature(body: string, signature: string): Promise<boolean> {
  try {
    const channelSecret = getChannelSecret()
    if (!channelSecret) {
      console.error("[LINE] verifySignature: LINE_CHANNEL_SECRET is not configured!")
      return false
    }
    
    console.log("[LINE] verifySignature: Verifying with secret (first 5 chars):", channelSecret.substring(0, 5) + "...")
    
    // Use Web Crypto API for Vercel Edge compatibility
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(channelSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(body)
    )
    
    // Convert to base64
    const hash = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    
    const isMatch = hash === signature
    console.log("[LINE] verifySignature: Signature match:", isMatch)
    
    return isMatch
  } catch (error) {
    console.error("[LINE] Signature verification error:", error)
    return false
  }
}
