/**
 * LINE Messaging API Service
 * ส่ง Push Message ไปยังผู้ใช้ผ่าน LINE
 * 
 * @see https://developers.line.biz/en/docs/messaging-api/
 */

import type { ExchangeStatus } from "@/types"

// ============ Types ============

interface LineTextMessage {
  type: "text"
  text: string
}

interface LineFlexMessage {
  type: "flex"
  altText: string
  contents: object
}

type LineMessage = LineTextMessage | LineFlexMessage

interface LinePushResponse {
  success: boolean
  error?: string
}

// ============ Configuration ============

const LINE_API_BASE = "https://api.line.me/v2/bot"

function getChannelAccessToken(): string | null {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN is not configured - skipping LINE notification")
    return null
  }
  return token
}

function getChannelSecret(): string | null {
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
    if (!channelSecret) return false
    
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
    
    return hash === signature
  } catch (error) {
    console.error("[LINE] Signature verification error:", error)
    return false
  }
}

// ============ Flex Message Templates ============

/**
 * สร้าง Flex Bubble สำหรับการแจ้งเตือนสิ่งของ (พร้อมรูป)
 */
function createItemBubble(options: {
  title: string
  subtitle: string
  description?: string
  imageUrl?: string
  primaryButtonText: string
  primaryButtonUrl: string
  secondaryButtonText?: string
  secondaryButtonUrl?: string
  headerColor?: string
  accentColor?: string
}): object {
  const {
    title,
    subtitle,
    description,
    imageUrl,
    primaryButtonText,
    primaryButtonUrl,
    secondaryButtonText,
    secondaryButtonUrl,
    headerColor = "#00B900",
    accentColor = "#00B900"
  } = options

  const bubble: any = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: subtitle,
          color: "#ffffff",
          size: "xs",
          weight: "bold"
        }
      ],
      backgroundColor: headerColor,
      paddingAll: "12px"
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: title,
          weight: "bold",
          size: "lg",
          wrap: true,
          color: "#1a1a1a"
        }
      ],
      spacing: "md",
      paddingAll: "16px"
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          action: {
            type: "uri",
            label: primaryButtonText,
            uri: primaryButtonUrl
          },
          style: "primary",
          color: accentColor,
          height: "sm"
        }
      ],
      spacing: "sm",
      paddingAll: "12px"
    }
  }

  // Add image if provided
  if (imageUrl) {
    bubble.hero = {
      type: "image",
      url: imageUrl,
      size: "full",
      aspectRatio: "16:9",
      aspectMode: "cover"
    }
  }

  // Add description if provided
  if (description) {
    bubble.body.contents.push({
      type: "text",
      text: description,
      size: "sm",
      color: "#666666",
      wrap: true,
      margin: "md"
    })
  }

  // Add secondary button if provided
  if (secondaryButtonText && secondaryButtonUrl) {
    bubble.footer.contents.push({
      type: "button",
      action: {
        type: "uri",
        label: secondaryButtonText,
        uri: secondaryButtonUrl
      },
      style: "secondary",
      height: "sm"
    })
  }

  return bubble
}

/**
 * สร้าง Flex Message สำหรับคำขอแลกเปลี่ยน
 */
export function createExchangeRequestFlex(options: {
  itemTitle: string
  requesterName: string
  itemImage?: string
  chatUrl: string
}): LineFlexMessage {
  const { itemTitle, requesterName, itemImage, chatUrl } = options

  return {
    type: "flex",
    altText: `📦 มีคนขอรับ "${itemTitle}"`,
    contents: createItemBubble({
      title: `📦 ${itemTitle}`,
      subtitle: "🎁 มีคนขอรับสิ่งของของคุณ!",
      description: `👤 ผู้ขอ: ${requesterName}`,
      imageUrl: itemImage,
      primaryButtonText: "💬 เปิดแชท",
      primaryButtonUrl: chatUrl,
      headerColor: "#00B900",
      accentColor: "#00B900"
    })
  }
}

/**
 * สร้าง Flex Message สำหรับโพสต์สิ่งของสำเร็จ
 */
