/**
 * GET /api/announcements/history
 * Returns announcements history for announcement archive page.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import type { Announcement } from "@/types"

export const dynamic = "force-dynamic"
export const revalidate = 0

function normalizeLimit(input: string | null): number {
  const parsed = Number(input)
  if (!Number.isFinite(parsed)) return 100
  return Math.min(Math.max(Math.floor(parsed), 1), 200)
}

export async function GET(request: NextRequest) {
  try {
    const limit = normalizeLimit(request.nextUrl.searchParams.get("limit"))
    const db = getAdminDb()
    const snapshot = await db
      .collection("announcements")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()

    const announcements: Announcement[] = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title ?? "",
        message: data.message ?? "",
        type: data.type ?? "info",
        isActive: data.isActive ?? true,
        startAt: data.startAt ?? null,
        endAt: data.endAt ?? null,
        linkUrl: data.linkUrl ?? null,
        linkLabel: data.linkLabel ?? null,
        imagePublicId: data.imagePublicId ?? null,
        createdBy: data.createdBy ?? "",
        createdByEmail: data.createdByEmail ?? undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
    })

    return NextResponse.json({ success: true, announcements })
  } catch (error) {
    console.error("[Announcements History API] GET Error:", error)
    return NextResponse.json({ success: false, announcements: [] }, { status: 500 })
  }
}

