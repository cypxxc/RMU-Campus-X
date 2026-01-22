/**
 * Cloudinary Upload API
 * Handles image uploads to Cloudinary CDN
 */
import { NextRequest, NextResponse } from 'next/server'
import { cloudinary, UPLOAD_PRESETS, type UploadPreset } from '@/lib/cloudinary'
import { verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"

export const runtime = 'nodejs'

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed image MIME types with their magic bytes
const IMAGE_SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF87a or GIF89a
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF header (WebP starts with RIFF)
]

/**
 * Validate file type by checking magic bytes (file signature)
 * More secure than trusting Content-Type header which can be spoofed
 */
function validateImageMagicBytes(buffer: Buffer): { valid: boolean; detectedMime?: string } {
  for (const sig of IMAGE_SIGNATURES) {
    const matches = sig.bytes.every((byte, index) => buffer[index] === byte)
    if (matches) {
      // Special check for WebP: must have "WEBP" at offset 8
      if (sig.mime === 'image/webp') {
        const webpMarker = buffer.slice(8, 12).toString('ascii')
        if (webpMarker !== 'WEBP') continue
      }
      return { valid: true, detectedMime: sig.mime }
    }
  }
  return { valid: false }
}

export async function POST(request: NextRequest) {
  try {
    // Verify Authentication
    const token = extractBearerToken(request.headers.get("Authorization"))
    if (!token) {
      console.error('[Upload API] No token provided')
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปภาพ" }, { status: 401 })
    }
    
    // Only verify token, don't check Firestore status (user might be uploading during registration)
    const decoded = await verifyIdToken(token, false)
    if (!decoded) {
      console.error('[Upload API] Token verification failed')
      return NextResponse.json({ error: "Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const preset = (formData.get('preset') as UploadPreset) || 'item'

    if (!file) {
      return NextResponse.json(
        { error: 'ไม่พบไฟล์รูปภาพ' },
        { status: 400 }
      )
    }

    // Validate file size first (before reading full content)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Validate file type via magic bytes (more secure than Content-Type)
    const validation = validateImageMagicBytes(buffer)
    if (!validation.valid) {
      console.warn('[Upload API] Invalid magic bytes, claimed type:', file.type)
      return NextResponse.json(
        { error: 'รูปแบบไฟล์ไม่ถูกต้อง รองรับเฉพาะ JPEG, PNG, GIF, WebP' },
        { status: 400 }
      )
    }

    // Get upload settings
    const uploadConfig = UPLOAD_PRESETS[preset] || UPLOAD_PRESETS.item

    // Upload to Cloudinary
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: uploadConfig.folder,
          transformation: uploadConfig.transformation,
          resource_type: 'image',
          format: 'webp', // Convert all to WebP for better compression
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result as { secure_url: string; public_id: string })
        }
      ).end(buffer)
    })

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    })
  } catch (error) {
    console.error('[Upload API] Error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัปโหลด' },
      { status: 500 }
    )
  }
}

