
import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, verifyIdTokenDebug, extractBearerToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { collectUserResources, executeCleanup, deleteUserAuth } from "@/lib/services/admin/user-cleanup"

export const runtime = 'nodejs'

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
    const token = extractBearerToken(request.headers.get("Authorization"))
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // DEBUG: Use debug version to see error
    const decodedToken = await verifyIdTokenDebug(token)
    if (!decodedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const db = getAdminDb()

    // Check if requester is actually an admin
    const adminDoc = await db.collection("admins").doc(decodedToken.uid).get()
    if (!adminDoc.exists) {
       return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    console.log(`[HardDelete] Starting deletion for user: ${userId}`)

    // 2. Collection Phase
    const { refsToDelete, cloudinaryPublicIds, userDoc } = await collectUserResources(userId)

    console.log(`[HardDelete] Found ${refsToDelete.length} docs and ${cloudinaryPublicIds.length} images`)

    // 3. Execution Phase
    await executeCleanup(refsToDelete, cloudinaryPublicIds)
    await deleteUserAuth(userId)
    
    // 4. Log Deletion to Admin Logs (System)
    try {
        const logEntry = {
            actionType: "hard_delete_user",
            adminId: decodedToken.uid,
            adminEmail: decodedToken.email || 'unknown',
            targetType: "user",
            targetId: userId,
            targetInfo: (userDoc.exists ? (userDoc.data() as any).email : userId),
            description: "Hard delete of user and all associated data",
            status: 'success',
            reason: 'Admin requested hard delete',
            beforeState: userDoc.exists ? userDoc.data() : { note: 'User not found in DB' },
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

  } catch (error: any) {
    console.error("[HardDelete] Fatal Error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
