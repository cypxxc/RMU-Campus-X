"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { authFetchJson } from "@/lib/api-client"
import type { UserStatus } from "@/types"
import { toast } from "sonner"

interface AccountStatusCheck {
  isAllowed: boolean
  status: UserStatus
  message?: string
  suspendedUntil?: Date
}

function parseSuspendedUntil(su: unknown): Date | undefined {
  if (!su) return undefined
  if (typeof su === "string") return new Date(su)
  if (typeof su === "object" && su !== null && "_seconds" in su && typeof (su as { _seconds: number })._seconds === "number") {
    return new Date((su as { _seconds: number })._seconds * 1000)
  }
  if (typeof su === "object" && su !== null && "toDate" in su && typeof (su as { toDate: () => Date }).toDate === "function") {
    return (su as { toDate: () => Date }).toDate()
  }
  return undefined
}

/**
 * โหลดโปรไฟล์ผู้ใช้ผ่าน API (ไม่ใช้ Firestore บน client)
 */
async function fetchMeProfile(): Promise<{
  status: UserStatus
  restrictions?: { canPost?: boolean; canExchange?: boolean; canChat?: boolean }
  bannedReason?: string
  warningCount?: number
  suspendedUntil?: Date
} | null> {
  try {
    const res = await authFetchJson<{ user?: Record<string, unknown> }>("/api/users/me", { method: "GET" })
    const u = res?.data?.user
    if (!u) return null
    const status = (u.status as UserStatus) || "ACTIVE"
    const restrictions = u.restrictions as { canPost?: boolean; canExchange?: boolean; canChat?: boolean } | undefined
    const suspendedUntil = parseSuspendedUntil(u.suspendedUntil)
    return {
      status,
      restrictions,
      bannedReason: String(u.bannedReason ?? ""),
      warningCount: Number(u.warningCount) || 0,
      suspendedUntil,
    }
  } catch {
    return null
  }
}

/**
 * Hook สำหรับตรวจสอบสถานะบัญชีผู้ใช้
 * โหลดผ่าน API ทั้งหมด (ไม่ใช้ Firestore)
 */
