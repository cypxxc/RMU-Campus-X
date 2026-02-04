"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useAuth } from "@/components/auth-provider"
import { getAuth } from "firebase/auth"
import { updateUserProfile } from "@/lib/firestore"
import { LINE_CONFIG } from "@/lib/line-config"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { 
  MessageSquare,
  Bell,
  CheckCircle,
  QrCode,
  Loader2,
  Package,
  ArrowRightLeft,
  Check,
  Unlink
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@/types"

// Unlink Button Component
function UnlinkButton({ userId, onSuccess }: { userId?: string, onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleUnlink = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      await updateUserProfile(userId, {
        lineUserId: null,
        lineNotifications: {
          enabled: false,
          exchangeRequest: false,
          exchangeStatus: false,
          exchangeComplete: false,
        },
      } as any)
      
      toast({
        title: "ยกเลิกการเชื่อมต่อสำเร็จ",
        description: "คุณจะไม่ได้รับการแจ้งเตือนผ่าน LINE อีกต่อไป",
      })
      
      onSuccess?.()
    } catch {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกการเชื่อมต่อได้",
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
          ยกเลิก
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยกเลิกการเชื่อมต่อ LINE?</AlertDialogTitle>
          <AlertDialogDescription>
            คุณจะไม่ได้รับการแจ้งเตือนผ่าน LINE อีกต่อไป หากต้องการเปิดใช้งานอีกครั้ง สามารถสแกน QR Code และพิมพ์อีเมลเพื่อเชื่อมใหม่ได้
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleUnlink}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            ยืนยันยกเลิกการเชื่อมต่อ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function LinkByCodeForm({ userId, onSuccess }: { userId?: string; onSuccess?: () => void }) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !code.trim()) return
    const linkCode = code.trim().replace(/\s/g, "")
    if (linkCode.length !== 6 || !/^\d+$/.test(linkCode)) {
      toast({ title: "กรุณากรอกรหัส 6 หลักจาก LINE", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const auth = getAuth()
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
      if (!token) {
        toast({ title: "กรุณาเข้าสู่ระบบ", variant: "destructive" })
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
        toast({ title: data.error || "เชื่อมบัญชีไม่สำเร็จ", variant: "destructive" })
        return
      }
      toast({ title: "เชื่อมบัญชี LINE สำเร็จ" })
      setCode("")
      onSuccess?.()
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 rounded-lg border bg-muted/30 space-y-2">
      <Label className="text-sm">หรือกรอกรหัส 6 หลักจาก LINE</Label>
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
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "เชื่อมบัญชี"}
        </Button>
      </div>
    </form>
  )
}

interface LineNotificationSettingsProps {
  profile?: User | null
  onUpdate?: () => void
}

export function LineNotificationSettings({ profile, onUpdate }: LineNotificationSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    enabled: false,
    exchangeRequest: true,
    exchangeStatus: true,
    exchangeComplete: true,
  })
  const { user } = useAuth()
  const { toast } = useToast()

  const isLinked = !!profile?.lineUserId

  // Load settings when profile changes
  useEffect(() => {
    if (profile?.lineNotifications) {
      setSettings(profile.lineNotifications)
    }
  }, [profile])

  const handleUpdateSettings = async (newSettings: typeof settings) => {
    if (!user) return

    setLoading(true)
    try {
      await updateUserProfile(user.uid, {
        lineNotifications: newSettings,
        email: user.email || ""
      } as any)
      setSettings(newSettings)
      toast({
        title: "บันทึกการตั้งค่าสำเร็จ",
      })
    } catch {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการตั้งค่าได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-none shadow-soft">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#00B900]/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-[#00B900]" />
            </div>
            <div>
              <CardTitle className="text-lg">แจ้งเตือนผ่าน LINE</CardTitle>
              <CardDescription>รับการแจ้งเตือนทันทีผ่าน LINE Official Account</CardDescription>
            </div>
          </div>
          {isLinked && (
            <Badge className="bg-[#00B900]/10 text-[#00B900] border-[#00B900]/20 gap-1">
              <CheckCircle className="h-3 w-3" />
              เชื่อมแล้ว
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isLinked ? (
          // Not linked - show only QR Code with instructions
          <div className="flex flex-col items-center py-4">
            <div className="relative bg-white p-4 rounded-2xl shadow-lg border-2 border-[#00B900]/20">
              <Image
                src={LINE_CONFIG.qrCodePath}
                alt="LINE QR Code"
                width={180}
                height={180}
                className="rounded-lg"
                unoptimized
              />
              <div className="absolute -top-3 -right-3 bg-[#00B900] text-white p-2 rounded-full shadow-md">
                <QrCode className="h-4 w-4" />
              </div>
            </div>
            
            {/* Steps */}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#00B900] text-white text-xs flex items-center justify-center font-bold">1</span>
                <span>สแกน QR Code เพื่อเพิ่มเพื่อน</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#00B900] text-white text-xs flex items-center justify-center font-bold">2</span>
                <span>พิมพ์อีเมล <span className="font-mono text-xs bg-muted px-1 rounded">{user?.email}</span> ในแชท หรือพิมพ์ &quot;เชื่อมบัญชี&quot; เพื่อรับรหัส 6 หลัก</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#00B900] text-white text-xs flex items-center justify-center font-bold">3</span>
                <span>เชื่อมอัตโนมัติ หรือกรอกรหัสด้านล่าง</span>
              </div>
            </div>

            {/* Link by code */}
            <LinkByCodeForm userId={user?.uid} onSuccess={onUpdate} />
          </div>
        ) : (
          // Already linked - show notification settings
          <div className="space-y-4">
            {/* Master toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label className="font-medium">เปิดรับการแจ้งเตือน</Label>
                  <p className="text-xs text-muted-foreground">เปิด/ปิดการแจ้งเตือนผ่าน LINE ทั้งหมด</p>
                </div>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => {
                  const newSettings = { ...settings, enabled: checked }
                  handleUpdateSettings(newSettings)
                }}
                disabled={loading}
              />
            </div>

            {/* Individual toggles */}
            {settings.enabled && (
              <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                {/* Exchange Request */}
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium text-sm">มีคนขอรับสิ่งของ</Label>
                      <p className="text-xs text-muted-foreground">แจ้งเตือนเมื่อมีผู้ขอรับสิ่งของของคุณ</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.exchangeRequest}
                    onCheckedChange={(checked) => {
                      const newSettings = { ...settings, exchangeRequest: checked }
                      handleUpdateSettings(newSettings)
                    }}
                    disabled={loading}
                  />
                </div>

                {/* Exchange Status */}
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium text-sm">สถานะการแลกเปลี่ยนเปลี่ยน</Label>
                      <p className="text-xs text-muted-foreground">แจ้งเตือนเมื่อสถานะมีการเปลี่ยนแปลง</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.exchangeStatus}
                    onCheckedChange={(checked) => {
                      const newSettings = { ...settings, exchangeStatus: checked }
                      handleUpdateSettings(newSettings)
                    }}
                    disabled={loading}
                  />
                </div>

                {/* Exchange Complete */}
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium text-sm">การแลกเปลี่ยนสำเร็จ</Label>
                      <p className="text-xs text-muted-foreground">แจ้งเตือนเมื่อการแลกเปลี่ยนเสร็จสิ้น</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.exchangeComplete}
                    onCheckedChange={(checked) => {
                      const newSettings = { ...settings, exchangeComplete: checked }
                      handleUpdateSettings(newSettings)
                    }}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Connected account info */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                LINE Account: <span className="font-mono">{LINE_CONFIG.officialAccountId}</span>
              </span>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>

            {/* Unlink Button */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-destructive">ยกเลิกการเชื่อมต่อ LINE</p>
                    <p className="text-xs text-muted-foreground">คุณจะไม่ได้รับการแจ้งเตือนผ่าน LINE อีก</p>
                  </div>
                </div>
                <UnlinkButton userId={user?.uid} onSuccess={onUpdate} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
