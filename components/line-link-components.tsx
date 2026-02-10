"use client"

import { useState } from "react"
import { getAuth } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, Unlink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/components/language-provider"

/** Button + confirmation dialog to unlink a LINE account */
export function LineUnlinkButton({ userId, onSuccess }: { userId?: string; onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { tt } = useI18n()

  const handleUnlink = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const auth = getAuth()
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
      if (!token) {
        toast({ title: tt("กรุณาเข้าสู่ระบบ", "Please sign in"), variant: "destructive" })
        return
      }
      const res = await fetch("/api/line/link", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || tt("ไม่สามารถยกเลิกการเชื่อมต่อได้", "Unable to unlink LINE"))
      toast({
        title: tt("ยกเลิกการเชื่อมต่อสำเร็จ", "LINE unlinked"),
        description: tt("คุณจะไม่ได้รับการแจ้งเตือนผ่าน LINE อีกต่อไป", "You will no longer receive LINE notifications."),
      })
      onSuccess?.()
    } catch (error) {
      console.error("[LineNotificationSettings] Unlink error:", error)
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: tt("ไม่สามารถยกเลิกการเชื่อมต่อได้", "Unable to unlink LINE"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
          {tt("ยกเลิก", "Unlink")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tt("ยกเลิกการเชื่อมต่อ LINE?", "Unlink LINE account?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {tt(
              "คุณจะไม่ได้รับการแจ้งเตือนผ่าน LINE อีกต่อไป หากต้องการเปิดใช้งานอีกครั้ง สามารถสแกน QR Code และพิมพ์อีเมลเพื่อเชื่อมใหม่ได้",
              "You will stop receiving LINE notifications. You can reconnect later by scanning the QR code and submitting your email again."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tt("ยกเลิก", "Cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUnlink}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {tt("ยืนยันยกเลิกการเชื่อมต่อ", "Confirm unlink")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Form to link a LINE account using a 6-digit code */
export function LineLinkByCodeForm({ userId, onSuccess }: { userId?: string; onSuccess?: () => void }) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { tt } = useI18n()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !code.trim()) return
    const linkCode = code.trim().replace(/\s/g, "")
    if (linkCode.length !== 6 || !/^\d+$/.test(linkCode)) {
      toast({ title: tt("กรุณากรอกรหัส 6 หลักจาก LINE", "Please enter a 6-digit LINE code"), variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const auth = getAuth()
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
      if (!token) {
        toast({ title: tt("กรุณาเข้าสู่ระบบ", "Please sign in"), variant: "destructive" })
        return
      }
      const base = typeof window !== "undefined" ? window.location.origin : ""
      const res = await fetch(`${base}/api/line/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, linkCode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: data.error || tt("เชื่อมบัญชีไม่สำเร็จ", "Failed to link account"), variant: "destructive" })
        return
      }
      toast({ title: tt("เชื่อมบัญชี LINE สำเร็จ", "LINE linked successfully") })
      setCode("")
      onSuccess?.()
    } catch {
      toast({ title: tt("เกิดข้อผิดพลาด", "Error"), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 rounded-lg border bg-muted/30 space-y-2">
      <Label className="text-sm">{tt("หรือกรอกรหัส 6 หลักจาก LINE", "Or enter a 6-digit LINE code")}</Label>
      <div className="flex gap-2">
        <Input
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          className="font-mono text-center"
          disabled={loading}
        />
        <Button type="submit" size="sm" disabled={loading || !userId}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tt("เชื่อมบัญชี", "Link account")}
        </Button>
      </div>
    </form>
  )
}
