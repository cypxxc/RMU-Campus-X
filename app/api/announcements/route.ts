/**
 * GET /api/announcements – รายการประกาศที่แสดงได้ (ไม่ต้อง auth)
 * คืนเฉพาะรายการที่ isActive และอยู่ในช่วง startAt–endAt
 */

import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import type { Announcement } from "@/types"

export const dynamic = "force-dynamic"
export const revalidate = 0

function toDate(v: unknown): Date | null {
  if (!v) return null
  if (typeof (v as { toDate?: () => Date }).toDate === "function") return (v as { toDate: () => Date }).toDate()
  if (typeof (v as { toMillis?: () => number }).toMillis === "function") return new Date((v as { toMillis: () => number }).toMillis())
  if (typeof v === "string" || typeof v === "number") return new Date(v)
  return null
}

export async function GET() {
  try {
    const db = getAdminDb()
    const now = new Date()
    const snapshot = await db
      .collection("announcements")
      .where("isActive", "==", true)
      .limit(50)
      .get()

    const list: Announcement[] = []
    const nextChangeTimes: number[] = []
    const docs = snapshot.docs
    for (const doc of docs) {
      const data = doc.data()
      const startAt = toDate(data.startAt)
      const endAt = toDate(data.endAt)
      if (startAt && startAt > now) {
        nextChangeTimes.push(startAt.getTime())
        continue
      }
      if (endAt && endAt < now) continue
      if (endAt) nextChangeTimes.push(endAt.getTime())
      list.push({
        id: doc.id,
        title: data.title ?? "",
        message: data.message ?? "",
        type: data.type ?? "info",
        isActive: data.isActive ?? true,
        startAt: data.startAt ?? null,
        endAt: data.endAt ?? null,
        linkUrl: data.linkUrl ?? null,
        linkLabel: data.linkLabel ?? null,
        createdBy: data.createdBy ?? "",
        createdByEmail: data.createdByEmail ?? undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
    }
    list.sort((a, b) => {
      const tA = toDate(a.createdAt)?.getTime() ?? 0
      const tB = toDate(b.createdAt)?.getTime() ?? 0
      return tB - tA
    })

    const nowMs = now.getTime()
    const futureChanges = nextChangeTimes.filter((t) => t > nowMs)
    const nextChangeAt = futureChanges.length > 0 ? Math.min(...futureChanges) : null
    const nextCheckInMs = nextChangeAt != null ? Math.min(nextChangeAt - nowMs + 500, 5 * 60 * 1000) : null

    return NextResponse.json({
      success: true,
      announcements: list,
      nextCheckInMs: nextCheckInMs != null ? Math.max(1000, nextCheckInMs) : null,
    })
  } catch (error) {
    console.error("[Announcements API] GET Error:", error)
    return NextResponse.json({ success: false, announcements: [] }, { status: 500 })
  }
}
