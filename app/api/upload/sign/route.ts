/**
 * Cloudinary Signed Upload - Sign endpoint
 * Returns signature credentials for client-side direct upload to Cloudinary.
 * Client: 1) Call this API to get signed params 2) POST file directly to Cloudinary
 */
import { NextRequest, NextResponse } from 'next/server'
import { cloudinary, UPLOAD_PRESETS, type UploadPreset } from '@/lib/cloudinary'
import { verifyIdToken, extractBearerToken } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'))
    if (!token) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปภาพ' },
        { status: 401 }
      )
    }

    const decoded = await verifyIdToken(token, false)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const preset = ((body.preset as string) || 'item') as UploadPreset
    const uploadConfig = UPLOAD_PRESETS[preset] ?? UPLOAD_PRESETS.item

    const folder = uploadConfig.folder
    const timestamp = Math.round(Date.now() / 1000)

    const paramsToSign: Record<string, string | number> = {
      timestamp,
      folder,
    }

    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (!apiSecret) {
      console.error('[Upload Sign] CLOUDINARY_API_SECRET not configured')
      return NextResponse.json(
        { error: 'การตั้งค่า Cloudinary ไม่สมบูรณ์' },
        { status: 500 }
      )
    }

    const signature = (cloudinary.utils as { api_sign_request: (p: Record<string, string | number>, s: string) => string }).api_sign_request(
      paramsToSign,
      apiSecret
    )

    return NextResponse.json({
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
    })
  } catch (error) {
    console.error('[Upload Sign] Error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างลายเซ็นอัปโหลด' },
      { status: 500 }
    )
  }
}
