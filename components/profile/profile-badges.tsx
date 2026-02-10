"use client"

import { Badge } from "@/components/ui/badge"
import { Bell, CheckCircle2, ImageIcon, MessageSquare, ShieldCheck } from "lucide-react"
import { useI18n } from "@/components/language-provider"

type ProfileBadgesProps = {
  emailVerified?: boolean
  isActive?: boolean
  hasAvatar?: boolean
  lineLinked?: boolean
  lineNotificationsEnabled?: boolean
}

export function ProfileBadges({
  emailVerified,
  isActive,
  hasAvatar,
  lineLinked,
  lineNotificationsEnabled,
}: ProfileBadgesProps) {
  const { tt } = useI18n()

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {emailVerified === true ? (
        <Badge className="gap-1.5 py-1 px-3 bg-primary/10 text-primary border-primary/20 rounded-full" variant="outline">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {tt("ยืนยันอีเมลแล้ว", "Email verified")}
        </Badge>
      ) : emailVerified === false ? (
        <Badge variant="outline" className="gap-1.5 py-1 px-3 bg-destructive/10 text-destructive border-destructive/20 rounded-full">
          {tt("ยังไม่ยืนยันอีเมล", "Email not verified")}
        </Badge>
      ) : null}

      {isActive === true && (
        <Badge className="gap-1.5 py-1 px-3 bg-success/10 text-[var(--success)] border-[var(--success)]/20 rounded-full" variant="outline">
          <ShieldCheck className="h-3.5 w-3.5" />
          {tt("บัญชีใช้งานได้", "Account active")}
        </Badge>
      )}

      {hasAvatar === true && (
        <Badge className="gap-1.5 py-1 px-3 bg-muted text-foreground border-border/50 rounded-full" variant="outline">
          <ImageIcon className="h-3.5 w-3.5" />
          {tt("มีรูปโปรไฟล์", "Has profile image")}
        </Badge>
      )}

      {lineLinked === true && (
        <Badge className="gap-1.5 py-1 px-3 bg-[#00B900]/10 text-[#00B900] border-[#00B900]/20 rounded-full" variant="outline">
          <MessageSquare className="h-3.5 w-3.5" />
          {tt("เชื่อม LINE", "LINE linked")}
        </Badge>
      )}

      {lineNotificationsEnabled === true && (
        <Badge className="gap-1.5 py-1 px-3 bg-info/10 text-[var(--info)] border-[var(--info)]/20 rounded-full" variant="outline">
          <Bell className="h-3.5 w-3.5" />
          {tt("เปิดแจ้งเตือน", "Notifications enabled")}
        </Badge>
      )}
    </div>
  )
}

