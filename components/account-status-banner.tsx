"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { authFetchJson } from "@/lib/api-client"
import type { UserStatus } from "@/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Ban, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

/**
 * Component แสดง Banner แจ้งเตือนสถานะบัญชี
 * แสดงเมื่อบัญชีถูก WARNING, SUSPENDED หรือ BANNED
 * โหลดสถานะผ่าน API เพื่อไม่ใช้ Firestore บน client (เลี่ยง "Unexpected state")
 */
export function AccountStatusBanner() {
  const { user } = useAuth()
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [suspendedUntil, setSuspendedUntil] = useState<Date | null>(null)
  const [bannedReason, setBannedReason] = useState<string>("")
  const [warningCount, setWarningCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    const checkStatus = async () => {
      try {
        const res = await authFetchJson<{ user?: Record<string, unknown> }>("/api/users/me", { method: "GET" })
        const userData = res?.data?.user
        if (userData) {
          const status = (userData.status as UserStatus) || "ACTIVE"
          setUserStatus(status)
          setWarningCount(Number(userData.warningCount) || 0)
          setBannedReason(String(userData.bannedReason || ""))

          if (status === "SUSPENDED" && userData.suspendedUntil) {
            const su = userData.suspendedUntil
            if (typeof su === "string") {
              setSuspendedUntil(new Date(su))
            } else if (typeof su === "object" && su !== null && "toDate" in su && typeof (su as { toDate: () => Date }).toDate === "function") {
              setSuspendedUntil((su as { toDate: () => Date }).toDate())
            } else if (typeof su === "object" && su !== null && "_seconds" in su && typeof (su as { _seconds: number })._seconds === "number") {
              setSuspendedUntil(new Date((su as { _seconds: number })._seconds * 1000))
            }
          }
        }
      } catch (error) {
        console.error("Error checking account status:", error)
      } finally {
        setLoading(false)
      }
    }
    checkStatus()
  }, [user])

  if (loading || !userStatus) return null
  // ACTIVE และไม่มีคำเตือนสะสม = ไม่แสดงแบนเนอร์
  if (userStatus === "ACTIVE" && (warningCount || 0) === 0) return null

  // BANNED - แสดง Banner แดง
  if (userStatus === "BANNED") {
    return (
      <Alert variant="destructive" className="mb-6 border-2">
        <Ban className="h-5 w-5" />
        <AlertTitle className="text-lg font-bold">บัญชีถูกระงับถาวร</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>
            บัญชีของคุณถูกระงับถาวรเนื่องจาก: <strong>{bannedReason || "ไม่ระบุเหตุผล"}</strong>
          </p>
          <p className="text-sm">
            คุณไม่สามารถใช้งานฟีเจอร์ต่างๆ ในระบบได้ หากคุณคิดว่านี่เป็นข้อผิดพลาด กรุณาติดต่อทีมสนับสนุน
          </p>
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <Link href="/support">ติดต่อทีมสนับสนุน</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // SUSPENDED - แสดง Banner ส้ม
  if (userStatus === "SUSPENDED") {
    const daysLeft = suspendedUntil
      ? Math.ceil((suspendedUntil.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0

    return (
      <Alert className="mb-6 border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
        <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        <AlertTitle className="text-lg font-bold text-orange-900 dark:text-orange-100">
          บัญชีถูกระงับชั่วคราว
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2 text-orange-800 dark:text-orange-200">
          {suspendedUntil ? (
            <>
              <p>
                บัญชีของคุณถูกระงับจนถึง{" "}
                <strong>
                  {suspendedUntil.toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </strong>
              </p>
              <p className="text-sm">
                เหลืออีก <strong>{daysLeft}</strong> วัน คุณจะไม่สามารถโพสต์ของ แลกเปลี่ยน หรือแชทได้ในช่วงเวลานี้
              </p>
            </>
          ) : (
            <p>บัญชีของคุณถูกระงับชั่วคราว กรุณาติดต่อทีมสนับสนุนสำหรับข้อมูลเพิ่มเติม</p>
          )}
          <Button variant="outline" size="sm" className="mt-2 border-orange-600 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900" asChild>
            <Link href="/support">ติดต่อทีมสนับสนุน</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // คำเตือนสะสม (status ยัง ACTIVE หรือ WARNING) - แสดง Banner เหลือง
  if ((userStatus === "ACTIVE" && (warningCount || 0) > 0) || userStatus === "WARNING") {
    return (
      <Alert className="mb-6 border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <AlertTitle className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
          คำเตือน: บัญชีของคุณได้รับการเตือน
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2 text-yellow-800 dark:text-yellow-200">
          <p>
            คุณได้รับคำเตือน <strong>{warningCount}</strong> ครั้ง
          </p>
          <p className="text-sm">
            หากได้รับคำเตือนเพิ่มเติม บัญชีของคุณอาจถูกระงับชั่วคราวหรือถาวร กรุณาปฏิบัติตามกฎระเบียบของชุมชน
          </p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" className="border-yellow-600 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900" asChild>
              <Link href="/support">ดูรายละเอียด</Link>
            </Button>
            <Button variant="outline" size="sm" className="border-yellow-600 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900" asChild>
              <Link href="/support">ติดต่อทีมสนับสนุน</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
