/**
 * Item Delete API
 * Handles secure deletion of items including Cloudinary image cleanup.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminDb, verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"
import { cloudinary } from "@/lib/cloudinary"

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

    const db = getAdminDb()
    const itemRef = db.collection("items").doc(itemId)
    const itemDoc = await itemRef.get()
    
    if (!itemDoc.exists) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }
    
    const itemData = itemDoc.data()
    const userId = decodedToken.uid

    // 2. Verify Ownership
    if (itemData?.postedBy !== userId) {
        // Admin override could be added here if we merge logic, but this is user-facing.
        return NextResponse.json({ error: "Forbidden: You do not own this item" }, { status: 403 })
    }

    // 3. Status Guard (Double Check)
    if (['pending'].includes(itemData?.status)) {
        return NextResponse.json({ error: "Cannot delete item with active exchange" }, { status: 409 })
    }
    
    // Also check for active exchanges in 'exchanges' collection just in case item status is desynced
    const exchangesQuery = db.collection('exchanges')
        .where('itemId', '==', itemId)
        .where('status', 'in', ['pending', 'accepted', 'in_progress'])
        .limit(1)
    
    const activeExchanges = await exchangesQuery.get()
    if (!activeExchanges.empty) {
        return NextResponse.json({ error: "Cannot delete item with active exchange" }, { status: 409 })
    }

    // 4. Cloudinary Cleanup
    const imageUrls = itemData?.imageUrls || []
    if (itemData?.imageUrl) imageUrls.push(itemData.imageUrl) // Legacy support
    
    const publicIds: string[] = []
    
    imageUrls.forEach((url: string) => {
        if (url.includes("cloudinary")) {
            const matches = url.match(/\/rmu-exchange\/items\/([^/.]+)/)
            if (matches?.[1]) publicIds.push(`rmu-exchange/items/${matches[1]}`)
        }
    })
    
    if (publicIds.length > 0) {
        try {
            await cloudinary.api.delete_resources(publicIds, { type: 'upload', resource_type: 'image' })
        } catch (e) {
            console.error("[ItemDelete] Cloudinary cleanup failed:", e)
        }
    }

    // 5. Delete Firestore Doc
    await itemRef.delete()

    return NextResponse.json({ success: true, message: "Item deleted successfully" })

  } catch (error: any) {
    console.error("[ItemDelete] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
