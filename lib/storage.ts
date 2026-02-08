/**
 * Image Upload Utilities
 * - Cloudinary CDN upload (Signed Upload - direct to Cloudinary)
 * - File validation
 * - Client-side compression
 */

import { compressImage, shouldCompress, blobToFile, formatFileSize } from './image-utils'

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1'

/**
 * Upload image directly to Cloudinary using Signed Upload
 * 1. Call /api/upload/sign to get credentials
 * 2. POST file + signature directly to Cloudinary
 * @param file - Image file to upload
 * @param preset - Upload preset ('item' | 'avatar')
 * @returns Cloudinary public_id (store this in Firestore for transform flexibility)
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
        format: 'image/webp',
      })

      if (compressedBlob.size < originalSize) {
        fileToUpload = blobToFile(compressedBlob, file.name.replace(/\.[^.]+$/, '.webp'))
        console.log(`[Upload] Compressed: ${formatFileSize(originalSize)} → ${formatFileSize(compressedBlob.size)}`)
      }
    } catch (error) {
      console.warn('[Upload] Compression failed, using original file:', error)
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const signRes = await fetch('/api/upload/sign', {
    method: 'POST',
    headers,
    body: JSON.stringify({ preset }),
  })

  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}))
    throw new Error(err.error || 'ไม่สามารถรับลายเซ็นอัปโหลดได้')
  }

  const { signature, timestamp, api_key, cloud_name, folder } = await signRes.json()

  const formData = new FormData()
  formData.append('file', fileToUpload)
  formData.append('signature', signature)
  formData.append('timestamp', String(timestamp))
  formData.append('api_key', api_key)
  formData.append('folder', folder)

  const uploadUrl = `${CLOUDINARY_UPLOAD_URL}/${cloud_name}/image/upload`
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })

  if (!uploadRes.ok) {
    const errData = await uploadRes.json().catch(() => ({}))
    const errMsg = errData?.error?.message || errData?.error || 'อัปโหลดรูปภาพไม่สำเร็จ'
    throw new Error(errMsg)
  }

  const data = await uploadRes.json()
  return data.public_id
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

