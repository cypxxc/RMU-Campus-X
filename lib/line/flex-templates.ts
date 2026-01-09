/**
 * LINE Flex Message Templates
 * Reusable Flex Message templates for various notification types
 */

import type { 
  LineFlexMessage, 
  FlexBubbleOptions,
  ExchangeRequestFlexOptions,
  ItemPostedFlexOptions,
  StatusChangeFlexOptions,
  ChatMessageFlexOptions,
  WarningFlexOptions
} from "./types"

// ============ Base Bubble Template ============

/**
 * สร้าง Flex Bubble สำหรับการแจ้งเตือนสิ่งของ (พร้อมรูป)
 */
export function createItemBubble(options: FlexBubbleOptions): object {
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

// ============ Specific Flex Templates ============

/**
 * สร้าง Flex Message สำหรับคำขอแลกเปลี่ยน
 */
export function createExchangeRequestFlex(options: ExchangeRequestFlexOptions): LineFlexMessage {
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
export function createItemPostedFlex(options: ItemPostedFlexOptions): LineFlexMessage {
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
export function createStatusChangeFlex(options: StatusChangeFlexOptions): LineFlexMessage {
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
        ? "ขอบคุณที่ใช้บริการ RMU-Campus X!"
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
export function createChatMessageFlex(options: ChatMessageFlexOptions): LineFlexMessage {
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
export function createWarningFlex(options: WarningFlexOptions): LineFlexMessage {
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
