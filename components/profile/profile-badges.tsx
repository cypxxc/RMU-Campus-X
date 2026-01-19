"use client"

import { Badge } from "@/components/ui/badge"
import { Bell, CheckCircle2, ImageIcon, MessageSquare, ShieldCheck } from "lucide-react"

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
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {emailVerified === true ? (
        <Badge className="gap-1.5 py-1 px-3 bg-primary/10 text-primary border-primary/20 rounded-full" variant="outline">
          <CheckCircle2 className="h-3.5 w-3.5" />
          ยืนยันอีเมลแล้ว
        </Badge>
      ) : emailVerified === false ? (
        <Badge variant="outline" className="gap-1.5 py-1 px-3 bg-destructive/10 text-destructive border-destructive/20 rounded-full">
          ยังไม่ยืนยันอีเมล
        </Badge>
      ) : null}

      {isActive === true && (
        <Badge className="gap-1.5 py-1 px-3 bg-success/10 text-[var(--success)] border-[var(--success)]/20 rounded-full" variant="outline">
          <ShieldCheck className="h-3.5 w-3.5" />
          บัญชีใช้งานได้
        </Badge>
      )}

      {hasAvatar === true && (
        <Badge className="gap-1.5 py-1 px-3 bg-muted text-foreground border-border/50 rounded-full" variant="outline">
          <ImageIcon className="h-3.5 w-3.5" />
          มีรูปโปรไฟล์
        </Badge>
      )}

      {lineLinked === true && (
        <Badge className="gap-1.5 py-1 px-3 bg-[#00B900]/10 text-[#00B900] border-[#00B900]/20 rounded-full" variant="outline">
          <MessageSquare className="h-3.5 w-3.5" />
          เชื่อม LINE
        </Badge>
      )}

      {lineNotificationsEnabled === true && (
        <Badge className="gap-1.5 py-1 px-3 bg-info/10 text-[var(--info)] border-[var(--info)]/20 rounded-full" variant="outline">
          <Bell className="h-3.5 w-3.5" />
          เปิดแจ้งเตือน
        </Badge>
      )}
    </div>
  )
}

