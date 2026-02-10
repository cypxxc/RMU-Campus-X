"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/components/language-provider"

interface PasswordChangeFormProps {
  onCheckPassword: (password: string, confirm: string) => string | null // Returns error message or null
  onSubmit: (password: string) => Promise<void>
}

export function PasswordChangeForm({ onCheckPassword, onSubmit }: PasswordChangeFormProps) {
  const { toast } = useToast()
  const { tt } = useI18n()
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const handleSubmit = async () => {
    const error = onCheckPassword(newPassword, confirmNewPassword)
    if (error) {
      toast({ title: error, variant: "destructive" })
      return
    }

    setChangingPassword(true)
    try {
      await onSubmit(newPassword)
      // Success is handled by parent or just clear fields here
      toast({ 
        title: tt("เปลี่ยนรหัสผ่านสำเร็จ", "Password changed"), 
        description: tt("กรุณาเข้าสู่ระบบใหม่ด้วยรหัสผ่านใหม่", "Please sign in again with your new password.") 
      })
      setNewPassword("")
      setConfirmNewPassword("")
    } catch {
      // Error handling is partly done by parent, but if parent throws, we catch here to stop loading
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <Card className="border-none shadow-soft mt-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
           <Shield className="h-5 w-5 text-primary" />
           {tt("ความปลอดภัย", "Security")}
        </CardTitle>
        <CardDescription>{tt("จัดการรหัสผ่านและความปลอดภัยของบัญชี", "Manage your password and account security.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">{tt("รหัสผ่านใหม่", "New password")}</Label>
          <div className="relative">
            <Input 
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={tt("รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร", "At least 6 characters")}
            />
             <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-new-password">{tt("ยืนยันรหัสผ่านใหม่", "Confirm new password")}</Label>
          <div className="relative">
            <Input 
              id="confirm-new-password"
              type={showConfirmNewPassword ? "text" : "password"}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder={tt("กรอกรหัสผ่านใหม่อีกครั้ง", "Re-enter new password")}
            />
             <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
              >
                {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
          </div>
        </div>
        <div className="pt-4">
           <Button 
             className="w-full sm:w-auto" 
             onClick={handleSubmit}
             disabled={changingPassword || !newPassword || !confirmNewPassword}
           >
             {changingPassword ? tt("กำลังเปลี่ยนรหัสผ่าน...", "Changing password...") : tt("เปลี่ยนรหัสผ่าน", "Change password")}
           </Button>
        </div>
      </CardContent>
    </Card>
  )
}
