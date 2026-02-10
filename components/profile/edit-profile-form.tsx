"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Save, Loader2 } from "lucide-react"
import { useI18n } from "@/components/language-provider"

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
  userId: _userId, 
  onSave 
}: EditProfileFormProps) {
  const { tt } = useI18n()
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [bio, setBio] = useState(initialBio)
  const [saving, setSaving] = useState(false)

  // Update local state when initial props change
  useEffect(() => {
    setDisplayName(initialDisplayName)
    setBio(initialBio)
  }, [initialDisplayName, initialBio])

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSave = async () => {
    setErrors({})
    
    // Validate with Zod
    const { userProfileSchema } = await import("@/lib/schemas")
    const result = userProfileSchema.safeParse({ displayName, bio })
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    setSaving(true)
    try {
      await onSave({ displayName, bio })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-none shadow-soft">
      <CardHeader className="space-y-0 pb-4">
        <CardTitle className="text-lg">{tt("แก้ไขโปรไฟล์", "Edit profile")}</CardTitle>
        <CardDescription>{tt("การเปลี่ยนแปลงจะมีผลทั่วถึงทั้งระบบ", "Changes will apply across the platform.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-sm font-bold">{tt("ชื่อที่แสดง (Display Name)", "Display name")}</Label>
          <Input 
            id="displayName"
            placeholder={tt("ใส่ชื่อของคุณ...", "Enter your display name...")}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-11 bg-muted/20"
          />
          <p className="text-[11px] text-muted-foreground">{tt("ชื่อนี้จะปรากฏเมื่อคุณแชทหรือโพส", "This name appears in chat and posts.")}</p>
          {errors.displayName && <p className="text-xs text-destructive mt-1">{errors.displayName}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-sm font-bold">{tt("แนะนำตัว (Bio)", "Bio")}</Label>
          <Textarea
            id="bio"
            placeholder={tt("แนะนำตัวสั้นๆ หรือบอกเวลาที่สะดวก...", "Write a short introduction or your availability...")}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className={`bg-muted/20 min-h-[100px] resize-none ${errors.bio ? "border-destructive focus-visible:ring-destructive" : ""}`}
            maxLength={300}
          />
          <div className="flex justify-between items-start">
             {errors.bio ? <p className="text-xs text-destructive">{errors.bio}</p> : <span />}
             <p className="text-[11px] text-muted-foreground text-right">
               {tt(`${bio.length}/300 ตัวอักษร`, `${bio.length}/300 characters`)}
             </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold opacity-50">{tt("อีเมล (แก้ไขไม่ได้)", "Email (read-only)")}</Label>
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
            {tt("บันทึกการเปลี่ยนแปลง", "Save changes")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
