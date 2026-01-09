/**
 * useImageUpload Hook
 * Reusable hook for handling image uploads to Cloudinary
 */

import { useState, useCallback } from "react"
import { uploadToCloudinary, validateImageFile } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"
import { IMAGE_UPLOAD_CONFIG } from "@/lib/constants"

export interface UseImageUploadOptions {
  maxImages?: number
  folder?: "item" | "avatar"
  onUploadComplete?: (urls: string[]) => void
  onError?: (error: string) => void
}

export interface UseImageUploadReturn {
  images: string[]
  isUploading: boolean
  uploadProgress: number
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  removeImage: (index: number) => void
  clearImages: () => void
  canAddMore: boolean
}

export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const {
    maxImages = IMAGE_UPLOAD_CONFIG.maxImages,
    folder = "item",
    onUploadComplete,
    onError,
  } = options

  const [images, setImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const { toast } = useToast()

  const canAddMore = images.length < maxImages

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Check max limit
    const remainingSlots = maxImages - images.length
    if (files.length > remainingSlots) {
      const errorMsg = `สามารถอัพโหลดได้อีก ${remainingSlots} รูป (สูงสุด ${maxImages} รูป)`
      toast({
        title: "รูปภาพเกินจำนวน",
        description: errorMsg,
        variant: "destructive",
      })
      onError?.(errorMsg)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const newImages: string[] = []
      let uploadCount = 0
      const totalFiles = files.length

      for (const file of Array.from(files)) {
        // Validate each file
        const validation = validateImageFile(file)
        if (!validation.valid) {
          toast({
            title: "ไฟล์ไม่ถูกต้อง",
            description: `${file.name}: ${validation.error}`,
            variant: "destructive",
          })
          onError?.(`${file.name}: ${validation.error}`)
          continue
        }

        // Upload to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(file, folder)
        newImages.push(cloudinaryUrl)
        uploadCount++
        setUploadProgress(Math.round((uploadCount / totalFiles) * 100))
      }

      if (newImages.length > 0) {
        const updatedImages = [...images, ...newImages].slice(0, maxImages)
        setImages(updatedImages)
        
        toast({
          title: `อัปโหลด ${uploadCount} รูปภาพสำเร็จ ✨`,
          description: `รูปภาพถูกบันทึกไปยัง Cloudinary CDN`,
        })

        onUploadComplete?.(updatedImages)
      }
    } catch (error) {
      console.error("[useImageUpload] Error processing images:", error)
      const errorMsg = "ไม่สามารถประมวลผลรูปภาพได้"
      toast({
        title: "เกิดข้อผิดพลาด",
        description: errorMsg,
        variant: "destructive",
      })
      onError?.(errorMsg)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      // Reset input
      e.target.value = ''
    }
  }, [images, maxImages, folder, toast, onUploadComplete, onError])

  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearImages = useCallback(() => {
    setImages([])
  }, [])

  return {
    images,
    isUploading,
    uploadProgress,
    handleFileChange,
    removeImage,
    clearImages,
    canAddMore,
  }
}
