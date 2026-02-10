"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useAuth } from "@/components/auth-provider"
import { getAuth } from "firebase/auth"
import { LINE_CONFIG } from "@/lib/line-config"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  MessageSquare,
  Bell,
  CheckCircle,
  QrCode,
  Loader2,
  Package,
  ArrowRightLeft,
  Check,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@/types"
import { useI18n } from "@/components/language-provider"
import { LineUnlinkButton, LineLinkByCodeForm } from "@/components/line-link-components"

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
  const { tt } = useI18n()

  const isLinked = !!profile?.lineUserId

  useEffect(() => {
    if (profile?.lineNotifications) {
      setSettings(profile.lineNotifications)
    }
  }, [profile])

  const handleUpdateSettings = async (newSettings: typeof settings) => {
    if (!user) return
    setLoading(true)
    try {
      const auth = getAuth()
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
      if (!token) {
        toast({ title: tt("กรุณาเข้าสู่ระบบ", "Please sign in"), variant: "destructive" })
        return
      }
      const res = await fetch("/api/line/link", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.uid, settings: newSettings }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || tt("ไม่สามารถบันทึกการตั้งค่าได้", "Unable to save settings"))
      setSettings(newSettings)
      toast({ title: tt("บันทึกการตั้งค่าสำเร็จ", "Settings saved") })
    } catch {
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: tt("ไม่สามารถบันทึกการตั้งค่าได้", "Unable to save settings"),
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
              <CardTitle className="text-lg">{tt("แจ้งเตือนผ่าน LINE", "LINE notifications")}</CardTitle>
              <CardDescription>{tt("รับการแจ้งเตือนทันทีผ่าน LINE Official Account", "Receive instant updates via LINE Official Account.")}</CardDescription>
            </div>
          </div>
          {isLinked && (
            <Badge className="bg-[#00B900]/10 text-[#00B900] border-[#00B900]/20 gap-1">
              <CheckCircle className="h-3 w-3" />
              {tt("เชื่อมแล้ว", "Linked")}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isLinked ? (
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

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#00B900] text-white text-xs flex items-center justify-center font-bold">1</span>
                <span>{tt("สแกน QR Code เพื่อเพิ่มเพื่อน", "Scan the QR code to add the official account.")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#00B900] text-white text-xs flex items-center justify-center font-bold">2</span>
                <span>
                  {tt("พิมพ์อีเมล ", "Send your email ")}
                  <span className="font-mono text-xs bg-muted px-1 rounded">{user?.email}</span>
                  {tt(" ในแชท หรือพิมพ์ \"เชื่อมบัญชี\" เพื่อรับรหัส 6 หลัก", " in chat, or send \"link\" to get a 6-digit code")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#00B900] text-white text-xs flex items-center justify-center font-bold">3</span>
                <span>{tt("เชื่อมอัตโนมัติ หรือกรอกรหัสด้านล่าง", "Link automatically or enter the code below.")}</span>
              </div>
            </div>

            <LineLinkByCodeForm userId={user?.uid} onSuccess={onUpdate} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Master toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label className="font-medium">{tt("เปิดรับการแจ้งเตือน", "Enable notifications")}</Label>
                  <p className="text-xs text-muted-foreground">{tt("เปิด/ปิดการแจ้งเตือนผ่าน LINE ทั้งหมด", "Turn all LINE notifications on or off.")}</p>
                </div>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => handleUpdateSettings({ ...settings, enabled: checked })}
                disabled={loading}
              />
            </div>

            {/* Individual toggles */}
            {settings.enabled && (
              <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium text-sm">{tt("มีคนขอรับสิ่งของ", "Item request received")}</Label>
                      <p className="text-xs text-muted-foreground">{tt("แจ้งเตือนเมื่อมีผู้ขอรับสิ่งของของคุณ", "Notify when someone requests your item.")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.exchangeRequest}
                    onCheckedChange={(checked) => handleUpdateSettings({ ...settings, exchangeRequest: checked })}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium text-sm">{tt("สถานะการแลกเปลี่ยนเปลี่ยน", "Exchange status changed")}</Label>
                      <p className="text-xs text-muted-foreground">{tt("แจ้งเตือนเมื่อสถานะมีการเปลี่ยนแปลง", "Notify when exchange status changes.")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.exchangeStatus}
                    onCheckedChange={(checked) => handleUpdateSettings({ ...settings, exchangeStatus: checked })}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="font-medium text-sm">{tt("การแลกเปลี่ยนสำเร็จ", "Exchange completed")}</Label>
                      <p className="text-xs text-muted-foreground">{tt("แจ้งเตือนเมื่อการแลกเปลี่ยนเสร็จสิ้น", "Notify when an exchange is completed.")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.exchangeComplete}
                    onCheckedChange={(checked) => handleUpdateSettings({ ...settings, exchangeComplete: checked })}
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
                    <p className="text-sm font-medium text-destructive">{tt("ยกเลิกการเชื่อมต่อ LINE", "Unlink LINE")}</p>
                    <p className="text-xs text-muted-foreground">{tt("คุณจะไม่ได้รับการแจ้งเตือนผ่าน LINE อีก", "You will no longer receive LINE notifications.")}</p>
                  </div>
                </div>
                <LineUnlinkButton userId={user?.uid} onSuccess={onUpdate} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
