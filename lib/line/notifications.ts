/**
 * LINE Notification Functions
 * High-level functions for sending various notification types
 */

import type { ExchangeStatus } from "@/types"
import { getReportTypeLabel } from "@/lib/reports/report-types"
import type { LinePushResponse, LineTextMessage } from "./types"
import { sendPushMessage, sendReplyMessage } from "./core"

class LineNotificationService {
  // ============ Exchange Notifications ============

  /**
   * แจ้งเตือนเจ้าของสิ่งของเมื่อมีคนขอรับ (ข้อความแจ้งเตือนอย่างเดียว)
   */
  async notifyExchangeRequest(
    ownerLineUserId: string,
    itemTitle: string,
    requesterName: string,
    _exchangeId: string,
    _baseUrl: string,
    _itemImage?: string
  ): Promise<LinePushResponse> {
    const message: LineTextMessage = {
      type: "text",
      text: `📦 มีคนขอรับสิ่งของของคุณ

🏷️ รายการ: ${itemTitle}
👤 ผู้ขอ: ${requesterName}

💬 ตอบผ่าน LINE ได้เลย: พิมพ์ "แชท" ในแชทนี้ แล้วเลือกรายการนี้
(หรือเข้าเว็บแอป → การแลกเปลี่ยนของฉัน)`,
    }
    return sendPushMessage(ownerLineUserId, [message])
  }

/**
 * แจ้งเตือนเมื่อสถานะการแลกเปลี่ยนเปลี่ยน
 */
  async notifyExchangeStatusChange(
    lineUserId: string,
    itemTitle: string,
    status: ExchangeStatus,
    _exchangeId: string,
    _baseUrl: string
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
      text: `${statusInfo.emoji} อัปเดตสถานะการแลกเปลี่ยน

📦 รายการ: ${itemTitle}
สถานะ: ${statusInfo.text}

(เข้าเว็บแอป → การแลกเปลี่ยนของฉัน)`,
    }

    return sendPushMessage(lineUserId, [message])
  }

/**
 * แจ้งเตือนเมื่อการแลกเปลี่ยนสำเร็จ
 */
  async notifyExchangeCompleted(lineUserId: string, itemTitle: string): Promise<LinePushResponse> {
    const message: LineTextMessage = {
      type: "text",
      text: `✅ การแลกเปลี่ยนสำเร็จ!

📦 ${itemTitle}

ขอบคุณที่ใช้บริการ RMU-Campus X 🙏`,
    }

    return sendPushMessage(lineUserId, [message])
  }

// ============ Admin Notifications ============

/**
 * แจ้งเตือน Admin เมื่อมีรายงานใหม่
 */
  async notifyAdminsNewReport(
    adminLineUserIds: string[],
    reportType: string,
    targetTitle: string,
    reporterEmail: string,
    _baseUrl: string
  ): Promise<void> {
    console.log(`[LINE Admin] Sending report notification to ${adminLineUserIds.length} admin(s)`)
    const reportTypeLabel = getReportTypeLabel(reportType) || reportType

    const message: LineTextMessage = {
      type: "text",
      text: `🚨 [Admin] มีรายงานใหม่

📋 ประเภท: ${reportTypeLabel}
🎯 เป้าหมาย: ${targetTitle}
👤 ผู้รายงาน: ${reporterEmail}

(เข้าเว็บแอป → เข้าสู่ระบบแอดมิน → หน้า Reports)`,
    }

    // ส่งแจ้งเตือนให้ admin ทุกคน (แบบ parallel)
    const results = await Promise.allSettled(
      adminLineUserIds.map((adminId) => sendPushMessage(adminId, [message]))
    )

    // Log results for debugging
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(
          `[LINE Admin] Report notification to admin ${index + 1}: ${result.value.success ? "SUCCESS" : "FAILED - " + result.value.error}`
        )
      } else {
        console.error(`[LINE Admin] Report notification to admin ${index + 1}: REJECTED - ${result.reason}`)
      }
    })
  }

