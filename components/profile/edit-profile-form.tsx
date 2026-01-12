"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Eye, Save, Loader2 } from "lucide-react"

interface EditProfileFormProps {
  initialDisplayName: string
  initialBio: string
  email: string
  userId: string
  onSave: (data: { displayName: string; bio: string }) => Promise<void>
}

export function EditProfileForm({ 
  initialDisplayName, 
  initialBio, 
  email, 
  userId, 
  onSave 
}: EditProfileFormProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [bio, setBio] = useState(initialBio)
  const [saving, setSaving] = useState(false)

  // Update local state when initial props change
  useEffect(() => {
    setDisplayName(initialDisplayName)
    setBio(initialBio)
  }, [initialDisplayName, initialBio])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ displayName, bio })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-none shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg">แก้ไขโปรไฟล์</CardTitle>
          <CardDescription>การเปลี่ยนแปลงจะมีผลทั่วถึงทั้งระบบ</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 h-8"
          onClick={() => router.push(`/profile/${userId}`)}
        >
          <Eye className="h-3.5 w-3.5" />
          ดูตัวอย่าง
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-sm font-bold">ชื่อที่แสดง (Display Name)</Label>
          <Input 
            id="displayName"
            placeholder="ใส่ชื่อของคุณ..."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-11 bg-muted/20"
          />
          <p className="text-[11px] text-muted-foreground">ชื่อนี้จะปรากฏเมื่อคุณแชทหรือประกาศสิ่งของ</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-sm font-bold">แนะนำตัว (Bio)</Label>
          <Textarea
            id="bio"
            placeholder="แนะนำตัวสั้นๆ หรือบอกเวลาที่สะดวก..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="bg-muted/20 min-h-[100px] resize-none"
            maxLength={300}
          />
          <p className="text-[11px] text-muted-foreground text-right">{bio.length}/300 ตัวอักษร</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold opacity-50">อีเมล (เปลี่ยนไม่ได้)</Label>
          <Input 
            disabled
            value={email}
            className="h-11 bg-muted/50"
          />
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="rounded-full px-8 h-11"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            บันทึกการเปลี่ยนแปลง
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
