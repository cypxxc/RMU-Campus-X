"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"
import { StarRating } from "@/components/star-rating"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Star } from "lucide-react"
import { useI18n } from "@/components/language-provider"

interface ReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exchangeId: string
  targetUserId: string
  itemTitle: string
  onSuccess?: () => void
}

export function ReviewModal({
  open,
  onOpenChange,
  exchangeId,
  targetUserId,
  itemTitle,
  onSuccess
}: ReviewModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { tt } = useI18n()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!user) return

    if (rating === 0) {
      toast({
        title: tt("กรุณาให้คะแนน", "Please provide a rating"),
        description: tt("โปรดเลือกจำนวนดาวที่ต้องการให้", "Please select a star rating."),
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const idToken = await user.getIdToken()
      
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          exchangeId,
          targetUserId,
          rating,
          comment,
          itemTitle,
          reviewerName: user.displayName || user.email?.split("@")[0] || "User",
          reviewerAvatar: user.photoURL || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to submit review")
      }

      toast({
        title: tt("บันทึกรีวิวสำเร็จ", "Review submitted"),
        description: tt("ขอบคุณสำหรับการประเมิน", "Thank you for your feedback.")
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error: unknown) {
      console.error("Error submitting review:", error)
      toast({
        title: tt("เกิดข้อผิดพลาด", "Error"),
        description: error instanceof Error ? error.message : tt("ไม่สามารถบันทึกรีวิวได้", "Unable to submit review"),
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <UnifiedModal
      open={open}
      onOpenChange={onOpenChange}
      title={tt("ให้คะแนนการแลกเปลี่ยน", "Rate this exchange")}
      description={tt(`คุณมีความคิดเห็นอย่างไรกับการแลกเปลี่ยน "${itemTitle}"?`, `How was your exchange for "${itemTitle}"?`)}
      icon={<Star className="h-5 w-5" />}
      footer={
        <UnifiedModalActions
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
          submitText={tt("ส่งรีวิว", "Submit review")}
          loading={loading}
          submitDisabled={loading}
        />
      }
    >
      <div className="space-y-6 py-2">
        <div className="flex flex-col items-center justify-center space-y-2">
          <Label className="text-base text-muted-foreground">{tt("คะแนนความพึงพอใจ", "Satisfaction rating")}</Label>
          <StarRating 
            rating={rating} 
            onChange={setRating} 
            size={32}
            showValue
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="comment">{tt("ความคิดเห็นเพิ่มเติม (ไม่บังคับ)", "Additional comments (optional)")}</Label>
          <Textarea
            id="comment"
            placeholder={tt("เล่าประสบการณ์ของคุณ...", "Share your experience...")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
      </div>
    </UnifiedModal>
  )
}
