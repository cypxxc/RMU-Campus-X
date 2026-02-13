/**
 * Zod schemas สำหรับตรวจสอบข้อมูลที่ได้จาก Firestore ก่อนนำไปแสดงหรือส่งให้ client
 * ป้องกันข้อมูล "เน่า" หรือโครงสร้างผิดปกติจาก Firebase
 */

import { z } from "zod"
import { itemCategorySchema, itemStatusSchema } from "./schemas"
import type { Item, ItemCategory, ItemStatus } from "@/types"

function toValidDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === "number" || typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  if (value && typeof value === "object") {
    const maybeTimestamp = value as { toDate?: () => Date; _seconds?: unknown; _nanoseconds?: unknown }

    if (typeof maybeTimestamp.toDate === "function") {
      try {
        const parsed = maybeTimestamp.toDate()
        if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) return parsed
      } catch {
        // Ignore malformed Timestamp-like objects and continue fallback checks.
      }
    }

    if (typeof maybeTimestamp._seconds === "number" && Number.isFinite(maybeTimestamp._seconds)) {
      const nanos = typeof maybeTimestamp._nanoseconds === "number" && Number.isFinite(maybeTimestamp._nanoseconds)
        ? maybeTimestamp._nanoseconds
        : 0
      const parsed = new Date(maybeTimestamp._seconds * 1000 + nanos / 1e6)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
  }

  return null
}

/** รับค่าได้ทั้ง Firestore Timestamp, Date, หรือ ms/string datetime */
const firestoreTimestampSchema = z.preprocess(
  (value) => toValidDate(value) ?? value,
  z.date()
)

/**
 * Validate ข้อมูล item document จาก Firestore ก่อนส่งให้ client
 * คืนค่า null ถ้าข้อมูลไม่ผ่าน (จะได้ไม่ "เน่า" ไปแสดง)
 */
export const itemFromFirestoreSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  category: itemCategorySchema,
  status: itemStatusSchema,
  location: z.string().max(200).optional().nullable(),
  locationDetail: z.string().max(300).optional().nullable(),
  imagePublicIds: z.array(z.string().min(1).max(500)).max(5).optional().nullable(),
  imageUrls: z.array(z.string()).max(5).optional().nullable(),
  imageUrl: z.string().optional(),
  postedBy: z.string().min(1),
  postedByEmail: z.string(),
  postedByName: z.string().max(100).optional().nullable(),
  postedAt: firestoreTimestampSchema,
  updatedAt: firestoreTimestampSchema,
  searchKeywords: z.array(z.string()).optional(),
})

export type ItemFromFirestore = z.infer<typeof itemFromFirestoreSchema>

/**
 * แปลง raw document + id เป็น Item ที่ผ่าน validation
 * คืน null ถ้า data ไม่ผ่าน schema (ไม่ throw)
 * ใช้ค่า postedAt/updatedAt จาก data เดิมเพื่อคง Firestore Timestamp ตอนส่ง JSON
 */
export function parseItemFromFirestore(id: string, data: unknown): Item | null {
  try {
    const raw = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {}
    const withId = { id, ...raw }
    const result = itemFromFirestoreSchema.safeParse(withId)

    if (result.success) {
      const parsed = result.data
      return {
        id: parsed.id,
        title: parsed.title,
        description: parsed.description,
        category: parsed.category as ItemCategory,
        status: parsed.status as ItemStatus,
        location: parsed.location ?? undefined,
        locationDetail: parsed.locationDetail ?? undefined,
        imagePublicIds: parsed.imagePublicIds ?? undefined,
        imageUrls: parsed.imageUrls ?? undefined,
        imageUrl: parsed.imageUrl,
        postedBy: parsed.postedBy,
        postedByEmail: parsed.postedByEmail,
        postedByName: parsed.postedByName ?? undefined,
        postedAt: (raw.postedAt ?? parsed.postedAt) as Item["postedAt"],
        updatedAt: (raw.updatedAt ?? parsed.updatedAt) as Item["updatedAt"],
        searchKeywords: parsed.searchKeywords,
      }
    }

    // Fallback: lenient parsing for legacy / manually created documents
    const fallbackTitle = typeof raw.title === "string" ? raw.title : ""
    if (!fallbackTitle.trim()) return null

    const fallbackDescription = typeof raw.description === "string" ? raw.description : ""
    const fallbackCategory =
      (typeof raw.category === "string" ? (raw.category as ItemCategory) : "other")
    const fallbackStatus =
      (typeof raw.status === "string" ? (raw.status as ItemStatus) : "available")

    const fallbackPostedAt =
      ((raw.postedAt as Item["postedAt"] | undefined) ?? new Date()) as Item["postedAt"]
    const fallbackUpdatedAt =
      (raw.updatedAt as Item["updatedAt"] | undefined) ?? fallbackPostedAt

    return {
      id,
      title: fallbackTitle,
      description: fallbackDescription,
      category: fallbackCategory,
      status: fallbackStatus,
      location: typeof raw.location === "string" ? raw.location : undefined,
      locationDetail: typeof raw.locationDetail === "string" ? raw.locationDetail : undefined,
      imagePublicIds: Array.isArray(raw.imagePublicIds) ? (raw.imagePublicIds as string[]) : undefined,
      imageUrls: Array.isArray(raw.imageUrls) ? (raw.imageUrls as string[]) : undefined,
      imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
      postedBy: (typeof raw.postedBy === "string" && raw.postedBy) ? raw.postedBy : "unknown",
      postedByEmail: typeof raw.postedByEmail === "string" ? raw.postedByEmail : "",
      postedByName: typeof raw.postedByName === "string" ? raw.postedByName : undefined,
      postedAt: fallbackPostedAt,
      updatedAt: fallbackUpdatedAt,
      searchKeywords: Array.isArray(raw.searchKeywords) ? (raw.searchKeywords as string[]) : undefined,
    }
  } catch {
    return null
  }
}