/**
 * แจ้งเตือน Admin เมื่อมี Support Ticket ใหม่
 */
  async notifyAdminsNewSupportTicket(
    adminLineUserIds: string[],
    subject: string,
    category: string,
    userEmail: string,
    _baseUrl: string
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

(เข้าเว็บแอป → เข้าสู่ระบบแอดมิน → หน้า Support)`,
    }

    const results = await Promise.allSettled(
      adminLineUserIds.map((adminId) => sendPushMessage(adminId, [message]))
    )

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(
          `[LINE Admin] Ticket notification to admin ${index + 1}: ${result.value.success ? "SUCCESS" : "FAILED - " + result.value.error}`
        )
      } else {
        console.error(`[LINE Admin] Ticket notification to admin ${index + 1}: REJECTED - ${result.reason}`)
      }
    })
  }

// ============ Item Notifications ============

/**
 * แจ้งเตือนผู้ใช้เมื่อโพสต์สิ่งของสำเร็จ (ข้อความแจ้งเตือนอย่างเดียว)
 */
  async notifyItemPosted(
    lineUserId: string,
    itemTitle: string,
    _itemId: string,
    _baseUrl: string,
    _itemImage?: string
  ): Promise<LinePushResponse> {
    const message: LineTextMessage = {
      type: "text",
      text: `✅ โพสต์สำเร็จ

📦 รายการ: ${itemTitle}

(เข้าเว็บแอป RMU-Campus X → โปรไฟล์ → โพสของฉัน เพื่อดูรายละเอียด)`,
    }
    return sendPushMessage(lineUserId, [message])
  }

/**
 * แจ้งเตือนผู้ใช้เมื่อแก้ไขโพสต์สำเร็จ
 */
  async notifyItemUpdated(
    lineUserId: string,
    itemTitle: string,
    _itemId: string,
    _baseUrl: string
  ): Promise<LinePushResponse> {
    const message: LineTextMessage = {
      type: "text",
      text: `✏️ แก้ไขโพสต์สำเร็จ

📦 รายการ: ${itemTitle}

(เข้าเว็บแอป → โปรไฟล์ → โพสของฉัน)`,
    }

    return sendPushMessage(lineUserId, [message])
  }

/**
 * แจ้งเตือนผู้ใช้เมื่อลบโพสต์สำเร็จ
 */
  async notifyItemDeleted(lineUserId: string, itemTitle: string): Promise<LinePushResponse> {
    const message: LineTextMessage = {
      type: "text",
      text: `🗑️ ลบโพสต์เรียบร้อย

📦 ${itemTitle}

ขอบคุณที่ใช้บริการ RMU-Campus X 🙏`,
    }

    return sendPushMessage(lineUserId, [message])
  }

// ============ Chat Notifications ============

/**
 * แจ้งเตือนเมื่อมีข้อความแชทใหม่
 * รูปแบบเดียวกับข้อความที่ส่งจาก LINE — แสดงเหมือนแชทโดยตรง พร้อมคำใบ้ตอบกลับ
 */
  async notifyNewChatMessage(
    lineUserId: string,
    senderName: string,
    itemTitle: string,
    messagePreview: string,
    _exchangeId: string,
    _baseUrl: string
  ): Promise<LinePushResponse> {
    const senderShort = senderName.split("@")[0] ?? senderName
    const content = messagePreview || "(มีข้อความใหม่)"
    const message: LineTextMessage = {
      type: "text",
      text: `💬 จาก ${senderShort} (รายการ: ${itemTitle})\n\n${content}\n\nพิมพ์ข้อความเพื่อตอบกลับได้`,
    }
    return sendPushMessage(lineUserId, [message])
  }

// ============ User Action Notifications ============

/**
 * แจ้งเตือนผู้ใช้เมื่อถูกรายงาน
 */
  async notifyUserReported(
    lineUserId: string,
    reportType: string,
    targetTitle: string,
    reportReason?: string
  ): Promise<LinePushResponse> {
    const reportTypeLabel = getReportTypeLabel(reportType) || reportType
    const normalizedTargetTitle = targetTitle.trim() || "รายการของคุณ"
    const normalizedReportReason = reportReason?.trim()

    const textLines = [
      "⚠️ แจ้งเตือนจากผู้ดูแลระบบ",
      "",
      `ประเภทการรายงาน: ${reportTypeLabel}`,
      `หัวข้อที่ถูกรายงาน: ${normalizedTargetTitle}`,
      ...(normalizedReportReason ? [`เหตุผล: ${normalizedReportReason}`] : []),
      "",
      "โปรดปรับปรุงพฤติกรรมหรือแก้ไขเนื้อหาให้เหมาะสม",
      "หากมีการกระทำซ้ำ ระบบอาจระงับการใช้งานชั่วคราวหรือถาวร",
    ]

    const message: LineTextMessage = {
      type: "text",
      text: textLines.join("\n"),
    }

    return sendPushMessage(lineUserId, [message])
  }

/**
 * แจ้งเตือนผู้ใช้เมื่อได้รับคำเตือน (ข้อความแจ้งเตือนอย่างเดียว)
 */
  async notifyUserWarning(
    lineUserId: string,
    reason: string,
    warningCount: number
  ): Promise<LinePushResponse> {
    const message: LineTextMessage = {
      type: "text",
      text: `⚠️ คุณได้รับคำเตือนจากระบบ

📋 เหตุผล: ${reason}
🔢 จำนวนคำเตือนสะสม: ${warningCount}

กรุณาปฏิบัติตามแนวทางชุมชน หากได้รับคำเตือนซ้ำอาจถูกระงับหรือแบน`,
    }
    return sendPushMessage(lineUserId, [message])
  }

/**
 * แจ้งเตือนเจ้าของโพสเมื่อผู้ดูแลแก้ไขโพส
 */
  async notifyItemEditedByAdmin(lineUserId: string, itemTitle: string): Promise<LinePushResponse> {
    const message: LineTextMessage = {
      type: "text",
      text: `✏️ แจ้งเตือนจากผู้ดูแลระบบ

โพส "${itemTitle}" ของคุณถูกแก้ไขโดยผู้ดูแล

กรุณาตรวจสอบรายละเอียดบนเว็บแอป`,
    }
    return sendPushMessage(lineUserId, [message])
  }

/**
 * แจ้งเตือนผู้ใช้เมื่อสถานะบัญชีเปลี่ยน (ระงับ/ปลดระงับ)
 */
  async notifyAccountStatusChange(
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
        statusText = "บัญชีของคุณถูกระงับชั่วคราว"
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
 * ส่ง Link Code ให้ผู้ใช้ที่พิมพ์ \"เชื่อมบัญชี\" ใน LINE
 */
  async sendLinkCodeMessage(replyToken: string, linkCode: string): Promise<LinePushResponse> {
    const message: LineTextMessage = {
      type: "text",
      text: `🔗 รหัสเชื่อมบัญชี RMU-Campus X

รหัสของคุณ: ${linkCode}

วิธีใช้รหัส:
1) เข้าเว็บ RMU-Campus X
2) ไปที่ โปรไฟล์ > แจ้งเตือนผ่าน LINE
3) กรอกรหัส 6 หลักนี้ แล้วกดยืนยัน

