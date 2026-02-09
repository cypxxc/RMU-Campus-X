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
  LineQuickReply,
  LineQuickReplyItem,
  LineQuickReplyAction,
  LinePushResponse,
  LineRichMenuAction,
  LineRichMenuBounds,
  LineRichMenuArea,
  LineRichMenuSize,
  LineRichMenu,
  LineRichMenuListResponse,
  LineRichMenuIdResponse,
  LineRichMenuApplyResponse,
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
  getDefaultRichMenuId,
  listRichMenus,
  getDefaultRichMenu,
  setDefaultRichMenu,
  clearDefaultRichMenu,
  getUserRichMenu,
  linkRichMenuToUser,
  removeRichMenuFromUser,
  applyDefaultRichMenuToUser,
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
  notifyItemEditedByAdmin,
  // Account linking
  sendLinkCodeMessage,
  sendLinkSuccessMessage,
} from "./notifications"
