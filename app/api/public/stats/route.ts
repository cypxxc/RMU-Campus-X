/**
 * Public Stats API – สำหรับ Landing Page
 * GET /api/public/stats
 * คืนค่า: จำนวนสิ่งของ, ผู้ใช้งาน, การแลกเปลี่ยนสำเร็จ (ไม่ต้อง auth)
 * การแลกเปลี่ยนสำเร็จ: นับเฉพาะที่ completed ใน 1 ปีล่าสุด (ไม่นับข้อมูลเก่าค้าง)
 */

import { NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

export async function GET() {
  try {
    const db = getAdminDb()
    const oneYearAgo = Timestamp.fromDate(new Date(Date.now() - ONE_YEAR_MS))

    const [itemsCount, usersCount, completedExchangesCount] = await Promise.all([
      db.collection("items").count().get().then((s) => s.data().count),
      db.collection("users").count().get().then((s) => s.data().count),
      // นับเฉพาะการแลกเปลี่ยนที่สำเร็จใน 1 ปีล่าสุด (กรองข้อมูลเก่าค้าง)
      db
        .collection("exchanges")
        .where("status", "==", "completed")
        .where("updatedAt", ">=", oneYearAgo)
        .count()
        .get()
        .then((s) => s.data().count)
        .catch(() =>
          // fallback: ถ้าไม่มี composite index (status, updatedAt) ให้นับทั้งหมด
          db.collection("exchanges").where("status", "==", "completed").count().get().then((s) => s.data().count)
        ),
    ])
    return NextResponse.json({
      success: true,
      data: {
        items: itemsCount,
        users: usersCount,
        completedExchanges: completedExchangesCount,
      },
    })
  } catch (error) {
    console.error("[Public Stats] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