⏰ รหัสหมดอายุใน 5 นาที
ถ้าหมดอายุ ให้พิมพ์ "เชื่อมบัญชี" เพื่อขอรหัสใหม่`,
    }

    return sendReplyMessage(replyToken, [message])
  }

/**
 * ส่งข้อความยืนยันการเชื่อมบัญชีสำเร็จ
 */
  async sendLinkSuccessMessage(lineUserId: string, displayName: string): Promise<LinePushResponse> {
    const message: LineTextMessage = {
      type: "text",
      text: `✅ เชื่อมบัญชีสำเร็จ!

สวัสดี ${displayName} 👋

บัญชี LINE ของคุณเชื่อมกับ RMU-Campus X เรียบร้อยแล้ว คุณจะได้รับการแจ้งเตือนผ่าน LINE เมื่อ:
• มีคนขอรับสิ่งของของคุณ
• สถานะการแลกเปลี่ยนเปลี่ยน
• การแลกเปลี่ยนสำเร็จ

คำสั่งที่ใช้บ่อย:
• "แชท" เพื่อคุยกับคู่แลกเปลี่ยน
• "สถานะ" เพื่อตรวจสอบการเชื่อม
• "คู่มือ" เพื่อดูวิธีใช้งานทั้งหมด

สามารถปรับตั้งค่าได้ในหน้าโปรไฟล์ครับ`,
    }

    return sendPushMessage(lineUserId, [message])
  }
}

const lineNotificationService = new LineNotificationService()

export async function notifyExchangeRequest(
  ownerLineUserId: string,
  itemTitle: string,
  requesterName: string,
  _exchangeId: string,
  _baseUrl: string,
  _itemImage?: string
): Promise<LinePushResponse> {
  return lineNotificationService.notifyExchangeRequest(
    ownerLineUserId,
    itemTitle,
    requesterName,
    _exchangeId,
    _baseUrl,
    _itemImage
  )
}

export async function notifyExchangeStatusChange(
  lineUserId: string,
  itemTitle: string,
  status: ExchangeStatus,
  _exchangeId: string,
  _baseUrl: string
): Promise<LinePushResponse> {
  return lineNotificationService.notifyExchangeStatusChange(
    lineUserId,
    itemTitle,
    status,
    _exchangeId,
    _baseUrl
  )
}

export async function notifyExchangeCompleted(
  lineUserId: string,
  itemTitle: string
): Promise<LinePushResponse> {
  return lineNotificationService.notifyExchangeCompleted(lineUserId, itemTitle)
}

export async function notifyAdminsNewReport(
  adminLineUserIds: string[],
  reportType: string,
  targetTitle: string,
  reporterEmail: string,
  _baseUrl: string
): Promise<void> {
  return lineNotificationService.notifyAdminsNewReport(
    adminLineUserIds,
    reportType,
    targetTitle,
    reporterEmail,
    _baseUrl
  )
}

export async function notifyAdminsNewSupportTicket(
  adminLineUserIds: string[],
  subject: string,
  category: string,
  userEmail: string,
  _baseUrl: string
): Promise<void> {
  return lineNotificationService.notifyAdminsNewSupportTicket(
    adminLineUserIds,
    subject,
    category,
    userEmail,
    _baseUrl
  )
}

export async function notifyItemPosted(
  lineUserId: string,
  itemTitle: string,
  _itemId: string,
  _baseUrl: string,
  _itemImage?: string
): Promise<LinePushResponse> {
  return lineNotificationService.notifyItemPosted(lineUserId, itemTitle, _itemId, _baseUrl, _itemImage)
}

export async function notifyItemUpdated(
  lineUserId: string,
  itemTitle: string,
  _itemId: string,
  _baseUrl: string
): Promise<LinePushResponse> {
  return lineNotificationService.notifyItemUpdated(lineUserId, itemTitle, _itemId, _baseUrl)
}

export async function notifyItemDeleted(
  lineUserId: string,
  itemTitle: string
): Promise<LinePushResponse> {
  return lineNotificationService.notifyItemDeleted(lineUserId, itemTitle)
}

export async function notifyNewChatMessage(
  lineUserId: string,
  senderName: string,
  itemTitle: string,
  messagePreview: string,
  _exchangeId: string,
  _baseUrl: string
): Promise<LinePushResponse> {
  return lineNotificationService.notifyNewChatMessage(
    lineUserId,
    senderName,
    itemTitle,
    messagePreview,
    _exchangeId,
    _baseUrl
  )
}

export async function notifyUserReported(
  lineUserId: string,
  reportType: string,
  targetTitle: string,
  reportReason?: string
): Promise<LinePushResponse> {
  return lineNotificationService.notifyUserReported(lineUserId, reportType, targetTitle, reportReason)
}

export async function notifyUserWarning(
  lineUserId: string,
  reason: string,
  warningCount: number
): Promise<LinePushResponse> {
  return lineNotificationService.notifyUserWarning(lineUserId, reason, warningCount)
}

export async function notifyItemEditedByAdmin(
  lineUserId: string,
  itemTitle: string
): Promise<LinePushResponse> {
  return lineNotificationService.notifyItemEditedByAdmin(lineUserId, itemTitle)
}

export async function notifyAccountStatusChange(
  lineUserId: string,
  status: "ACTIVE" | "SUSPENDED" | "BANNED",
  reason?: string,
  suspendedUntil?: Date
): Promise<LinePushResponse> {
  return lineNotificationService.notifyAccountStatusChange(lineUserId, status, reason, suspendedUntil)
}

export async function sendLinkCodeMessage(
  replyToken: string,
  linkCode: string
): Promise<LinePushResponse> {
  return lineNotificationService.sendLinkCodeMessage(replyToken, linkCode)
}

export async function sendLinkSuccessMessage(
  lineUserId: string,
  displayName: string
): Promise<LinePushResponse> {
  return lineNotificationService.sendLinkSuccessMessage(lineUserId, displayName)
}
