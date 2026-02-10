import type { Item } from "@/types"

export type RatingSummary = NonNullable<Item["postedByRating"]>

/**
 * Normalize unknown rating payload (from Firestore/user docs) to a safe summary.
 */
export function normalizeRatingSummary(value: unknown): RatingSummary | undefined {
  if (!value || typeof value !== "object") return undefined

  const averageRaw = (value as { average?: unknown }).average
  const countRaw = (value as { count?: unknown }).count

  const average = Number(averageRaw)
  const count = Number(countRaw)

  if (!Number.isFinite(average) || !Number.isFinite(count)) return undefined

  const safeAverage = Math.min(5, Math.max(0, Number(average.toFixed(1))))
  const safeCount = Math.max(0, Math.trunc(count))

  return {
    average: safeAverage,
    count: safeCount,
  }
}
