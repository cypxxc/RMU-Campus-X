/**
 * LINE Account Link API
 * Verify link code, manage LINE link status/settings, and unlink from web.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import {
  applyDefaultRichMenuToUser,
  removeRichMenuFromUser,
  sendLinkSuccessMessage,
} from "@/lib/line"

interface LinkRequestBody {
  userId: string
  linkCode: string
}

interface LineSettingsRequestBody {
  userId?: string
  settings?: {
    enabled?: boolean
    exchangeRequest?: boolean
    exchangeStatus?: boolean
    exchangeComplete?: boolean
  }
}

interface UnlinkRequestBody {
  userId?: string
}

type AuthResult =
  | { uid: string }
  | { response: NextResponse }

const DEFAULT_DISABLED_SETTINGS = {
  enabled: false,
  exchangeRequest: false,
  exchangeStatus: false,
  exchangeComplete: false,
}

async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const token = extractBearerToken(request.headers.get("Authorization"))
  if (!token) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const decoded = await verifyIdToken(token, true)
  if (!decoded) {
    return { response: NextResponse.json({ error: "Invalid token" }, { status: 401 }) }
  }

  return { uid: decoded.uid }
}

function resolveUserId(bodyUserId: string | undefined, authUid: string): string {
  return bodyUserId?.trim() || authUid
}

function isSameUser(authUid: string, targetUserId: string): boolean {
  return authUid === targetUserId
}

function isValidSettings(
  settings: LineSettingsRequestBody["settings"]
): settings is NonNullable<LineSettingsRequestBody["settings"]> {
  if (!settings || typeof settings !== "object") return false
  const keys: Array<keyof NonNullable<LineSettingsRequestBody["settings"]>> = [
    "enabled",
    "exchangeRequest",
    "exchangeStatus",
    "exchangeComplete",
  ]
  return keys.every((key) => settings[key] === undefined || typeof settings[key] === "boolean")
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if ("response" in auth) return auth.response

    const body: LinkRequestBody = await request.json()
    const userId = resolveUserId(body.userId, auth.uid)
    const linkCode = body.linkCode?.trim()

    if (!userId || !linkCode) {
      return NextResponse.json(
        { error: "Missing userId or linkCode" },
        { status: 400 }
      )
    }

    if (!isSameUser(auth.uid, userId)) {
      return NextResponse.json(
        { error: "สามารถเชื่อมได้เฉพาะบัญชีของท่านเท่านั้น" },
        { status: 403 }
      )
    }

    const db = getAdminDb()

    const pendingLinksSnapshot = await db.collection("pendingLineLinks")
      .where("linkCode", "==", linkCode)
      .limit(1)
      .get()

    if (pendingLinksSnapshot.empty) {
      return NextResponse.json(
        { error: "รหัสไม่ถูกต้องหรือหมดอายุแล้ว" },
        { status: 400 }
      )
    }

    const pendingLink = pendingLinksSnapshot.docs[0]!
    const pendingData = pendingLink.data() as {
      lineUserId?: string
      expiresAt?: Timestamp
    }

    const expiresAt = pendingData.expiresAt
    if (!expiresAt || expiresAt.toDate() < new Date()) {
      await pendingLink.ref.delete()
      return NextResponse.json(
        { error: "รหัสหมดอายุแล้ว กรุณาขอรหัสใหม่" },
        { status: 400 }
      )
    }

    const lineUserId = pendingData.lineUserId?.trim()
    if (!lineUserId) {
      await pendingLink.ref.delete()
      return NextResponse.json(
        { error: "Invalid LINE link data" },
        { status: 400 }
      )
    }

    const userRef = db.collection("users").doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const userData = userDoc.data()!

    const existingSnapshot = await db.collection("users")
      .where("lineUserId", "==", lineUserId)
      .limit(1)
      .get()

    if (!existingSnapshot.empty && existingSnapshot.docs[0]!.id !== userId) {
      return NextResponse.json(
        { error: "บัญชี LINE นี้เชื่อมกับผู้ใช้อื่นแล้ว" },
        { status: 400 }
      )
    }

    await userRef.update({
      lineUserId,
      lineLinkCode: null,
      lineLinkCodeExpires: null,
      lineNotifications: {
        enabled: true,
        exchangeRequest: true,
        exchangeStatus: true,
        exchangeComplete: true,
      },
      updatedAt: FieldValue.serverTimestamp(),
    })

    await pendingLink.ref.delete()

    const richMenuResult = await applyDefaultRichMenuToUser(lineUserId)
    if (!richMenuResult.success && !richMenuResult.skipped) {
      console.warn("[LINE Link] Failed to apply default rich menu:", richMenuResult.error)
    }

    await sendLinkSuccessMessage(lineUserId, userData.displayName || userData.email || "คุณ")

    return NextResponse.json({
      success: true,
      message: "เชื่อมบัญชี LINE สำเร็จ",
      richMenuApplied: richMenuResult.success && !richMenuResult.skipped,
      richMenuId: richMenuResult.richMenuId ?? null,
    })
  } catch (error) {
    console.error("[LINE Link] POST Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if ("response" in auth) return auth.response

    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get("userId")?.trim()
    const userId = requestedUserId || auth.uid

    if (!isSameUser(auth.uid, userId)) {
      return NextResponse.json(
        { error: "สามารถดูได้เฉพาะข้อมูลของท่านเท่านั้น" },
        { status: 403 }
      )
    }

    const db = getAdminDb()
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const userData = userDoc.data()!

    return NextResponse.json({
      isLinked: !!userData.lineUserId,
      settings: userData.lineNotifications || DEFAULT_DISABLED_SETTINGS,
    })
  } catch (error) {
    console.error("[LINE Link] GET Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if ("response" in auth) return auth.response

    const body = await request.json() as LineSettingsRequestBody
    const userId = resolveUserId(body.userId, auth.uid)
    const { settings } = body

    if (!isSameUser(auth.uid, userId)) {
      return NextResponse.json(
        { error: "สามารถแก้ไขได้เฉพาะข้อมูลของท่านเท่านั้น" },
        { status: 403 }
      )
    }

    if (!isValidSettings(settings)) {
      return NextResponse.json(
        { error: "Invalid settings payload" },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const userRef = db.collection("users").doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const mergedSettings = {
      ...DEFAULT_DISABLED_SETTINGS,
      ...(userDoc.data()?.lineNotifications || {}),
      ...settings,
    }

    await userRef.update({
      lineNotifications: mergedSettings,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      message: "อัปเดตการตั้งค่าสำเร็จ",
      settings: mergedSettings,
    })
  } catch (error) {
    console.error("[LINE Link] PATCH Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if ("response" in auth) return auth.response

    const body = await request.json().catch(() => ({}) as UnlinkRequestBody)
    const userId = resolveUserId(body.userId, auth.uid)

    if (!isSameUser(auth.uid, userId)) {
      return NextResponse.json(
        { error: "สามารถยกเลิกได้เฉพาะบัญชีของท่านเท่านั้น" },
        { status: 403 }
      )
    }

    const db = getAdminDb()
    const userRef = db.collection("users").doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const userData = userDoc.data() as { lineUserId?: string }
    const lineUserId = userData.lineUserId?.trim()

    await userRef.update({
      lineUserId: null,
      lineLinkCode: null,
      lineLinkCodeExpires: null,
      lineNotifications: DEFAULT_DISABLED_SETTINGS,
      updatedAt: FieldValue.serverTimestamp(),
    })

    if (lineUserId) {
      const richMenuResult = await removeRichMenuFromUser(lineUserId)
      if (!richMenuResult.success) {
        console.warn("[LINE Link] Failed to remove user rich menu:", richMenuResult.error)
      }

      await db.collection("lineChatSessions").doc(lineUserId).delete().catch(() => null)
    }

    return NextResponse.json({
      success: true,
      message: "ยกเลิกการเชื่อมต่อสำเร็จ",
      lineUserId: lineUserId || null,
    })
  } catch (error) {
    console.error("[LINE Link] DELETE Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
