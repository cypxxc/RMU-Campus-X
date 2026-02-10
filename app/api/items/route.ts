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
import { itemsCollection, usersCollection } from "@/lib/db/collections"
import { itemSchema, itemStatusSchema } from "@/lib/schemas"
import { generateKeywords, refineItemsBySearchTerms } from "@/lib/db/items-helpers"
import { parseItemFromFirestore } from "@/lib/schemas-firestore"
import { normalizeRatingSummary, type RatingSummary } from "@/lib/rating"
import type { Item } from "@/types"

const createItemSchema = itemSchema.extend({
  imagePublicIds: z.array(z.string().min(1).max(500)).max(5).optional(),
  imageUrls: z.array(z.string().url()).max(5).optional(), // legacy
})

type CreateItemBody = z.infer<typeof createItemSchema>

type PosterProfileSummary = {
  name: string
  rating?: RatingSummary
}

const POSTER_PROFILE_CACHE_TTL_MS = 5 * 60_000
const posterProfileCache = new Map<string, { profile: PosterProfileSummary; at: number }>()
const FAVORITE_STATUS_CACHE_TTL_MS = 60_000
const favoriteStatusCache = new Map<string, { isFavorite: boolean; at: number }>()
/** เมื่อมี search: ดึงจาก index (array-contains-any) แล้ว refine แค่ AND ใน memory — ไม่ scan หนัก */
const SEARCH_CANDIDATE_MULTIPLIER = 2
const SEARCH_TERMS_MAX = 10

function getCachedPosterProfile(uid: string): PosterProfileSummary | null {
  const entry = posterProfileCache.get(uid)
  if (!entry) return null
  if (Date.now() - entry.at > POSTER_PROFILE_CACHE_TTL_MS) {
    posterProfileCache.delete(uid)
    return null
  }
  return entry.profile
}

function setCachedPosterProfile(uid: string, profile: PosterProfileSummary): void {
  posterProfileCache.set(uid, { profile, at: Date.now() })
  if (posterProfileCache.size > 1_000) {
    const oldestKey = posterProfileCache.keys().next().value as string | undefined
    if (oldestKey) posterProfileCache.delete(oldestKey)
  }
}

function getFavoriteCacheKey(userId: string, itemId: string): string {
  return `${userId}_${itemId}`
}

function getCachedFavoriteStatus(userId: string, itemId: string): boolean | null {
  const key = getFavoriteCacheKey(userId, itemId)
  const entry = favoriteStatusCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.at > FAVORITE_STATUS_CACHE_TTL_MS) {
    favoriteStatusCache.delete(key)
    return null
  }
  return entry.isFavorite
}

function setCachedFavoriteStatus(userId: string, itemId: string, isFavorite: boolean): void {
  const key = getFavoriteCacheKey(userId, itemId)
  favoriteStatusCache.set(key, { isFavorite, at: Date.now() })
  if (favoriteStatusCache.size > 10_000) {
    const oldestKey = favoriteStatusCache.keys().next().value as string | undefined
    if (oldestKey) favoriteStatusCache.delete(oldestKey)
  }
}

function fallbackPostedByName(item: Item): string | null {
  return item.postedByName ?? item.postedByEmail?.split("@")[0] ?? item.postedBy ?? null
}

interface TimingMetric {
  name: string
  durMs: number
}

function withServerTiming(response: NextResponse, metrics: TimingMetric[]): NextResponse {
  const header = metrics
    .filter((m) => Number.isFinite(m.durMs) && m.durMs >= 0)
    .map((m) => `${m.name};dur=${Math.round(m.durMs * 10) / 10}`)
    .join(", ")

  if (header) response.headers.set("Server-Timing", header)
  response.headers.set("Timing-Allow-Origin", "*")
  return response
}

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

    const searchKeywords = generateKeywords(data.title, data.description)

    // ดึงชื่อแสดงในโปรไฟล์เพื่อใส่ใน card (โพสต์โดย: ชื่อบัญชี)
    let postedByName: string | null = null
    try {
      const userSnap = await usersCollection().doc(ctx.userId).get()
      const userData = userSnap.data()
      postedByName = (userData?.displayName as string | undefined) ?? (ctx.email ? ctx.email.split("@")[0] : null) ?? null
    } catch {
      postedByName = ctx.email ? ctx.email.split("@")[0] ?? null : null
    }

    const imagePublicIds = data.imagePublicIds?.length ? data.imagePublicIds : null
    const imageUrls = data.imageUrls?.length ? data.imageUrls : null
    const docRef = await itemsCollection().add({
      title: data.title,
      description: data.description,
      category: data.category,
      location: data.location,
      locationDetail: data.locationDetail ?? null,
      imagePublicIds: imagePublicIds ?? null,
      imageUrls: imageUrls ?? null,
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
  pageSize: z.coerce.number().min(1).max(100).default(20),
  lastId: z.string().optional(),
  postedBy: z.string().optional(),
  includeFavoriteStatus: z.coerce.boolean().default(true),
})

