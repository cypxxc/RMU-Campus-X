/**
 * Image Upload Utilities
 * - Cloudinary CDN upload
 * - File validation
 * - Client-side compression
 */

import { compressImage, shouldCompress, blobToFile, formatFileSize } from './image-utils'

/**
 * Upload image to Cloudinary via API
 * Automatically compresses large images before upload
 * @param file - Image file to upload
 * @param preset - Upload preset ('item' | 'avatar')
 * @returns Cloudinary secure URL
 */
export const uploadToCloudinary = async (
  file: File, 
  preset: 'item' | 'avatar' = 'item',
  token?: string
): Promise<string> => {
  let fileToUpload: File = file
  
  // Compress image if it's larger than 500KB
  if (shouldCompress(file)) {
    try {
      const originalSize = file.size
      const compressedBlob = await compressImage(file, {
        maxWidth: preset === 'avatar' ? 400 : 1200,
        maxHeight: preset === 'avatar' ? 400 : 1200,
        quality: 0.8,
        format: 'image/webp'
      })
      
      // Only use compressed version if it's actually smaller
      if (compressedBlob.size < originalSize) {
        fileToUpload = blobToFile(compressedBlob, file.name.replace(/\.[^.]+$/, '.webp'))
        console.log(`[Upload] Compressed: ${formatFileSize(originalSize)} → ${formatFileSize(compressedBlob.size)}`)
      }
    } catch (error) {
      // If compression fails, use original file
      console.warn('[Upload] Compression failed, using original file:', error)
    }
  }

  const formData = new FormData()
  formData.append('file', fileToUpload)
  formData.append('preset', preset)

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'อัปโหลดรูปภาพไม่สำเร็จ')
  }

  const data = await response.json()
  return data.url
}

/**
 * Validate image file before upload
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB max input
  const ALLOWED_TYPES = ['image/jpeg', 'image/png']
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG)' }
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)' }
  }
  
  return { valid: true }
}