export function createItemPostedFlex(options: {
  itemTitle: string
  itemImage?: string
  itemUrl: string
}): LineFlexMessage {
  const { itemTitle, itemImage, itemUrl } = options

  return {
    type: "flex",
    altText: `✅ โพสต์สำเร็จ: ${itemTitle}`,
    contents: createItemBubble({
      title: `📦 ${itemTitle}`,
      subtitle: "✅ โพสต์สิ่งของสำเร็จ!",
      description: "สิ่งของของคุณพร้อมให้คนอื่นขอรับแล้ว",
      imageUrl: itemImage,
      primaryButtonText: "🔗 ดูโพสต์",
      primaryButtonUrl: itemUrl,
      headerColor: "#06C755",
      accentColor: "#06C755"
    })
  }
}

/**
 * สร้าง Flex Message สำหรับสถานะเปลี่ยน
 */
export function createStatusChangeFlex(options: {
  itemTitle: string
  status: "accepted" | "rejected" | "cancelled" | "completed" | "in_progress"
  chatUrl: string
}): LineFlexMessage {
  const { itemTitle, status, chatUrl } = options

  const statusConfig: Record<string, { emoji: string; text: string; color: string }> = {
    accepted: { emoji: "✅", text: "ตอบรับแล้ว!", color: "#00B900" },
    rejected: { emoji: "😔", text: "ถูกปฏิเสธ", color: "#FF6B6B" },
    cancelled: { emoji: "❌", text: "ถูกยกเลิก", color: "#999999" },
    completed: { emoji: "🎉", text: "แลกเปลี่ยนสำเร็จ!", color: "#FFB800" },
    in_progress: { emoji: "🔄", text: "กำลังดำเนินการ", color: "#4B95E9" }
  }

  const defaultConfig = { emoji: "🔄", text: "กำลังดำเนินการ", color: "#4B95E9" }
  const config = statusConfig[status] ?? defaultConfig

  return {
    type: "flex",
    altText: `${config.emoji} ${config.text}: ${itemTitle}`,
    contents: createItemBubble({
      title: `📦 ${itemTitle}`,
      subtitle: `${config.emoji} ${config.text}`,
      description: status === "accepted" 
        ? "กรุณานัดหมายเวลาและสถานที่เพื่อรับของ" 
        : status === "completed"
        ? "ขอบคุณที่ใช้บริการ RMU Exchange!"
        : "",
      primaryButtonText: "💬 ไปที่แชท",
      primaryButtonUrl: chatUrl,
      headerColor: config.color,
      accentColor: config.color
    })
  }
}

/**
 * สร้าง Flex Message สำหรับข้อความแชทใหม่
 */
