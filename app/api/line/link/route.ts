/**
 * LINE Account Link API
 * Verify link code and connect LINE account to Firebase user
 */

import { NextRequest, NextResponse } from "next/server"
import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { sendLinkSuccessMessage } from "@/lib/line"

interface LinkRequestBody {
  userId: string      // Firebase User ID
  linkCode: string    // 6-digit code from LINE
}

export async function POST(request: NextRequest) {
  try {
    const body: LinkRequestBody = await request.json()
    const { userId, linkCode } = body

    if (!userId || !linkCode) {
      return NextResponse.json(
        { error: "Missing userId or linkCode" },
        { status: 400 }
      )
    }

    const db = getFirebaseDb()

    // Search through pendingLineLinks for matching code
    
    // Search through pendingLineLinks for matching code
    const { collection: firestoreCollection, query, where, getDocs } = await import("firebase/firestore")
    const pendingLinksQuery = query(
      firestoreCollection(db, "pendingLineLinks"),
      where("linkCode", "==", linkCode)
    )
    
    const snapshot = await getDocs(pendingLinksQuery)
    
    if (snapshot.empty) {
      return NextResponse.json(
        { error: "รหัสไม่ถูกต้องหรือหมดอายุแล้ว" },
        { status: 400 }
      )
    }

    const pendingLink = snapshot.docs[0]!
    const pendingData = pendingLink.data()

    // Check if code is expired
    const expiresAt = pendingData.expiresAt as Timestamp
    if (expiresAt.toDate() < new Date()) {
      // Delete expired link
      await deleteDoc(pendingLink.ref)
      return NextResponse.json(
        { error: "รหัสหมดอายุแล้ว กรุณาขอรหัสใหม่" },
        { status: 400 }
      )
    }

    const lineUserId = pendingData.lineUserId

    // Update user document with LINE User ID
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const userData = userDoc.data()

    // Check if this LINE account is already linked to another user
    const existingQuery = query(
      firestoreCollection(db, "users"),
      where("lineUserId", "==", lineUserId)
    )
    const existingSnapshot = await getDocs(existingQuery)
    
    if (!existingSnapshot.empty && existingSnapshot.docs[0]!.id !== userId) {
      return NextResponse.json(
        { error: "บัญชี LINE นี้เชื่อมกับผู้ใช้อื่นแล้ว" },
        { status: 400 }
      )
    }

    // Link the account
    await updateDoc(userRef, {
      lineUserId,
      lineLinkCode: null,
      lineLinkCodeExpires: null,
      lineNotifications: {
        enabled: true,
        exchangeRequest: true,
        exchangeStatus: true,
        exchangeComplete: true,
      },
      updatedAt: serverTimestamp(),
    })

    // Delete the pending link
    await deleteDoc(pendingLink.ref)

    // Send success message to LINE
    await sendLinkSuccessMessage(lineUserId, userData.displayName || userData.email || "คุณ")

    return NextResponse.json({
      success: true,
      message: "เชื่อมบัญชี LINE สำเร็จ",
    })
  } catch (error) {
    console.error("[LINE Link] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Get LINE link status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      )
    }

    const db = getFirebaseDb()
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const userData = userDoc.data()

    return NextResponse.json({
      isLinked: !!userData.lineUserId,
      settings: userData.lineNotifications || {
        enabled: false,
        exchangeRequest: false,
        exchangeStatus: false,
        exchangeComplete: false,
      },
    })
  } catch (error) {
    console.error("[LINE Link] GET Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Update LINE notification settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, settings } = body

    if (!userId || !settings) {
      return NextResponse.json(
        { error: "Missing userId or settings" },
        { status: 400 }
      )
    }

    const db = getFirebaseDb()
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    await updateDoc(userRef, {
      lineNotifications: settings,
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      message: "อัปเดตการตั้งค่าสำเร็จ",
    })
  } catch (error) {
    console.error("[LINE Link] PATCH Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
