import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { enforceAdminMutationRateLimit, verifyAdminAccess } from "@/lib/admin-api"

const DEFAULT_REASON = "Removed warning from admin user detail"

type DeleteWarningResult =
  | { state: "ok"; warningCount: number; userStatus: string }
  | { state: "not_found" }
  | { state: "mismatch" }
  | { state: "invalid_action" }

function getReasonFromBody(body: unknown): string {
  const value = typeof body === "object" && body !== null ? (body as { reason?: unknown }).reason : undefined
  if (typeof value !== "string") return DEFAULT_REASON
  const normalized = value.trim().slice(0, 500)
  return normalized || DEFAULT_REASON
}

// DELETE /api/admin/users/[id]/warnings/[warningId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; warningId: string }> }
) {
  const isDev = process.env.NODE_ENV === "development"
  const { authorized, user, error } = await verifyAdminAccess(req)
  if (!authorized) return error!
  if (!user?.uid) {
    return NextResponse.json({ error: "Admin identity missing" }, { status: 403 })
  }
  const rateLimited = await enforceAdminMutationRateLimit(req, user.uid, "delete-warning", 30, 60_000)
  if (rateLimited) return rateLimited

  try {
    const { id: userId, warningId } = await params
    if (!userId || !warningId) {
      return NextResponse.json({ error: "Missing user id or warning id" }, { status: 400 })
    }
    if (!user?.uid || !user?.email) {
      return NextResponse.json({ error: "Admin identity missing" }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const adminReason = getReasonFromBody(body)
    const db = getAdminDb()
    const warningRef = db.collection("userWarnings").doc(warningId)
    const userRef = db.collection("users").doc(userId)
    const adminLogRef = db.collection("adminLogs").doc()

    const result = await db.runTransaction<DeleteWarningResult>(async (tx) => {
      const warningSnap = await tx.get(warningRef)
      if (!warningSnap.exists) return { state: "not_found" }

      const warningData = warningSnap.data() as Record<string, unknown>
      const warningUserId = typeof warningData.userId === "string" ? warningData.userId : ""
      if (warningUserId !== userId) return { state: "mismatch" }

      const warningAction = typeof warningData.action === "string" ? warningData.action : ""
      if (warningAction !== "WARNING") return { state: "invalid_action" }

      let nextWarningCount = 0
      let userStatus = "ACTIVE"

      const userSnap = await tx.get(userRef)
      if (userSnap.exists) {
        const userData = userSnap.data() as Record<string, unknown>
        const currentWarningCount = Number(userData.warningCount) || 0
        nextWarningCount = Math.max(0, currentWarningCount - 1)
        userStatus = typeof userData.status === "string" ? userData.status : "ACTIVE"

        const updates: Record<string, unknown> = {
          warningCount: nextWarningCount,
          updatedAt: FieldValue.serverTimestamp(),
        }
        if (userStatus === "WARNING" && nextWarningCount === 0) {
          userStatus = "ACTIVE"
          updates.status = "ACTIVE"
        }
        tx.update(userRef, updates)
      }

      tx.delete(warningRef)
      tx.set(adminLogRef, {
        actionType: "user_warning",
        adminId: user.uid,
        adminEmail: user.email,
        targetType: "user",
        targetId: userId,
        targetInfo: warningData.userEmail || userId,
        description: `Deleted warning record: ${String(warningData.reason || "")}`,
        status: "success",
        reason: adminReason,
        metadata: {
          warningId,
          removedAction: warningAction,
          removedReason: warningData.reason ?? null,
          warningCountAfter: nextWarningCount,
        },
        createdAt: FieldValue.serverTimestamp(),
      })

      return { state: "ok", warningCount: nextWarningCount, userStatus }
    })

    if (result.state === "not_found") {
      return NextResponse.json({ error: "Warning record not found" }, { status: 404 })
    }
    if (result.state === "mismatch") {
      return NextResponse.json({ error: "Warning does not belong to this user" }, { status: 400 })
    }
    if (result.state === "invalid_action") {
      return NextResponse.json({ error: "Only WARNING entries can be deleted" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      warningCount: result.warningCount,
      userStatus: result.userStatus,
    })
  } catch (err) {
    if (isDev) {
      console.error("[API] Delete Warning Error:", err)
    } else {
      console.error("[API] Delete Warning Error")
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
