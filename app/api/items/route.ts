/**
 * Items API – สร้างและ list รายการสิ่งของ
 * POST: สร้าง item (auth, termsAccepted, canUserPost)
 * GET: list items พร้อม filter/pagination
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withValidation, type ValidationContext } from "@/lib/api-validation"
import { getAdminDb, canUserPost, verifyIdToken } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { itemSchema, itemStatusSchema } from "@/lib/schemas"
import { generateKeywords, refineItemsBySearchTerms } from "@/lib/db/items-helpers"
import type { Item } from "@/types"

const createItemSchema = itemSchema.extend({
  imageUrls: z.array(z.string().url()).max(5).optional(),
})

type CreateItemBody = z.infer<typeof createItemSchema>

/** POST /api/items – สร้าง item */
export const POST = withValidation(
  createItemSchema,
  async (_req, data: CreateItemBody, ctx: ValidationContext | null) => {
    if (!ctx) {
      return NextResponse.json({ error: "Authentication required", code: "AUTH_ERROR" }, { status: 401 })
    }

    const allowed = await canUserPost(ctx.userId)
    if (!allowed) {
      return NextResponse.json(
        { error: "บัญชีของคุณถูกจำกัดสิทธิ์การโพสต์ของ", code: "RESTRICTED" },
        { status: 403 }
      )
    }

    const db = getAdminDb()
    const searchKeywords = generateKeywords(data.title, data.description)

    // ดึงชื่อแสดงในโปรไฟล์เพื่อใส่ใน card (โพสต์โดย: ชื่อบัญชี)
    let postedByName: string | null = null
    try {
      const userSnap = await db.collection("users").doc(ctx.userId).get()
      const userData = userSnap.data()
      postedByName = (userData?.displayName as string | undefined) ?? (ctx.email ? ctx.email.split("@")[0] : null) ?? null
    } catch {
      postedByName = ctx.email ? ctx.email.split("@")[0] ?? null : null
    }

    const docRef = await db.collection("items").add({
      title: data.title,
      description: data.description,
      category: data.category,
      location: data.location,
      locationDetail: data.locationDetail ?? null,
      imageUrls: data.imageUrls ?? null,
      status: "available",
      postedBy: ctx.userId,
      postedByEmail: ctx.email ?? "",
      postedByName,
      postedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      searchKeywords,
    })

    return NextResponse.json({ success: true, data: { id: docRef.id } }, { status: 201 })
  },
  { requireAuth: true, requireTermsAccepted: true }
)

const listQuerySchema = z.object({
  categories: z.string().optional().transform((s) => (s ? s.split(",").filter(Boolean) : undefined)),
  status: itemStatusSchema.optional(),
  search: z.string().optional(),
  pageSize: z.coerce.number().min(1).max(50).default(20),
  lastId: z.string().optional(),
  postedBy: z.string().optional(),
})

/** GET /api/items – list items (filter, search, pagination). ต้องล็อกอิน */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, { status: 401 })
    }
    const decoded = await verifyIdToken(token, true)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid or expired token", code: "INVALID_TOKEN" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = listQuerySchema.safeParse({
      categories: searchParams.get("categories") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? 20,
      lastId: searchParams.get("lastId") ?? undefined,
      postedBy: searchParams.get("postedBy") ?? undefined,
    })
    const query = parsed.success ? parsed.data : { pageSize: 20 }

    const db = getAdminDb()
    let q = db.collection("items").orderBy("postedAt", "desc").limit(Math.min(query.pageSize * (query.search ? 3 : 1), 100))

    if (query.postedBy) {
      q = q.where("postedBy", "==", query.postedBy)
    }
    if (query.categories && query.categories.length > 0) {
      q = q.where("category", "in", query.categories.slice(0, 10))
    }
    if (query.status) {
      q = q.where("status", "==", query.status)
    }

    const searchTerms: string[] = []
    if (query.search) {
      searchTerms.push(...query.search.toLowerCase().split(/\s+/).filter((t) => t.length > 0))
    }

    if (query.lastId) {
      const lastSnap = await db.collection("items").doc(query.lastId).get()
      if (lastSnap.exists) {
        q = q.startAfter(lastSnap)
      }
    }

    const snapshot = await q.get()
    let items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Item))

    if (searchTerms.length > 0) {
      items = refineItemsBySearchTerms(items, searchTerms)
    }

    const hasMore = items.length >= query.pageSize
    const page = items.slice(0, query.pageSize)

    // แสดงชื่อปัจจุบันจากโปรไฟล์ (ถ้า user เปลี่ยนชื่อแล้ว จะได้ชื่อล่าสุด)
    const postedByIds = [...new Set(page.map((it: Item) => it.postedBy).filter(Boolean))]
    const nameByUid = new Map<string, string>()
    if (postedByIds.length > 0) {
      const userRefs = postedByIds.map((uid) => db.collection("users").doc(uid))
      const userSnaps = await db.getAll(...userRefs)
      userSnaps.forEach((snap, i) => {
        const uid = postedByIds[i]
        if (!uid) return
        const data = snap.data()
        const name = (data?.displayName as string) || (data?.email as string)?.split("@")[0] || uid
        nameByUid.set(uid, name)
      })
    }
    const pageWithCurrentNames = page.map((it: Item) => ({
      ...it,
      postedByName: nameByUid.get(it.postedBy) ?? it.postedByName ?? it.postedByEmail?.split("@")[0] ?? null,
    }))

    let totalCount = 0
    if (!query.lastId && page.length < query.pageSize) {
      totalCount = page.length
    }

    return NextResponse.json({
      success: true,
      items: pageWithCurrentNames,
      lastId: page.length ? page[page.length - 1]?.id ?? null : null,
      hasMore,
      totalCount,
    })
  } catch (error) {
    console.error("[Items API] GET Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
