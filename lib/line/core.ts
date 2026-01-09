/**
 * LINE Core Functions
 * Basic API communication with LINE Messaging API
 */

import type { LineMessage, LinePushResponse } from "./types"

// ============ Configuration ============

const LINE_API_BASE = "https://api.line.me/v2/bot"

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
      const error = await response.json()
      console.error("[LINE] Push message failed:", error)
      return { success: false, error: error.message || "Failed to send message" }
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
        messages: messages.slice(0, 5),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("[LINE] Reply message failed:", error)
      return { success: false, error: error.message || "Failed to reply" }
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
