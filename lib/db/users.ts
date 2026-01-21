import { checkAndAutoUnsuspend as checkAutoUnsuspend } from "./users-auto-unsuspend"

export { updateUserProfile, getUserProfile, getUserPublicProfile } from "./users-profile"
export { updateUserStatus, issueWarning, deleteUserAndData } from "./users-status"
export { getUserWarnings, getAllWarnings } from "./users-warnings"
export { getUserLineSettings, updateUserLineSettings, linkLineAccount, unlinkLineAccount } from "./users-line"

const AUTO_UNSUSPEND_TITLE = "🔓 บัญชีของคุณถูกปลดล็อคแล้ว"
const AUTO_UNSUSPEND_MESSAGE = "ระยะเวลาระงับบัญชีของคุณสิ้นสุดแล้ว คุณสามารถใช้งานได้ตามปกติ"

export const checkAndAutoUnsuspend = async (userId: string, existingUserData?: any): Promise<boolean> => {
  return checkAutoUnsuspend(userId, existingUserData, {
    title: AUTO_UNSUSPEND_TITLE,
    message: AUTO_UNSUSPEND_MESSAGE,
  })
}
