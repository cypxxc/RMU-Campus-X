/**
 * Reports API Route
 * สร้าง Report พร้อมส่ง LINE Notification ไปยัง Admin
 */

import { NextRequest, NextResponse } from "next/server"
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { notifyAdminsNewReport } from "@/lib/line"
import type { Report, User } from "@/types"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

interface CreateReportBody {
  reportType: Report["reportType"]
  reasonCode: string
  reason: string
  description: string
  reporterId: string
  reporterEmail: string
  targetId: string
  targetType?: string
  targetTitle?: string
  reportedUserId: string
  reportedUserEmail: string
  itemId?: string
  itemTitle?: string
  exchangeId?: string
  evidenceUrls?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateReportBody = await request.json()

    const {
      reportType,
      reasonCode,
      reason,
      description,
      reporterId,
      reporterEmail,
      targetId,
      targetTitle,
      reportedUserId,
      reportedUserEmail,
      ...optionalFields
    } = body

    // Validate required fields
    if (!reportType || !reporterId || !targetId || !reportedUserId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const db = getFirebaseDb()

    // Create report document
    const reportData = {
      reportType,
      reasonCode: reasonCode || "",
      reason: reason || "",
      description: description || "",
      reporterId,
      reporterEmail: reporterEmail || "",
      targetId,
      targetTitle: targetTitle || "",
      reportedUserId,
      reportedUserEmail: reportedUserEmail || "",
      ...optionalFields,
      status: "new" as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, "reports"), reportData)
    console.log("[Report API] Created report:", docRef.id)

    // Create in-app notifications for admins
    const adminsSnapshot = await getDocs(collection(db, "admins"))
    
    for (const adminDoc of adminsSnapshot.docs) {
      const adminData = adminDoc.data()
      // Get admin user ID from users collection by email
      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", adminData.email)
      )
      const usersSnapshot = await getDocs(usersQuery)

      if (!usersSnapshot.empty && usersSnapshot.docs[0]) {
        const adminUserId = usersSnapshot.docs[0].data().uid
        await addDoc(collection(db, "notifications"), {
          userId: adminUserId,
          title: "🚨 มีรายงานใหม่",
          message: `${getReportTypeLabel(reportType)}: "${targetTitle || targetId}"`,
          type: "report",
          relatedId: docRef.id,
          isRead: false,
          createdAt: serverTimestamp(),
        })
      }
    }

    // ============ LINE Notification to Admins ============
    const adminLineUserIds = await getAdminLineUserIds(db)
    
    if (adminLineUserIds.length > 0) {
      console.log("[Report API] Sending LINE notification to", adminLineUserIds.length, "admins")
      
      await notifyAdminsNewReport(
        adminLineUserIds,
        reportType,
        targetTitle || targetId,
        reporterEmail,
        BASE_URL
      )
    }

    return NextResponse.json({
      success: true,
      reportId: docRef.id,
    })
  } catch (error) {
    console.error("[Report API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper function to get admin LINE User IDs
async function getAdminLineUserIds(db: any): Promise<string[]> {
  const adminsSnapshot = await getDocs(collection(db, "admins"))
  const adminEmails = adminsSnapshot.docs.map(doc => doc.data().email)

  if (adminEmails.length === 0) {
    return []
  }

  const lineUserIds: string[] = []

  for (const email of adminEmails) {
    const usersQuery = query(
      collection(db, "users"),
      where("email", "==", email)
    )
    const usersSnapshot = await getDocs(usersQuery)

    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0]!.data() as User
      if (userData.lineUserId && userData.lineNotifications?.enabled) {
        lineUserIds.push(userData.lineUserId)
      }
    }
  }

  return lineUserIds
}

function getReportTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    item_report: "รายงานสิ่งของ",
    exchange_report: "รายงานการแลกเปลี่ยน",
    chat_report: "รายงานแชท",
    user_report: "รายงานผู้ใช้",
  }
  return labels[type] || type
}
