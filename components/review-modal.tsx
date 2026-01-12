"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { createReview } from "@/lib/db/reviews"
import { UnifiedModal, UnifiedModalActions } from "@/components/ui/unified-modal"
import { StarRating } from "@/components/star-rating"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Star } from "lucide-react"

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
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!user) return

    if (rating === 0) {
      toast({
        title: "กรุณาให้คะแนน",
        description: "โปรดเลือกจำนวนดาวที่ต้องการให้",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      await createReview(
        exchangeId,
        user.uid,
        targetUserId,
        rating,
        comment,
        itemTitle,
        user.displayName || user.email?.split("@")[0] || "User",
        user.photoURL || undefined
      )

      toast({
        title: "บันทึกรีวิวสำเร็จ",
        description: "ขอบคุณสำหรับการประเมิน"
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("Error submitting review:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถบันทึกรีวิวได้",
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
      title="ให้คะแนนการแลกเปลี่ยน"
      description={`คุณมีความคิดเห็นอย่างไรกับการแลกเปลี่ยน "${itemTitle}"?`}
      icon={<Star className="h-5 w-5" />}
      footer={
        <UnifiedModalActions
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
          submitText="ส่งรีวิว"
          loading={loading}
          submitDisabled={loading}
        />
      }
    >
      <div className="space-y-6 py-2">
        <div className="flex flex-col items-center justify-center space-y-2">
          <Label className="text-base text-muted-foreground">คะแนนความพึงพอใจ</Label>
          <StarRating 
            rating={rating} 
            onChange={setRating} 
            size={32}
            showValue
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="comment">ความคิดเห็นเพิ่มเติม (ไม่บังคับ)</Label>
          <Textarea
            id="comment"
            placeholder="เล่าประสบการณ์ของคุณ..."
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
