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

export async function POST(request: NextRequest) {
  try {
    // Verify Authentication
    const token = extractBearerToken(request.headers.get("Authorization"))
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const decoded = await verifyIdToken(token, true) // Force Firestore Status Check
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'รองรับเฉพาะไฟล์รูปภาพ' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

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
