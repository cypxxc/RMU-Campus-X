/**
 * LINE Messaging API Service
 * Central export point for all LINE-related functionality
 * 
 * @see https://developers.line.biz/en/docs/messaging-api/
 */

// Export all types
export type {
  LineTextMessage,
  LineFlexMessage,
  LineMessage,
  LinePushResponse,
  FlexBubbleOptions,
  ExchangeRequestFlexOptions,
  ItemPostedFlexOptions,
  StatusChangeFlexOptions,
  ChatMessageFlexOptions,
  WarningFlexOptions,
} from "./types"

// Export core functions
export {
  sendPushMessage,
  sendReplyMessage,
  verifySignature,
  getChannelAccessToken,
  getChannelSecret,
} from "./core"

// Export flex templates
export {
  createItemBubble,
  createExchangeRequestFlex,
  createItemPostedFlex,
  createStatusChangeFlex,
  createChatMessageFlex,
  createWarningFlex,
} from "./flex-templates"

// Export notification functions
export {
  // Exchange notifications
  notifyExchangeRequest,
  notifyExchangeStatusChange,
  notifyExchangeCompleted,
  // Admin notifications
  notifyAdminsNewReport,
  notifyAdminsNewSupportTicket,
  // Item notifications
  notifyItemPosted,
  notifyItemUpdated,
  notifyItemDeleted,
  // Chat notifications
  notifyNewChatMessage,
  // User notifications
  notifyUserReported,
  notifyUserWarning,
  notifyAccountStatusChange,
  // Account linking
  sendLinkCodeMessage,
  sendLinkSuccessMessage,
} from "./notifications"
