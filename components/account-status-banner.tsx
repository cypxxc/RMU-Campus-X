"use client"

import { useEffect, useState } from "react"
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import type { User, UserStatus } from "@/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Ban, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

/**
 * Component แสดง Banner แจ้งเตือนสถานะบัญชี
 * แสดงเมื่อบัญชีถูก WARNING, SUSPENDED หรือ BANNED
 */
export function AccountStatusBanner() {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [suspendedUntil, setSuspendedUntil] = useState<Date | null>(null)
  const [bannedReason, setBannedReason] = useState<string>("")
  const [warningCount, setWarningCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

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
          const status = userData.status || "ACTIVE"
          
          setUserStatus(status)
          setWarningCount(userData.warningCount || 0)
          setBannedReason(userData.bannedReason || "")

          if (status === "SUSPENDED" && userData.suspendedUntil) {
            if (typeof userData.suspendedUntil === "object" && "toDate" in userData.suspendedUntil) {
              setSuspendedUntil(userData.suspendedUntil.toDate())
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
  }, [])

  if (loading || !userStatus || userStatus === "ACTIVE") {
    return null
  }

  // BANNED - แสดง Banner แดง
  if (userStatus === "BANNED") {
    return (
      <Alert variant="destructive" className="mb-6 border-2 animate-fade-in">
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
      <Alert className="mb-6 border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/20 animate-fade-in">
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

  // WARNING - แสดง Banner เหลือง
  if (userStatus === "WARNING") {
    return (
      <Alert className="mb-6 border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 animate-fade-in">
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
