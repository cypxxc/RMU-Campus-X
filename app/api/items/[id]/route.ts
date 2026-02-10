/**
 * Item API – GET (one), PATCH (update), DELETE
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyIdToken, extractBearerToken } from "@/lib/firebase-admin"
import { itemsCollection, usersCollection } from "@/lib/db/collections"
import { deleteItemAsOwner } from "@/lib/services/items/item-deletion"
import { createFirebaseAdminItemDeps, createItemUpdateAdminDeps } from "@/lib/services/items/firebase-admin-deps"
import { isItemDeletionError } from "@/lib/services/items/errors"
import { updateItemWithValidation, ItemUpdateError } from "@/lib/services/items/item-update"
import { itemUpdateSchema } from "@/lib/schemas"
import { parseItemFromFirestore } from "@/lib/schemas-firestore"
import { normalizeRatingSummary } from "@/lib/rating"
import type { Item } from "@/types"

export const runtime = "nodejs"

function getToken(req: NextRequest) {
  return extractBearerToken(req.headers.get("Authorization"))
}

async function requireAuth(req: NextRequest) {
  const token = getToken(req)
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const decoded = await verifyIdToken(token, true)
  if (!decoded) return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) }
  return { userId: decoded.uid }
}

function fallbackPostedByName(item: Item): string {
  return item.postedByName ?? item.postedByEmail?.split("@")[0] ?? item.postedBy
}

/** GET /api/items/[id] – ดึงรายการเดียว */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if ("error" in auth) return auth.error

    const { id: itemId } = await params
    if (!itemId) return NextResponse.json({ error: "Missing item ID" }, { status: 400 })

    const snap = await itemsCollection().doc(itemId).get()
    if (!snap.exists) {
      return NextResponse.json({ success: true, item: null })
    }

    const item = parseItemFromFirestore(snap.id, snap.data())
    if (!item) {
      return NextResponse.json({ success: true, item: null })
    }

    let postedByName = fallbackPostedByName(item)
    let postedByRating = item.postedByRating
    try {
      const posterSnap = await usersCollection().doc(item.postedBy).get()
      if (posterSnap.exists) {
        const posterData = posterSnap.data()
        postedByName =
          (posterData?.displayName as string | undefined) ||
          (posterData?.email as string | undefined)?.split("@")[0] ||
          postedByName
        postedByRating = normalizeRatingSummary(posterData?.rating)
      }
    } catch {
      // Keep fallback owner fields if profile lookup fails.
    }

    return NextResponse.json({
      success: true,
      item: {
        ...item,
        postedByName,
        postedByRating,
      },
    })
  } catch (e) {
    console.error("[Items API] GET Error:", e)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/** PATCH /api/items/[id] – แก้ไข (เจ้าของเท่านั้น) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if ("error" in auth) return auth.error

    const { id: itemId } = await params
    if (!itemId) return NextResponse.json({ error: "Missing item ID" }, { status: 400 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const parsed = itemUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const deps = createItemUpdateAdminDeps()
    await updateItemWithValidation(
      { itemId, requesterId: auth.userId, data: parsed.data },
      deps
    )
    return NextResponse.json({ success: true, message: "Item updated" })
  } catch (error) {
    if (error instanceof ItemUpdateError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error("[Items API] PATCH Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/** DELETE /api/items/[id] */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if ("error" in auth) return auth.error

    const { id: itemId } = await params
    if (!itemId) return NextResponse.json({ error: "Missing item ID" }, { status: 400 })

    const deps = createFirebaseAdminItemDeps()
    try {
      await deleteItemAsOwner({ itemId, requesterId: auth.userId }, deps)
    } catch (error) {
      if (isItemDeletionError(error)) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }
    return NextResponse.json({ success: true, message: "Item deleted successfully" })
  } catch (e) {
    console.error("[ItemDelete] Error:", e)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
