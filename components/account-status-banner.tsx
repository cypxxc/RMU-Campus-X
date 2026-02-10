"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Ban, Clock } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useI18n } from "@/components/language-provider"

const WARNING_DISMISS_PREFIX = "account_warning_dismissed_count:"

function formatDateTime(date: Date, locale: "th" | "en"): string {
  return date.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatCountdown(
  remainingMs: number,
  labels: { day: string; hour: string; minute: string; second: string }
): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days} ${labels.day}`)
  if (hours > 0 || days > 0) parts.push(`${hours} ${labels.hour}`)
  parts.push(`${minutes} ${labels.minute}`)
  parts.push(`${seconds} ${labels.second}`)
  return parts.join(" ")
}

/**
 * Banner แสดงสถานะบัญชี (WARNING, SUSPENDED, BANNED)
 * ใช้ข้อมูลจาก AuthProvider โดยตรง
 */
export function AccountStatusBanner() {
  const { user, accountStatus, refreshUserProfile } = useAuth()
  const { locale, tt } = useI18n()
  const pathname = usePathname()
  const [dismissedWarningByUser, setDismissedWarningByUser] = useState<Record<string, number>>({})
  const [nowMs, setNowMs] = useState<number>(() => Date.now())
  const refreshRequestedRef = useRef(false)

  const dismissedWarningCount = (() => {
    if (!user?.uid) return 0

    const inMemory = dismissedWarningByUser[user.uid]
    if (typeof inMemory === "number" && Number.isFinite(inMemory)) {
      return inMemory
    }

    try {
      const key = `${WARNING_DISMISS_PREFIX}${user.uid}`
      const raw = localStorage.getItem(key)
      const parsed = Number(raw)
      return Number.isFinite(parsed) ? parsed : 0
    } catch {
      return 0
    }
  })()

  const userStatus = accountStatus?.status ?? "ACTIVE"
  const suspendedUntil = accountStatus?.suspendedUntil ?? null
  const bannedReason = accountStatus?.bannedReason ?? ""
  const warningCount = accountStatus?.warningCount ?? 0
  const latestWarningReason = accountStatus?.latestWarningReason?.trim() ?? ""
  const suspendedUntilMs = suspendedUntil?.getTime() ?? null
  const remainingMs = suspendedUntilMs != null ? suspendedUntilMs - nowMs : null
  const isSuspensionExpired = remainingMs != null && remainingMs <= 0
  const countdownText =
    remainingMs != null
      ? formatCountdown(remainingMs, {
          day: tt("วัน", "day"),
          hour: tt("ชม.", "hr"),
          minute: tt("นาที", "min"),
          second: tt("วินาที", "sec"),
        })
      : null

  const shouldHideWarning =
    ((userStatus === "ACTIVE" && warningCount > 0) || userStatus === "WARNING") &&
    dismissedWarningCount >= warningCount

  const helpHref = useMemo(() => {
    const basePath = pathname && pathname !== "/" ? pathname : "/dashboard"
    return `${basePath}?openSupport=1`
  }, [pathname])

  useEffect(() => {
    if (userStatus !== "SUSPENDED" || suspendedUntilMs == null) return
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [userStatus, suspendedUntilMs])

  useEffect(() => {
    refreshRequestedRef.current = false
  }, [userStatus, suspendedUntilMs])

  useEffect(() => {
    if (userStatus !== "SUSPENDED") return
    if (!isSuspensionExpired) return
    if (refreshRequestedRef.current) return

    refreshRequestedRef.current = true
    void refreshUserProfile()
  }, [userStatus, isSuspensionExpired, refreshUserProfile])

  if (!user || !accountStatus) return null

  if (userStatus === "ACTIVE" && warningCount === 0) return null
  if (shouldHideWarning) return null

  if (userStatus === "BANNED") {
    return (
      <Alert
        variant="destructive"
        className="mb-6 border-2 border-red-600 bg-red-50 text-red-900 dark:border-red-500 dark:bg-red-950/30 dark:text-red-100"
      >
        <Ban className="h-5 w-5 text-red-700 dark:text-red-300" />
        <AlertTitle className="text-lg font-bold text-red-900 dark:text-red-100">{tt("บัญชีถูกระงับถาวร", "Account permanently banned")}</AlertTitle>
        <AlertDescription className="mt-2 space-y-2 text-red-800 dark:text-red-200">
          <p>
            {tt("บัญชีของคุณถูกระงับถาวรเนื่องจาก:", "Your account is permanently banned due to:")}{" "}
            <strong>{bannedReason || tt("ไม่ระบุเหตุผล", "No reason provided")}</strong>
          </p>
          <p className="text-sm">
            {tt("หากต้องการติดต่อทีมสนับสนุน กรุณา", "If you need support, please")}{" "}
            <Link href={helpHref} className="font-semibold underline underline-offset-2 hover:opacity-90">
              {tt("ติดต่อ Support", "contact support")}
            </Link>
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 border-red-600 text-red-700 hover:bg-red-100 dark:border-red-400 dark:text-red-200 dark:hover:bg-red-900/40"
            asChild
          >
            <Link href={helpHref}>{tt("ไปที่ Support", "Go to support")}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (userStatus === "SUSPENDED") {
    return (
      <Alert className="mb-6 border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
        <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        <AlertTitle className="text-lg font-bold text-orange-900 dark:text-orange-100">
          {tt("บัญชีถูกระงับชั่วคราว", "Account temporarily suspended")}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2 text-orange-800 dark:text-orange-200">
          {suspendedUntil ? (
            <>
              <p>
                {tt("บัญชีของคุณถูกระงับจนถึง", "Your account is suspended until")}{" "}
                <strong>{formatDateTime(suspendedUntil, locale)}</strong>
              </p>
              {isSuspensionExpired ? (
                <p className="text-sm">{tt("ครบกำหนดเวลาแล้ว ระบบกำลังปลดระงับอัตโนมัติ...", "Suspension period ended. We are restoring access automatically...")}</p>
              ) : (
                <p className="text-sm">
                  {tt("เหลือเวลาอีก", "Time remaining")} <strong>{countdownText}</strong> {tt("ก่อนปลดระงับอัตโนมัติ", "before automatic restoration")}
                </p>
              )}
              <p className="text-sm">
                {tt("หากถูกระงับครบ", "If suspended")} <strong>2 {tt("ครั้ง", "times")}</strong> {tt("ระบบจะแบนถาวรอัตโนมัติ", "the system will permanently ban the account.")}
              </p>
            </>
          ) : (
            <p>{tt("บัญชีของคุณถูกระงับชั่วคราว กรุณาติดต่อทีมสนับสนุนสำหรับข้อมูลเพิ่มเติม", "Your account is temporarily suspended. Please contact support for details.")}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-2 border-orange-600 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900"
            asChild
          >
            <Link href={helpHref}>{tt("ติดต่อทีมสนับสนุน", "Contact support")}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if ((userStatus === "ACTIVE" && warningCount > 0) || userStatus === "WARNING") {
    const dismissWarning = () => {
      if (!user?.uid) return
      try {
        localStorage.setItem(`${WARNING_DISMISS_PREFIX}${user.uid}`, String(warningCount))
      } catch {
        // ignore storage errors
      }
      setDismissedWarningByUser((prev) => ({ ...prev, [user.uid]: warningCount }))
    }

    return (
      <Alert className="mb-6 border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <AlertTitle className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
          {tt("คำเตือน: บัญชีของคุณได้รับการเตือน", "Warning: your account has warnings")}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2 text-yellow-800 dark:text-yellow-200">
          <p>
            {tt("คุณได้รับคำเตือน", "You have")} <strong>{warningCount}</strong> {tt("ครั้ง", "warning(s)")}
          </p>
          {latestWarningReason && (
            <p className="text-sm">
              {tt("ปัญหาที่ถูกแจ้งเตือนล่าสุด:", "Latest warning reason:")} <strong>{latestWarningReason}</strong>
            </p>
          )}
          <p className="text-sm">
            {tt("กติการะบบ: คำเตือนครบ", "Policy: after")} <strong>3 {tt("ครั้ง", "warnings")}</strong> {tt("จะถูกระงับ", "you will be suspended for")} <strong>7 {tt("วัน", "days")}</strong> {tt("และหากถูกระงับครบ", "and if suspended")} <strong>2 {tt("ครั้ง", "times")}</strong> {tt("จะถูกแบนถาวร", "the account will be permanently banned")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={dismissWarning}
              className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900"
            >
              {tt("ปิดการแจ้งเตือน", "Dismiss warning")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900"
              asChild
            >
              <Link href={helpHref}>{tt("ช่วยเหลือ", "Help")}</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