export function createChatMessageFlex(options: {
  senderName: string
  itemTitle: string
  messagePreview: string
  chatUrl: string
}): LineFlexMessage {
  const { senderName, itemTitle, messagePreview, chatUrl } = options

  return {
    type: "flex",
    altText: `💬 ${senderName}: ${messagePreview}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "💬 ข้อความใหม่",
            color: "#ffffff",
            size: "xs",
            weight: "bold"
          }
        ],
        backgroundColor: "#4B95E9",
        paddingAll: "12px"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `📦 ${itemTitle}`,
            weight: "bold",
            size: "sm",
            color: "#666666"
          },
          {
            type: "text",
            text: `👤 ${senderName}`,
            size: "lg",
            weight: "bold",
            margin: "sm",
            color: "#1a1a1a"
          },
          {
            type: "text",
            text: `"${messagePreview.slice(0, 50)}${messagePreview.length > 50 ? '...' : ''}"`,
            size: "sm",
            color: "#888888",
            wrap: true,
            margin: "md"
          }
        ],
        paddingAll: "16px"
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "💬 ตอบกลับ",
              uri: chatUrl
            },
            style: "primary",
            color: "#4B95E9",
            height: "sm"
          }
        ],
        paddingAll: "12px"
      }
    }
  }
}

/**
 * สร้าง Flex Message สำหรับคำเตือน
 */
export function createWarningFlex(options: {
  reason: string
  warningCount: number
}): LineFlexMessage {
  const { reason, warningCount } = options

  return {
    type: "flex",
    altText: `⚠️ คุณได้รับคำเตือนครั้งที่ ${warningCount}`,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `⚠️ คำเตือนครั้งที่ ${warningCount}`,
            color: "#ffffff",
            size: "sm",
            weight: "bold"
          }
        ],
        backgroundColor: "#FF6B6B",
        paddingAll: "12px"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "คุณได้รับคำเตือนจากผู้ดูแลระบบ",
            weight: "bold",
            size: "md",
            color: "#1a1a1a"
          },
          {
            type: "text",
            text: `เหตุผล: ${reason}`,
            size: "sm",
            color: "#666666",
            wrap: true,
            margin: "md"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: warningCount >= 3 
              ? "⛔ หากได้รับคำเตือนอีก คุณอาจถูกระงับบัญชี"
              : "กรุณาปฏิบัติตามกฎของชุมชน",
            size: "xs",
            color: warningCount >= 3 ? "#FF0000" : "#999999",
            wrap: true,
            margin: "md"
          }
        ],
        paddingAll: "16px"
      }
    }
  }
}

// ============ Notification Functions ============

/**
 * แจ้งเตือนเจ้าของสิ่งของเมื่อมีคนขอรับ (Flex Message)
 */
export async function notifyExchangeRequest(
  ownerLineUserId: string,
  itemTitle: string,
  requesterName: string,
  exchangeId: string,
  baseUrl: string,
  itemImage?: string
): Promise<LinePushResponse> {
  const flexMessage = createExchangeRequestFlex({
    itemTitle,
    requesterName,
    itemImage,
    chatUrl: `${baseUrl}/chat/${exchangeId}`
  })

  return sendPushMessage(ownerLineUserId, [flexMessage])
}

/**
 * แจ้งเตือนเมื่อสถานะการแลกเปลี่ยนเปลี่ยน
 */
export async function notifyExchangeStatusChange(
  lineUserId: string,
  itemTitle: string,
  status: ExchangeStatus,
  _exchangeId: string,
  baseUrl: string
): Promise<LinePushResponse> {
  const statusMessages: Record<ExchangeStatus, { emoji: string; text: string }> = {
    pending: { emoji: "⏳", text: "รอการตอบรับ" },
    accepted: { emoji: "✅", text: "ตอบรับแล้ว! กรุณานัดหมายเพื่อรับของ" },
    in_progress: { emoji: "🔄", text: "กำลังดำเนินการ" },
    completed: { emoji: "🎉", text: "การแลกเปลี่ยนสำเร็จ!" },
    cancelled: { emoji: "❌", text: "ถูกยกเลิก" },
    rejected: { emoji: "😔", text: "ถูกปฏิเสธ" },
  }

  const statusInfo = statusMessages[status] || { emoji: "📦", text: status }

  const message: LineTextMessage = {
    type: "text",
    text: `${statusInfo.emoji} อัปเดตสถานะ

📦 ${itemTitle}
สถานะ: ${statusInfo.text}

${baseUrl}/my-exchanges`,
  }

  return sendPushMessage(lineUserId, [message])
}

/**
 * แจ้งเตือนเมื่อการแลกเปลี่ยนสำเร็จ
 */
export async function notifyExchangeCompleted(
  lineUserId: string,
  itemTitle: string
): Promise<LinePushResponse> {
  const message: LineTextMessage = {
    type: "text",
    text: `✅ การแลกเปลี่ยนสำเร็จ!

📦 ${itemTitle}

ขอบคุณที่ใช้บริการ ShareHub 🙏`,
  }

  return sendPushMessage(lineUserId, [message])
}

/**
 * แจ้งเตือน Admin เมื่อมีรายงานใหม่
 */
export async function notifyAdminsNewReport(
  adminLineUserIds: string[],
  reportType: string,
  targetTitle: string,
  reporterEmail: string,
  baseUrl: string
): Promise<void> {
  console.log(`[LINE Admin] Sending report notification to ${adminLineUserIds.length} admin(s)`)
  
  const reportTypeLabels: Record<string, string> = {
    item_report: "รายงานสิ่งของ",
    exchange_report: "รายงานการแลกเปลี่ยน",
    chat_report: "รายงานแชท",
    user_report: "รายงานผู้ใช้",
  }

  const message: LineTextMessage = {
    type: "text",
    text: `🚨 [Admin] มีรายงานใหม่

📋 ประเภท: ${reportTypeLabels[reportType] || reportType}
🎯 เป้าหมาย: ${targetTitle}
👤 ผู้รายงาน: ${reporterEmail}

กรุณาตรวจสอบ: ${baseUrl}/admin/reports`,
  }

  // ส่งแจ้งเตือนให้ admin ทุกคน (แบบ parallel)
  const results = await Promise.allSettled(
    adminLineUserIds.map((adminId) => sendPushMessage(adminId, [message]))
  )
  
  // Log results for debugging
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`[LINE Admin] Report notification to admin ${index + 1}: ${result.value.success ? 'SUCCESS' : 'FAILED - ' + result.value.error}`)
    } else {
      console.error(`[LINE Admin] Report notification to admin ${index + 1}: REJECTED - ${result.reason}`)
    }
  })
}

/**
 * แจ้งเตือน Admin เมื่อมี Support Ticket ใหม่
 */
export async function notifyAdminsNewSupportTicket(
  adminLineUserIds: string[],
  subject: string,
  category: string,
  userEmail: string,
  baseUrl: string
): Promise<void> {
  console.log(`[LINE Admin] Sending support ticket notification to ${adminLineUserIds.length} admin(s)`)
  
  const categoryLabels: Record<string, string> = {
    general: "ทั่วไป",
    bug: "แจ้งปัญหา",
    feature: "ขอฟีเจอร์",
    account: "บัญชีผู้ใช้",
    other: "อื่นๆ",
  }

  const message: LineTextMessage = {
    type: "text",
    text: `📩 [Admin] Support Ticket ใหม่

📌 หัวข้อ: ${subject}
📂 หมวด: ${categoryLabels[category] || category}
👤 จาก: ${userEmail}

กรุณาตรวจสอบ: ${baseUrl}/admin/support`,
  }

  const results = await Promise.allSettled(
    adminLineUserIds.map((adminId) => sendPushMessage(adminId, [message]))
  )
  
  // Log results for debugging
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`[LINE Admin] Ticket notification to admin ${index + 1}: ${result.value.success ? 'SUCCESS' : 'FAILED - ' + result.value.error}`)
    } else {
      console.error(`[LINE Admin] Ticket notification to admin ${index + 1}: REJECTED - ${result.reason}`)
    }
  })
}

// ============ Item Notifications ============

/**
 * แจ้งเตือนผู้ใช้เมื่อโพสต์สิ่งของสำเร็จ (Flex Message)
 */
export async function notifyItemPosted(
  lineUserId: string,
  itemTitle: string,
  itemId: string,
  baseUrl: string,
  itemImage?: string
): Promise<LinePushResponse> {
  const flexMessage = createItemPostedFlex({
    itemTitle,
    itemImage,
    itemUrl: `${baseUrl}/item/${itemId}`
  })

  return sendPushMessage(lineUserId, [flexMessage])
}

/**
 * แจ้งเตือนผู้ใช้เมื่อแก้ไขโพสต์สำเร็จ
 */
export async function notifyItemUpdated(
  lineUserId: string,
  itemTitle: string,
  itemId: string,
  baseUrl: string
): Promise<LinePushResponse> {
  const message: LineTextMessage = {
    type: "text",
    text: `✏️ แก้ไขโพสต์สำเร็จ!

📦 ${itemTitle}

กดดูโพสต์: ${baseUrl}/item/${itemId}`,
  }

  return sendPushMessage(lineUserId, [message])
}

/**
 * แจ้งเตือนผู้ใช้เมื่อลบโพสต์สำเร็จ
 */
export async function notifyItemDeleted(
  lineUserId: string,
  itemTitle: string
): Promise<LinePushResponse> {
  const message: LineTextMessage = {
    type: "text",
    text: `🗑️ ลบโพสต์เรียบร้อย

📦 ${itemTitle}

ขอบคุณที่ใช้บริการ ShareHub 🙏`,
  }

  return sendPushMessage(lineUserId, [message])
}

// ============ Chat Notifications ============

/**
 * แจ้งเตือนเมื่อมีข้อความแชทใหม่ (Flex Message)
 */
export async function notifyNewChatMessage(
  lineUserId: string,
  senderName: string,
  itemTitle: string,
  messagePreview: string,
  exchangeId: string,
  baseUrl: string
): Promise<LinePushResponse> {
  const flexMessage = createChatMessageFlex({
    senderName,
    itemTitle,
    messagePreview,
    chatUrl: `${baseUrl}/chat/${exchangeId}`
  })

  return sendPushMessage(lineUserId, [flexMessage])
}

// ============ User Action Notifications ============

/**
 * แจ้งเตือนผู้ใช้เมื่อถูกรายงาน
 */
export async function notifyUserReported(
  lineUserId: string,
  reportType: string,
  targetTitle: string
): Promise<LinePushResponse> {
  const reportTypeLabels: Record<string, string> = {
    item_report: "สิ่งของ",
    exchange_report: "การแลกเปลี่ยน",
    chat_report: "ข้อความแชท",
    user_report: "บัญชีผู้ใช้",
  }

  const message: LineTextMessage = {
    type: "text",
    text: `⚠️ แจ้งเตือน

มีผู้รายงาน${reportTypeLabels[reportType] || reportType}ของคุณ
🎯 ${targetTitle}

กรุณาตรวจสอบและปฏิบัติตามกฎของชุมชน`,
  }

  return sendPushMessage(lineUserId, [message])
}

/**
 * แจ้งเตือนผู้ใช้เมื่อได้รับคำเตือน (Flex Message)
 */
export async function notifyUserWarning(
  lineUserId: string,
  reason: string,
  warningCount: number
): Promise<LinePushResponse> {
  const flexMessage = createWarningFlex({
    reason,
    warningCount
  })

  return sendPushMessage(lineUserId, [flexMessage])
}

/**
 * แจ้งเตือนผู้ใช้เมื่อสถานะบัญชีเปลี่ยน (ระงับ/ปลดระงับ)
 */
export async function notifyAccountStatusChange(
  lineUserId: string,
  status: "ACTIVE" | "SUSPENDED" | "BANNED",
  reason?: string,
  suspendedUntil?: Date
): Promise<LinePushResponse> {
  let statusText = ""
  let emoji = ""

  switch (status) {
    case "ACTIVE":
      emoji = "✅"
      statusText = "บัญชีของคุณได้รับการปลดระงับแล้ว คุณสามารถใช้งานได้ตามปกติ"
      break
    case "SUSPENDED":
      emoji = "⏸️"
      statusText = `บัญชีของคุณถูกระงับชั่วคราว`
      if (suspendedUntil) {
        const dateStr = suspendedUntil.toLocaleDateString("th-TH", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
        statusText += `\nจนถึง: ${dateStr}`
      }
      break
    case "BANNED":
      emoji = "🚫"
      statusText = "บัญชีของคุณถูกระงับถาวร"
      break
  }

  let text = `${emoji} อัปเดตสถานะบัญชี

${statusText}`

  if (reason) {
    text += `\n\n📋 เหตุผล: ${reason}`
  }

  const message: LineTextMessage = {
    type: "text",
    text,
  }

  return sendPushMessage(lineUserId, [message])
}

// ============ Account Linking ============


/**
 * ส่ง Link Code ให้ผู้ใช้ที่พิมพ์ "เชื่อมบัญชี" ใน LINE
 */
export async function sendLinkCodeMessage(
  replyToken: string,
  linkCode: string
): Promise<LinePushResponse> {
  const message: LineTextMessage = {
    type: "text",
    text: `🔗 รหัสเชื่อมบัญชี ShareHub

รหัสของคุณคือ: ${linkCode}

กรุณานำรหัสนี้ไปกรอกในหน้าตั้งค่าโปรไฟล์ของคุณบนเว็บไซต์ ShareHub

⏰ รหัสนี้จะหมดอายุใน 5 นาที`,
  }

  return sendReplyMessage(replyToken, [message])
}

/**
 * ส่งข้อความยืนยันการเชื่อมบัญชีสำเร็จ
 */
export async function sendLinkSuccessMessage(
  lineUserId: string,
  displayName: string
): Promise<LinePushResponse> {
  const message: LineTextMessage = {
    type: "text",
    text: `✅ เชื่อมบัญชีสำเร็จ!

สวัสดี ${displayName} 👋

บัญชี LINE ของคุณเชื่อมกับ ShareHub เรียบร้อยแล้ว คุณจะได้รับการแจ้งเตือนผ่าน LINE เมื่อ:
• มีคนขอรับสิ่งของของคุณ
• สถานะการแลกเปลี่ยนเปลี่ยน
• การแลกเปลี่ยนสำเร็จ

สามารถปรับตั้งค่าได้ในหน้าโปรไฟล์ครับ`,
  }

  return sendPushMessage(lineUserId, [message])
}
