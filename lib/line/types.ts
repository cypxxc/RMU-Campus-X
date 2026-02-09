/**
 * LINE Service Types
 */

export interface LineTextMessage {
  type: "text"
  text: string
  quickReply?: LineQuickReply
}

export interface LineFlexMessage {
  type: "flex"
  altText: string
  contents: object
  quickReply?: LineQuickReply
}

export type LineMessage = LineTextMessage | LineFlexMessage

export interface LineQuickReplyAction {
  type: "message"
  label: string
  text: string
}

export interface LineQuickReplyItem {
  type: "action"
  action: LineQuickReplyAction
}

export interface LineQuickReply {
  items: LineQuickReplyItem[]
}

export interface LinePushResponse {
  success: boolean
  error?: string
}

export interface FlexBubbleOptions {
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
}

export interface ExchangeRequestFlexOptions {
  itemTitle: string
  requesterName: string
  itemImage?: string
  chatUrl: string
}

export interface ItemPostedFlexOptions {
  itemTitle: string
  itemImage?: string
  itemUrl: string
}

export interface StatusChangeFlexOptions {
  itemTitle: string
  status: "accepted" | "rejected" | "cancelled" | "completed" | "in_progress"
  chatUrl: string
}

export interface ChatMessageFlexOptions {
  senderName: string
  itemTitle: string
  messagePreview: string
  chatUrl: string
}

export interface WarningFlexOptions {
  reason: string
  warningCount: number
}
