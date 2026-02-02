/**
 * POST /api/analytics/vitals
 * รับ Web Vitals จาก sendBeacon (components/web-vitals.tsx)
 * Vercel Analytics จับค่าหลักอยู่แล้ว — route นี้แค่รับ request เพื่อไม่ให้ 405
 */

import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    await request.json().catch(() => ({}))
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}
