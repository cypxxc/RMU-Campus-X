"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ImagePlus, Loader2, X } from "lucide-react"
import { compressImage } from "@/lib/image-utils"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface ChatImageUploadProps {
  onImageSelected: (file: File, previewUrl: string) => void
  onClear: () => void
  disabled?: boolean
  selectedImage?: string | null
}

export function ChatImageUpload({ onImageSelected, onClear, disabled, selectedImage }: ChatImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "ไฟล์ไม่ถูกต้อง",
        description: "กรุณาเลือกไฟล์รูปภาพเท่านั้น",
        variant: "destructive"
      })
      return
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "ไฟล์ใหญ่เกินไป",
        description: "ขนาดรูปภาพต้องไม่เกิน 5MB",
        variant: "destructive"
      })
      return
    }

    try {
      setUploading(true)
      // Basic compression before preview
      const compressedBlob = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8
      })
      
      const compressedFile = new File([compressedBlob], file.name, {
        type: file.type
      })

      const previewUrl = URL.createObjectURL(compressedBlob)
      onImageSelected(compressedFile, previewUrl)
      
    } catch (error) {
      console.error('Image processing error:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถประมวลผลรูปภาพได้",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      // Reset input specifically to allow re-selecting same file if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleClear = () => {
    onClear()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />

      {selectedImage ? (
        <div className="relative group">
           <div className="relative h-16 w-16 rounded-lg overflow-hidden border bg-background">
             <Image 
               src={selectedImage}
               alt="Selected"
               fill
               className="object-cover"
             />
           </div>
           <button
             onClick={handleClear}
             className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm hover:bg-destructive/90 transition-colors"
             type="button"
           >
             <X className="h-3 w-3" />
           </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="h-10 w-10 shrink-0 rounded-full"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="sr-only">ส่งรูปภาพ</span>
        </Button>
      )}
    </div>
  )
}