/** GET /api/items – list items (filter, search, pagination). ต้องล็อกอิน */
export async function GET(request: NextRequest) {
  const startedAt = Date.now()
  let verifyMs = 0
  let cursorLookupMs = 0
  let listQueryMs = 0
  let filterMs = 0
  let posterProfileMs = 0
  let favoriteMs = 0

  try {
    const db = getAdminDb()
    const authHeader = request.headers.get("Authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, { status: 401 })
    }
    const verifyStartedAt = Date.now()
    const decoded = await verifyIdToken(token, true)
    verifyMs = Date.now() - verifyStartedAt
    if (!decoded) {
      return NextResponse.json({ error: "Invalid or expired token", code: "INVALID_TOKEN" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawPostedBy = searchParams.get("postedBy")?.trim() || undefined
    const parsed = listQuerySchema.safeParse({
      categories: searchParams.get("categories") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? 20,
      lastId: searchParams.get("lastId") ?? undefined,
      postedBy: rawPostedBy,
      includeFavoriteStatus: searchParams.get("includeFavoriteStatus") ?? true,
    })
    const query = parsed.success ? parsed.data : { pageSize: 20, includeFavoriteStatus: true }
    // สำคัญ: ถ้า client ส่ง postedBy มา ต้องใช้เสมอ — อย่าทิ้งเมื่อ parse ล้มเหลว (ไม่งั้นจะได้รายการของทุกคน)
    if (rawPostedBy && !query.postedBy) (query as { postedBy?: string }).postedBy = rawPostedBy

    let baseQuery = itemsCollection().orderBy("postedAt", "desc")

    if (query.postedBy) {
      baseQuery = baseQuery.where("postedBy", "==", query.postedBy)
    }
    if (query.categories && query.categories.length > 0) {
      baseQuery = baseQuery.where("category", "in", query.categories.slice(0, 10))
    }
    if (query.status) {
      baseQuery = baseQuery.where("status", "==", query.status)
    }

    const searchTerms: string[] = []
    if (query.search) {
      searchTerms.push(...query.search.toLowerCase().split(/\s+/).filter((t) => t.length > 0))
    }
    const searchTermsForQuery = searchTerms.slice(0, SEARCH_TERMS_MAX)

    let pagingCursor: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot | null = null
    if (query.lastId) {
      const cursorLookupStartedAt = Date.now()
      const lastSnap = await itemsCollection().doc(query.lastId).get()
      cursorLookupMs = Date.now() - cursorLookupStartedAt
      if (lastSnap.exists) pagingCursor = lastSnap
    }

    let hasMore = false
    let page: Item[] = []

    if (searchTerms.length === 0) {
      // No search: fetch only what we need (+1 for hasMore accuracy).
      let pageQuery = baseQuery.limit(query.pageSize + 1)
      if (pagingCursor) pageQuery = pageQuery.startAfter(pagingCursor)
      const listQueryStartedAt = Date.now()
      const snapshot = await pageQuery.get()
      listQueryMs = Date.now() - listQueryStartedAt
      const items = snapshot.docs
        .map((d) => parseItemFromFirestore(d.id, d.data()))
        .filter((x): x is Item => x !== null)
      hasMore = items.length > query.pageSize
      page = items.slice(0, query.pageSize)
    } else {
      // Search: ใช้ full-text index (array-contains-any) — ดึงเฉพาะ doc ที่ match อย่างน้อย 1 term แล้ว refine AND ใน memory เบาๆ
      let searchQuery = baseQuery.where(
        "searchKeywords",
        "array-contains-any",
        searchTermsForQuery
      )
      const candidateLimit = Math.max(query.pageSize * SEARCH_CANDIDATE_MULTIPLIER, 20)
      let workingCursor = pagingCursor
      const collected: Item[] = []
      let hasNextBatch = true

      const listQueryStartedAt = Date.now()
      while (hasNextBatch) {
        let batchQuery = searchQuery.limit(candidateLimit)
        if (workingCursor) batchQuery = batchQuery.startAfter(workingCursor)

        const batchSnap = await batchQuery.get()
        if (batchSnap.empty) {
          hasNextBatch = false
          break
        }

        hasNextBatch = batchSnap.size === candidateLimit
        workingCursor = batchSnap.docs[batchSnap.docs.length - 1] ?? null

        const batchItems = batchSnap.docs
          .map((d) => parseItemFromFirestore(d.id, d.data()))
          .filter((x): x is Item => x !== null)
        collected.push(...batchItems)

        const filteredSoFar = refineItemsBySearchTerms(collected, searchTerms)
        if (filteredSoFar.length >= query.pageSize) break
      }
      listQueryMs = Date.now() - listQueryStartedAt

      const filterStartedAt = Date.now()
      const filteredItems = refineItemsBySearchTerms(collected, searchTerms)
      filterMs = Date.now() - filterStartedAt
      hasMore = filteredItems.length > query.pageSize || hasNextBatch
      page = filteredItems.slice(0, query.pageSize)
    }

    // แสดงชื่อปัจจุบันจากโปรไฟล์ (ถ้า user เปลี่ยนชื่อแล้ว จะได้ชื่อล่าสุด)
    const postedByIds = [...new Set(page.map((it) => it.postedBy).filter(Boolean))]
    const profileByUid = new Map<string, PosterProfileSummary>()
    const missingProfileUids: string[] = []
    postedByIds.forEach((uid) => {
      const cachedProfile = getCachedPosterProfile(uid)
      if (cachedProfile) {
        profileByUid.set(uid, cachedProfile)
      } else {
        missingProfileUids.push(uid)
      }
    })

    const favoriteItemIds = new Set<string>()
    const shouldCheckFavorites =
      query.includeFavoriteStatus !== false &&
      page.length > 0 &&
      query.postedBy !== decoded.uid
    const posterProfileTask =
      missingProfileUids.length === 0
        ? Promise.resolve()
        : (async () => {
            const posterStartedAt = Date.now()
            const userRefs = missingProfileUids.map((uid) => usersCollection().doc(uid))
            const userSnaps = await db.getAll(...userRefs)
            userSnaps.forEach((snap, i) => {
              const uid = missingProfileUids[i]
              if (!uid) return
              const data = snap.data()
              const name = (data?.displayName as string) || (data?.email as string)?.split("@")[0] || uid
              const rating = normalizeRatingSummary(data?.rating)
              const profile = {
                name,
                ...(rating ? { rating } : {}),
              }
              profileByUid.set(uid, profile)
              setCachedPosterProfile(uid, profile)
            })
            posterProfileMs = Date.now() - posterStartedAt
          })()

    const favoriteTask =
      !shouldCheckFavorites
        ? Promise.resolve()
        : (async () => {
            const favoriteStartedAt = Date.now()
            const uncachedItemIds: string[] = []
            const favoriteRefs: FirebaseFirestore.DocumentReference[] = []

            page.forEach((it) => {
              const cachedFavorite = getCachedFavoriteStatus(decoded.uid, it.id)
              if (cachedFavorite === true) favoriteItemIds.add(it.id)
              if (cachedFavorite === null) {
                uncachedItemIds.push(it.id)
                favoriteRefs.push(db.collection("favorites").doc(`${decoded.uid}_${it.id}`))
              }
            })

            if (favoriteRefs.length > 0) {
              const favoriteSnaps = await db.getAll(...favoriteRefs)
              favoriteSnaps.forEach((snap, idx) => {
                const itemId = uncachedItemIds[idx]
                if (!itemId) return
                const isFavorite = snap.exists
                setCachedFavoriteStatus(decoded.uid, itemId, isFavorite)
                if (isFavorite) favoriteItemIds.add(itemId)
              })
            }
            favoriteMs = Date.now() - favoriteStartedAt
          })()

    await Promise.all([posterProfileTask, favoriteTask])

    const pageWithCurrentPosterInfo = page.map((it) => {
      const profile = profileByUid.get(it.postedBy)
      return {
        ...it,
        postedByName: profile?.name ?? fallbackPostedByName(it),
        postedByRating: profile?.rating,
      }
    })

    const pageWithFavoriteStatus = pageWithCurrentPosterInfo.map((it) => ({
      ...it,
      isFavorite: favoriteItemIds.has(it.id),
    }))

    let totalCount = 0
    if (!query.lastId && page.length < query.pageSize) {
      totalCount = page.length
    }

    const response = NextResponse.json({
      success: true,
      items: pageWithFavoriteStatus,
      lastId: page.length ? page[page.length - 1]?.id ?? null : null,
      hasMore,
      totalCount,
    })
    const totalMs = Date.now() - startedAt
    return withServerTiming(response, [
      { name: "verify", durMs: verifyMs },
      { name: "cursor", durMs: cursorLookupMs },
      { name: "list_query", durMs: listQueryMs },
      { name: "search_filter", durMs: filterMs },
      { name: "poster", durMs: posterProfileMs },
      { name: "favorite", durMs: favoriteMs },
      { name: "total", durMs: totalMs },
    ])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const isDev = process.env.NODE_ENV === "development"
    console.error("[Items API] GET Error:", error)
    const response = NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        ...(isDev && { detail: message, code: error instanceof Error ? (error as { code?: string }).code : undefined }),
      },
      { status: 500 }
    )
    const totalMs = Date.now() - startedAt
    return withServerTiming(response, [
      { name: "verify", durMs: verifyMs },
      { name: "cursor", durMs: cursorLookupMs },
      { name: "list_query", durMs: listQueryMs },
      { name: "search_filter", durMs: filterMs },
      { name: "poster", durMs: posterProfileMs },
      { name: "favorite", durMs: favoriteMs },
      { name: "total", durMs: totalMs },
    ])
  }
}