export function useAccountStatus() {
  const { user } = useAuth()
  const [userStatus, setUserStatus] = useState<UserStatus>("ACTIVE")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetchMeProfile().then((profile) => {
      if (cancelled) return
      if (profile) setUserStatus(profile.status)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [user])

  /**
   * ตรวจสอบว่าผู้ใช้สามารถโพสต์ของได้หรือไม่
   */
  const canPost = async (): Promise<AccountStatusCheck> => {
    if (!user) {
      router.push("/login")
      return { isAllowed: false, status: "ACTIVE", message: "กรุณาเข้าสู่ระบบก่อน" }
    }
    const profile = await fetchMeProfile()
    if (!profile) return { isAllowed: false, status: "ACTIVE", message: "ไม่พบข้อมูลผู้ใช้" }
    const { status, restrictions, bannedReason, suspendedUntil, warningCount } = profile

    if (status === "BANNED") {
      toast.error("บัญชีถูกระงับถาวร", {
        description: `เหตุผล: ${bannedReason || "ไม่ระบุเหตุผล"}\nกรุณาติดต่อทีมสนับสนุนหากคุณคิดว่านี่เป็นข้อผิดพลาด`,
        duration: 5000,
      })
      return { isAllowed: false, status, message: `บัญชีถูกแบนถาวร: ${bannedReason || "ไม่ระบุเหตุผล"}` }
    }

    if (status === "SUSPENDED") {
      const until = suspendedUntil
      if (until) {
        const now = new Date()
        if (until <= now) {
          return { isAllowed: true, status: "ACTIVE" }
        }
        const daysLeft = Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        toast.error("บัญชีถูกระงับชั่วคราว", {
          description: `บัญชีของคุณถูกระงับจนถึง ${until.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}\nเหลืออีก ${daysLeft} วัน`,
          duration: 5000,
        })
        return { isAllowed: false, status, message: `บัญชีถูกระงับจนถึง ${until.toLocaleDateString("th-TH")}`, suspendedUntil: until }
      }
      toast.error("บัญชีถูกระงับชั่วคราว", { description: "กรุณาติดต่อทีมสนับสนุนสำหรับข้อมูลเพิ่มเติม", duration: 5000 })
      return { isAllowed: false, status, message: "บัญชีถูกระงับชั่วคราว" }
    }

    if (restrictions && !restrictions.canPost) {
      toast.error("ไม่สามารถโพสต์ของได้", {
        description: "บัญชีของคุณถูกจำกัดสิทธิ์การโพสต์ของ กรุณาติดต่อทีมสนับสนุน",
        duration: 5000,
      })
      return { isAllowed: false, status, message: "ถูกจำกัดสิทธิ์การโพสต์" }
    }

    if (status === "WARNING" && (warningCount || 0) > 0) {
      toast.warning("คำเตือน: บัญชีของคุณได้รับการเตือน", {
        description: `คุณได้รับคำเตือน ${warningCount} ครั้ง หากได้รับคำเตือนเพิ่มเติม บัญชีอาจถูกระงับ`,
        duration: 4000,
      })
    }
    return { isAllowed: true, status }
  }

  /**
   * ตรวจสอบว่าผู้ใช้สามารถแลกเปลี่ยนได้หรือไม่
   */
  const canExchange = async (): Promise<AccountStatusCheck> => {
    if (!user) {
      router.push("/login")
      return { isAllowed: false, status: "ACTIVE", message: "กรุณาเข้าสู่ระบบก่อน" }
    }
    const profile = await fetchMeProfile()
    if (!profile) return { isAllowed: false, status: "ACTIVE", message: "ไม่พบข้อมูลผู้ใช้" }
    const { status, restrictions, bannedReason, suspendedUntil, warningCount } = profile

    if (status === "BANNED") {
      toast.error("บัญชีถูกระงับถาวร", {
        description: `เหตุผล: ${bannedReason || "ไม่ระบุเหตุผล"}\nไม่สามารถทำการแลกเปลี่ยนได้`,
        duration: 5000,
      })
      return { isAllowed: false, status, message: `บัญชีถูกแบนถาวร: ${bannedReason || "ไม่ระบุเหตุผล"}` }
    }

    if (status === "SUSPENDED") {
      const until = suspendedUntil
      if (until && until <= new Date()) return { isAllowed: true, status: "ACTIVE" }
      if (until) {
        toast.error("บัญชีถูกระงับชั่วคราว", {
          description: `ไม่สามารถทำการแลกเปลี่ยนได้จนถึง ${until.toLocaleDateString("th-TH")}`,
          duration: 5000,
        })
        return { isAllowed: false, status, suspendedUntil: until }
      }
      toast.error("บัญชีถูกระงับชั่วคราว", { description: "ไม่สามารถทำการแลกเปลี่ยนได้ในขณะนี้", duration: 5000 })
      return { isAllowed: false, status }
    }

    if (restrictions && !restrictions.canExchange) {
      toast.error("ไม่สามารถแลกเปลี่ยนได้", {
        description: "บัญชีของคุณถูกจำกัดสิทธิ์การแลกเปลี่ยน กรุณาติดต่อทีมสนับสนุน",
        duration: 5000,
      })
      return { isAllowed: false, status, message: "ถูกจำกัดสิทธิ์การแลกเปลี่ยน" }
    }

    if (status === "WARNING" && (warningCount || 0) > 0) {
      toast.warning("คำเตือน", {
        description: `บัญชีของคุณได้รับคำเตือน ${warningCount} ครั้ง กรุณาปฏิบัติตามกฎระเบียบ`,
        duration: 3000,
      })
    }
    return { isAllowed: true, status }
  }

  /**
   * ตรวจสอบว่าผู้ใช้สามารถแชทได้หรือไม่
   */
  const canChat = async (): Promise<AccountStatusCheck> => {
    if (!user) {
      router.push("/login")
      return { isAllowed: false, status: "ACTIVE", message: "กรุณาเข้าสู่ระบบก่อน" }
    }
    const profile = await fetchMeProfile()
    if (!profile) return { isAllowed: false, status: "ACTIVE", message: "ไม่พบข้อมูลผู้ใช้" }
    const { status, restrictions } = profile

    if (status === "BANNED") {
      toast.error("บัญชีถูกระงับถาวร", { description: "ไม่สามารถใช้งานแชทได้", duration: 5000 })
      return { isAllowed: false, status }
    }
    if (status === "SUSPENDED") {
      toast.error("บัญชีถูกระงับชั่วคราว", { description: "ไม่สามารถใช้งานแชทได้ในขณะนี้", duration: 5000 })
      return { isAllowed: false, status }
    }
    if (restrictions && !restrictions.canChat) {
      toast.error("ไม่สามารถแชทได้", { description: "บัญชีของคุณถูกจำกัดสิทธิ์การแชท", duration: 5000 })
      return { isAllowed: false, status, message: "ถูกจำกัดสิทธิ์การแชท" }
    }
    return { isAllowed: true, status }
  }

  return {
    userStatus,
    loading,
    canPost,
    canExchange,
    canChat,
  }
}
