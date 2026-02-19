
import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { enforceAdminMutationRateLimit, verifyAdminAccess } from "@/lib/admin-api"
import { FieldValue } from "firebase-admin/firestore"
import { collectUserResources, executeCleanup, deleteUserAuth, recalculateUserRating } from "@/lib/services/admin/user-cleanup"

export const runtime = 'nodejs'

function maskEmail(email: unknown): string | null {
  if (typeof email !== "string" || !email.includes("@")) return null
  const [localPart, domain] = email.split("@")
  if (!localPart || !domain) return null
  return `${localPart.slice(0, 2)}***@${domain}`
}

function buildSafeUserSnapshot(raw: unknown) {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  return {
    email: maskEmail(data.email),
    displayName: typeof data.displayName === "string" ? data.displayName.slice(0, 120) : null,
    status: typeof data.status === "string" ? data.status : null,
    warningCount: Number.isFinite(Number(data.warningCount)) ? Number(data.warningCount) : 0,
    isAdmin: data.isAdmin === true,
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params
  
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  try {
    // 1. Verify Admin Authentication
    const { authorized, user, error } = await verifyAdminAccess(request)
    if (!authorized) return error!
    if (!user?.uid || !user?.email) {
      return NextResponse.json({ error: "Forbidden: Admin identity missing" }, { status: 403 })
    }
    const rateLimited = await enforceAdminMutationRateLimit(
      request,
      user.uid,
      "hard-delete-user",
      5,
      10 * 60_000
    )
    if (rateLimited) return rateLimited

    const db = getAdminDb()
    const isDev = process.env.NODE_ENV === "development"

    if (isDev) {
      console.log("[HardDelete] Starting deletion")
    }

    // 2. Collection Phase
    const { refsToDelete, cloudinaryPublicIds, userDoc, ratingRecalcUserIds } = await collectUserResources(userId)

    if (isDev) {
      console.log(`[HardDelete] Collected ${refsToDelete.length} docs and ${cloudinaryPublicIds.length} images`)
    }

    // 3. Execution Phase
    await executeCleanup(refsToDelete, cloudinaryPublicIds)
    await deleteUserAuth(userId)

    // 4. Recalculate rating for users who had received reviews from the deleted user
    const recalcIds = [...new Set(ratingRecalcUserIds)]
    for (const uid of recalcIds) {
      try {
        await recalculateUserRating(uid)
      } catch (e) {
        console.error(`[HardDelete] Recalc rating for ${uid} failed:`, e)
      }
    }
    
    // 5. Log Deletion to Admin Logs (System)
    try {
        const logEntry = {
            actionType: "hard_delete_user",
            adminId: user.uid,
            adminEmail: user.email || 'unknown',
            targetType: "user",
            targetId: userId,
            targetInfo: userDoc.exists ? maskEmail((userDoc.data() as Record<string, unknown>)?.email) ?? userId : userId,
            description: "Hard delete of user and all associated data",
            status: 'success',
            reason: 'Admin requested hard delete',
            beforeState: userDoc.exists ? buildSafeUserSnapshot(userDoc.data()) : { note: "User not found in DB" },
            afterState: null, // Deleted
            metadata: { 
                deletedDocsCount: refsToDelete.length, 
                deletedImagesCount: cloudinaryPublicIds.length 
            },
            createdAt: FieldValue.serverTimestamp()
        }
        
        await db.collection("adminLogs").add(logEntry)

    } catch (logError) {
        console.error("[HardDelete] Failed to create audit log:", logError)
    }

    return NextResponse.json({ success: true, deletedDocs: refsToDelete.length, deletedImages: cloudinaryPublicIds.length })

  } catch (error) {
    console.error("[HardDelete] Fatal Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
