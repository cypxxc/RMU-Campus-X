/**
 * LINE Core Functions
 * Basic API communication with LINE Messaging API
 */

import type {
  LineMessage,
  LinePushResponse,
  LineQuickReply,
  LineRichMenuApplyResponse,
  LineRichMenuIdResponse,
  LineRichMenuListResponse,
  LineRichMenu,
} from "./types"

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

export function getDefaultRichMenuId(): string | null {
  const richMenuId = process.env.LINE_RICH_MENU_DEFAULT_ID?.trim()
  return richMenuId ? richMenuId : null
}

interface LineApiResult<T = unknown> {
  success: boolean
  status: number
  data?: T
  error?: string
}

function extractLineApiErrorMessage(
  status: number,
  text: string,
  payload: unknown
): string {
  if (payload && typeof payload === "object") {
    const obj = payload as {
      message?: string
      details?: Array<{ message?: string; property?: string }>
    }
    const baseMessage = typeof obj.message === "string" && obj.message.trim()
      ? obj.message.trim()
      : `HTTP ${status}`
    const firstDetail = Array.isArray(obj.details) ? obj.details[0] : null
    if (firstDetail?.property && firstDetail?.message) {
      return `${baseMessage} (${firstDetail.property}: ${firstDetail.message})`
    }
    if (firstDetail?.message) {
      return `${baseMessage} (${firstDetail.message})`
    }
    return baseMessage
  }
  if (text.trim()) return text.slice(0, 300)
  return `HTTP ${status}`
}

async function lineApiRequest<T = unknown>(
  path: string,
  init: {
    method: string
    headers?: HeadersInit
    body?: unknown
  }
): Promise<LineApiResult<T>> {
  try {
    const token = getChannelAccessToken()
    if (!token) {
      return {
        success: false,
        status: 0,
        error: "LINE_CHANNEL_ACCESS_TOKEN not configured",
      }
    }

    const headers = new Headers(init.headers)
    headers.set("Authorization", `Bearer ${token}`)

    const hasBody = init.body !== undefined && init.body !== null
    if (hasBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }

    const bodyPayload = hasBody
      ? typeof init.body === "string"
        ? init.body
        : JSON.stringify(init.body)
      : undefined

    const response = await fetch(`${LINE_API_BASE}${path}`, {
      method: init.method,
      headers,
      body: bodyPayload,
    })

    const text = await response.text()
    let payload: unknown = undefined
    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        payload = undefined
      }
    }

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: extractLineApiErrorMessage(response.status, text, payload),
      }
    }

    return {
      success: true,
      status: response.status,
      data: payload as T,
    }
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: String(error),
    }
  }
}

// ============ Core Functions ============

/**
 * ส่ง Push Message ไปยัง LINE User
 */
export async function sendPushMessage(
  lineUserId: string,
  messages: LineMessage[]
): Promise<LinePushResponse> {
  const result = await lineApiRequest("/message/push", {
    method: "POST",
    body: {
      to: lineUserId,
      messages: messages.slice(0, 5), // LINE allows max 5 messages per request
    },
  })
  if (!result.success) {
    console.error("[LINE] Push message failed:", result.error)
    return { success: false, error: result.error }
  }
  return { success: true }
}

/**
 * ส่ง Reply Message (ตอบกลับ event จาก webhook)
 */
export async function sendReplyMessage(
  replyToken: string,
  messages: LineMessage[]
): Promise<LinePushResponse> {
  const result = await lineApiRequest("/message/reply", {
    method: "POST",
    body: {
      replyToken,
      messages: withDefaultReplyQuickReply(messages).slice(0, 5),
    },
  })
  if (!result.success) {
    console.error("[LINE] Reply message failed:", result.error)
    return { success: false, error: result.error }
  }
  return { success: true }
}

/**
 * ตรวจสอบ LINE Webhook Signature
 */
// ============ Rich Menu Utilities ============
export async function listRichMenus(): Promise<LineRichMenuListResponse> {
  const result = await lineApiRequest<{ richmenus?: LineRichMenu[] }>("/richmenu/list", {
    method: "GET",
  })
  if (!result.success) {
    console.error("[LINE] List rich menus failed:", result.error)
    return { success: false, error: result.error }
  }
  const richMenus = Array.isArray(result.data?.richmenus)
    ? result.data.richmenus
    : []
  return { success: true, richMenus }
}

export async function getDefaultRichMenu(): Promise<LineRichMenuIdResponse> {
  const result = await lineApiRequest<{ richMenuId?: string }>("/user/all/richmenu", {
    method: "GET",
  })
  if (!result.success) {
    if (result.status === 404) {
      return { success: true, richMenuId: null }
    }
    console.error("[LINE] Get default rich menu failed:", result.error)
    return { success: false, error: result.error }
  }
  return {
    success: true,
    richMenuId: result.data?.richMenuId ?? null,
  }
}

export async function setDefaultRichMenu(richMenuId: string): Promise<LinePushResponse> {
  const result = await lineApiRequest(
    `/user/all/richmenu/${encodeURIComponent(richMenuId)}`,
    { method: "POST" }
  )
  if (!result.success) {
    console.error("[LINE] Set default rich menu failed:", result.error)
    return { success: false, error: result.error }
  }
  return { success: true }
}

export async function clearDefaultRichMenu(): Promise<LinePushResponse> {
  const result = await lineApiRequest("/user/all/richmenu", { method: "DELETE" })
  if (!result.success) {
    if (result.status === 404) return { success: true }
    console.error("[LINE] Clear default rich menu failed:", result.error)
    return { success: false, error: result.error }
  }
  return { success: true }
}

export async function getUserRichMenu(lineUserId: string): Promise<LineRichMenuIdResponse> {
  const result = await lineApiRequest<{ richMenuId?: string }>(
    `/user/${encodeURIComponent(lineUserId)}/richmenu`,
    { method: "GET" }
  )
  if (!result.success) {
    if (result.status === 404) {
      return { success: true, richMenuId: null }
    }
    console.error("[LINE] Get user rich menu failed:", result.error)
    return { success: false, error: result.error }
  }
  return {
    success: true,
    richMenuId: result.data?.richMenuId ?? null,
  }
}

export async function linkRichMenuToUser(
  lineUserId: string,
  richMenuId: string
): Promise<LinePushResponse> {
  const result = await lineApiRequest(
    `/user/${encodeURIComponent(lineUserId)}/richmenu/${encodeURIComponent(richMenuId)}`,
    { method: "POST" }
  )
  if (!result.success) {
    console.error("[LINE] Link rich menu to user failed:", result.error)
    return { success: false, error: result.error }
  }
  return { success: true }
}

export async function removeRichMenuFromUser(lineUserId: string): Promise<LinePushResponse> {
  const result = await lineApiRequest(`/user/${encodeURIComponent(lineUserId)}/richmenu`, {
    method: "DELETE",
  })
  if (!result.success) {
    if (result.status === 404) return { success: true }
    console.error("[LINE] Remove user rich menu failed:", result.error)
    return { success: false, error: result.error }
  }
  return { success: true }
}

export async function applyDefaultRichMenuToUser(
  lineUserId: string
): Promise<LineRichMenuApplyResponse> {
  const richMenuId = getDefaultRichMenuId()
  if (!richMenuId) {
    return { success: true, skipped: true, richMenuId: null }
  }
  const linked = await linkRichMenuToUser(lineUserId, richMenuId)
  if (!linked.success) {
    return { success: false, error: linked.error, richMenuId }
  }
  return { success: true, richMenuId }
}

/**
 * Verify LINE webhook signature
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
