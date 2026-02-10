/**
 * Cloudinary Configuration
 * Server-side only - contains API secrets
 */
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export { cloudinary }

/**
 * Upload options for different use cases
 */
export const UPLOAD_PRESETS = {
  item: {
    folder: 'rmu-exchange/items',
    transformation: [
      { width: 800, height: 600, crop: 'limit', quality: 'auto:good' }
    ],
  },
  avatar: {
    folder: 'rmu-exchange/avatars',
    transformation: [
      { width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto:good' }
    ],
  },
  thumbnail: {
    folder: 'rmu-exchange/thumbnails',
    transformation: [
      { width: 100, height: 100, crop: 'fill', quality: 'auto' }
    ],
  },
  chat: {
    folder: 'rmu-exchange/chat',
    transformation: [
      { width: 800, crop: 'limit', quality: 'auto' } // Chat images shouldn't be too small but optimized
    ],
  },
  announcement: {
    folder: 'rmu-exchange/announcements',
    transformation: [
      { width: 1600, height: 900, crop: 'limit', quality: 'auto:good' }
    ],
  },
} as const

export type UploadPreset = keyof typeof UPLOAD_PRESETS
