/**
 * Item Delete API
 * Handles secure deletion of items including Cloudinary image cleanup.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"
import { deleteItemAsOwner } from "@/lib/services/items/item-deletion"
import { createFirebaseAdminItemDeps } from "@/lib/services/items/firebase-admin-deps"
import { isItemDeletionError } from "@/lib/services/items/errors"

export const runtime = 'nodejs'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params
    
    // 1. Verify Auth
    const token = extractBearerToken(request.headers.get("Authorization"))
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    
    const decodedToken = await verifyIdToken(token) 
    if (!decodedToken) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const userId = decodedToken.uid
    const deps = createFirebaseAdminItemDeps()

    try {
      await deleteItemAsOwner({ itemId, requesterId: userId }, deps)
    } catch (error) {
      if (isItemDeletionError(error)) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    return NextResponse.json({ success: true, message: "Item deleted successfully" })

  } catch (error: any) {
    console.error("[ItemDelete] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
