/**
 * Advanced Image Processing Utilities
 * Features:
 * - WebP format support (30% smaller than JPEG)
 * - Adaptive quality based on image size
 * - Progressive compression
 * - Multiple size variants (thumbnail, preview, full)
 */

export interface ImageProcessingOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'webp' | 'jpeg'
  generateThumbnail?: boolean
}

export interface ProcessedImage {
  full: string           // Full size (max 800px)
  thumbnail?: string     // Thumbnail (100px) for lists
  originalSize: number   // Original file size in bytes
  compressedSize: number // Compressed size in bytes
  compressionRatio: number // Compression percentage
}

/**
 * Check if browser supports WebP format
 */
const supportsWebP = (): boolean => {
  if (typeof document === 'undefined') return false
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').startsWith('data:image/webp')
}

/**
 * Calculate optimal quality based on image dimensions
 * Larger images use lower quality for better compression
 */
const getOptimalQuality = (width: number, height: number): number => {
  const pixels = width * height
  if (pixels > 2000000) return 0.5  // > 2MP: use 50%
  if (pixels > 1000000) return 0.6  // > 1MP: use 60%
  if (pixels > 500000) return 0.65  // > 0.5MP: use 65%
  return 0.7 // Default: 70%
}

/**
 * Estimate Base64 string size in bytes
 */
const getBase64Size = (base64: string): number => {
  // Remove data URL prefix
  const base64Data = base64.split(',')[1] || base64
  // Base64 uses 4 chars per 3 bytes
  return Math.round((base64Data.length * 3) / 4)
}

/**
 * Advanced image resizing with format optimization
 */
const processImageCanvas = (
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  format: 'webp' | 'jpeg'
): string => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('ไม่สามารถสร้าง canvas context ได้')
  }

  // Calculate dimensions maintaining aspect ratio
  let width = img.width
  let height = img.height

  if (width > height) {
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width)
      width = maxWidth
    }
  } else {
    if (height > maxHeight) {
      width = Math.round((width * maxHeight) / height)
      height = maxHeight
    }
  }

  canvas.width = width
  canvas.height = height

  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Draw resized image
  ctx.drawImage(img, 0, 0, width, height)

  // Use WebP if supported, fallback to JPEG
  const mimeType = format === 'webp' && supportsWebP() ? 'image/webp' : 'image/jpeg'
  return canvas.toDataURL(mimeType, quality)
}

/**
 * Main image resize function - enhanced version
 * @param file - Image file to process
 * @returns Base64 Data URL string (optimized)
 */
export const resizeImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new window.Image()

      img.onload = () => {
        try {
          // Use WebP if supported for better compression
          const format = supportsWebP() ? 'webp' : 'jpeg'
          
          // Calculate optimal quality based on image size
          const quality = getOptimalQuality(img.width, img.height)
          
          // Process image with optimized settings
          const base64 = processImageCanvas(img, 800, 600, quality, format)
          
          // Log compression stats in development
          if (process.env.NODE_ENV === 'development') {
            const originalSize = file.size
            const compressedSize = getBase64Size(base64)
            const ratio = Math.round((1 - compressedSize / originalSize) * 100)
            console.log(`[ImageOptimization] ${file.name}: ${(originalSize/1024).toFixed(1)}KB → ${(compressedSize/1024).toFixed(1)}KB (${ratio}% smaller, ${format})`)
          }
          
          resolve(base64)
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('ไม่สามารถโหลดรูปภาพได้'))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('ไม่สามารถอ่านไฟล์ได้'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Advanced image processing with multiple outputs
 * @param file - Image file to process
 * @param options - Processing options
 * @returns ProcessedImage with multiple sizes and stats
 */
export const processImage = async (
  file: File,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> => {
  const {
    maxWidth = 800,
    maxHeight = 600,
    quality,
    format = supportsWebP() ? 'webp' : 'jpeg',
    generateThumbnail = false
  } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new window.Image()

      img.onload = () => {
        try {
          // Calculate optimal quality if not specified
          const finalQuality = quality ?? getOptimalQuality(img.width, img.height)
          
          // Generate full size image
          const full = processImageCanvas(img, maxWidth, maxHeight, finalQuality, format)
          
          // Generate thumbnail if requested
          let thumbnail: string | undefined
          if (generateThumbnail) {
            thumbnail = processImageCanvas(img, 100, 100, 0.6, format)
          }
          
          const originalSize = file.size
          const compressedSize = getBase64Size(full)
          const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100)
          
          resolve({
            full,
            thumbnail,
            originalSize,
            compressedSize,
            compressionRatio
          })
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปภาพได้'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'))
    reader.readAsDataURL(file)
  })
}

/**
 * Compress existing Base64 image for re-optimization
 * Useful for migrating old images to new format
 */
export const recompressBase64Image = async (
  base64: string,
  quality: number = 0.6
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    
    img.onload = () => {
      try {
        const format = supportsWebP() ? 'webp' : 'jpeg'
        const result = processImageCanvas(img, img.width, img.height, quality, format)
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปภาพได้'))
    img.src = base64
  })
}

/**
 * Validate image file before processing
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB max input
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WebP, GIF)' }
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)' }
  }
  
  return { valid: true }
}
