"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import type { User, UserStatus } from "@/types"
import { toast } from "sonner"

interface AccountStatusCheck {
  isAllowed: boolean
  status: UserStatus
  message?: string
  suspendedUntil?: Date
}

/**
 * Hook สำหรับตรวจสอบสถานะบัญชีผู้ใช้
 * ใช้ก่อนทำการดำเนินการสำคัญ เช่น โพสต์ของ, แลกเปลี่ยน, แชท
 */
export function useAccountStatus() {
  const [userStatus, setUserStatus] = useState<UserStatus>("ACTIVE")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const auth = getFirebaseAuth()
        const user = auth.currentUser

        if (!user) {
          setLoading(false)
          return
        }

        const db = getFirebaseDb()
        const userDoc = await getDoc(doc(db, "users", user.uid))

        if (userDoc.exists()) {
          const userData = userDoc.data() as User
          setUserStatus(userData.status || "ACTIVE")
        }
      } catch (error) {
        console.error("Error checking account status:", error)
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [])

  /**
   * ตรวจสอบว่าผู้ใช้สามารถโพสต์ของได้หรือไม่
   */
  const canPost = async (): Promise<AccountStatusCheck> => {
    const auth = getFirebaseAuth()
    const user = auth.currentUser

    if (!user) {
      router.push("/login")
      return { isAllowed: false, status: "ACTIVE", message: "กรุณาเข้าสู่ระบบก่อน" }
    }

    const db = getFirebaseDb()
    const userDoc = await getDoc(doc(db, "users", user.uid))

    if (!userDoc.exists()) {
      return { isAllowed: false, status: "ACTIVE", message: "ไม่พบข้อมูลผู้ใช้" }
    }

    const userData = userDoc.data() as User
    const status = userData.status || "ACTIVE"
    const restrictions = userData.restrictions

    // ตรวจสอบสถานะ BANNED
    if (status === "BANNED") {
      const reason = userData.bannedReason || "ไม่ระบุเหตุผล"
      toast.error("บัญชีถูกระงับถาวร", {
        description: `เหตุผล: ${reason}\nกรุณาติดต่อทีมสนับสนุนหากคุณคิดว่านี่เป็นข้อผิดพลาด`,
        duration: 5000,
      })
      return { isAllowed: false, status, message: `บัญชีถูกแบนถาวร: ${reason}` }
    }

    // ตรวจสอบสถานะ SUSPENDED
    if (status === "SUSPENDED") {
      const suspendedUntil = userData.suspendedUntil
      let untilDate: Date | undefined

      if (suspendedUntil && typeof suspendedUntil === "object" && "toDate" in suspendedUntil) {
        untilDate = suspendedUntil.toDate()
        const now = new Date()

        // ถ้าหมดเวลาระงับแล้ว ให้อัปเดตสถานะ
        if (untilDate <= now) {
          // อัปเดตสถานะกลับเป็น ACTIVE ผ่าน checkAndAutoUnsuspend
          const { checkAndAutoUnsuspend } = await import("@/lib/firestore")
          await checkAndAutoUnsuspend(user.uid)
          return { isAllowed: true, status: "ACTIVE" }
        }

        const daysLeft = Math.ceil((untilDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        toast.error("บัญชีถูกระงับชั่วคราว", {
          description: `บัญชีของคุณถูกระงับจนถึง ${untilDate.toLocaleDateString("th-TH", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}\nเหลืออีก ${daysLeft} วัน`,
          duration: 5000,
        })
        return {
          isAllowed: false,
          status,
          message: `บัญชีถูกระงับจนถึง ${untilDate.toLocaleDateString("th-TH")}`,
          suspendedUntil: untilDate,
        }
      }

      toast.error("บัญชีถูกระงับชั่วคราว", {
        description: "กรุณาติดต่อทีมสนับสนุนสำหรับข้อมูลเพิ่มเติม",
        duration: 5000,
      })
      return { isAllowed: false, status, message: "บัญชีถูกระงับชั่วคราว" }
    }

    // ตรวจสอบ restrictions
    if (restrictions && !restrictions.canPost) {
      toast.error("ไม่สามารถโพสต์ของได้", {
        description: "บัญชีของคุณถูกจำกัดสิทธิ์การโพสต์ของ กรุณาติดต่อทีมสนับสนุน",
        duration: 5000,
      })
      return { isAllowed: false, status, message: "ถูกจำกัดสิทธิ์การโพสต์" }
    }

    // ตรวจสอบสถานะ WARNING
    if (status === "WARNING") {
      const warningCount = userData.warningCount || 0
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
    const auth = getFirebaseAuth()
    const user = auth.currentUser

    if (!user) {
      router.push("/login")
      return { isAllowed: false, status: "ACTIVE", message: "กรุณาเข้าสู่ระบบก่อน" }
    }

    const db = getFirebaseDb()
    const userDoc = await getDoc(doc(db, "users", user.uid))

    if (!userDoc.exists()) {
      return { isAllowed: false, status: "ACTIVE", message: "ไม่พบข้อมูลผู้ใช้" }
    }

    const userData = userDoc.data() as User
    const status = userData.status || "ACTIVE"
    const restrictions = userData.restrictions

    if (status === "BANNED") {
      const reason = userData.bannedReason || "ไม่ระบุเหตุผล"
      toast.error("บัญชีถูกระงับถาวร", {
        description: `เหตุผล: ${reason}\nไม่สามารถทำการแลกเปลี่ยนได้`,
        duration: 5000,
      })
      return { isAllowed: false, status, message: `บัญชีถูกแบนถาวร: ${reason}` }
    }

    if (status === "SUSPENDED") {
      const suspendedUntil = userData.suspendedUntil
      if (suspendedUntil && typeof suspendedUntil === "object" && "toDate" in suspendedUntil) {
        const untilDate = suspendedUntil.toDate()
        const now = new Date()

        if (untilDate <= now) {
          // อัปเดตสถานะกลับเป็น ACTIVE
          const { checkAndAutoUnsuspend } = await import("@/lib/firestore")
          await checkAndAutoUnsuspend(user.uid)
          return { isAllowed: true, status: "ACTIVE" }
        }

        toast.error("บัญชีถูกระงับชั่วคราว", {
          description: `ไม่สามารถทำการแลกเปลี่ยนได้จนถึง ${untilDate.toLocaleDateString("th-TH")}`,
          duration: 5000,
        })
        return { isAllowed: false, status, suspendedUntil: untilDate }
      }

      toast.error("บัญชีถูกระงับชั่วคราว", {
        description: "ไม่สามารถทำการแลกเปลี่ยนได้ในขณะนี้",
        duration: 5000,
      })
      return { isAllowed: false, status }
    }

    if (restrictions && !restrictions.canExchange) {
      toast.error("ไม่สามารถแลกเปลี่ยนได้", {
        description: "บัญชีของคุณถูกจำกัดสิทธิ์การแลกเปลี่ยน กรุณาติดต่อทีมสนับสนุน",
        duration: 5000,
      })
      return { isAllowed: false, status, message: "ถูกจำกัดสิทธิ์การแลกเปลี่ยน" }
    }

    if (status === "WARNING") {
      const warningCount = userData.warningCount || 0
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
    const auth = getFirebaseAuth()
    const user = auth.currentUser

    if (!user) {
      router.push("/login")
      return { isAllowed: false, status: "ACTIVE", message: "กรุณาเข้าสู่ระบบก่อน" }
    }

    const db = getFirebaseDb()
    const userDoc = await getDoc(doc(db, "users", user.uid))

    if (!userDoc.exists()) {
      return { isAllowed: false, status: "ACTIVE", message: "ไม่พบข้อมูลผู้ใช้" }
    }

    const userData = userDoc.data() as User
    const status = userData.status || "ACTIVE"
    const restrictions = userData.restrictions

    if (status === "BANNED") {
      toast.error("บัญชีถูกระงับถาวร", {
        description: "ไม่สามารถใช้งานแชทได้",
        duration: 5000,
      })
      return { isAllowed: false, status }
    }

    if (status === "SUSPENDED") {
      toast.error("บัญชีถูกระงับชั่วคราว", {
        description: "ไม่สามารถใช้งานแชทได้ในขณะนี้",
        duration: 5000,
      })
      return { isAllowed: false, status }
    }

    if (restrictions && !restrictions.canChat) {
      toast.error("ไม่สามารถแชทได้", {
        description: "บัญชีของคุณถูกจำกัดสิทธิ์การแชท",
        duration: 5000,
      })
      return { isAllowed: false, status }
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
