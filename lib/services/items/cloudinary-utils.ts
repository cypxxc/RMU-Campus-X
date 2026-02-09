const CLOUDINARY_ITEM_REGEX = /(rmu-exchange\/[^/]+\/[^/.?]+)/
const CLOUDINARY_PUBLIC_ID_REGEX = /^rmu-exchange\/[a-zA-Z0-9/_-]+$/

export function extractCloudinaryPublicId(imageRef: unknown): string | null {
  if (typeof imageRef !== "string") return null
  const ref = imageRef.trim()
  if (!ref) return null
  if (CLOUDINARY_PUBLIC_ID_REGEX.test(ref)) return ref
  if (!ref.includes("cloudinary")) return null
  const matches = ref.match(CLOUDINARY_ITEM_REGEX)
  return matches?.[1] ?? null
}

export function extractItemImagePublicIds(itemData: Record<string, unknown>): string[] {
  const imagePublicIds = Array.isArray(itemData.imagePublicIds) ? itemData.imagePublicIds : []
  if (imagePublicIds.length > 0) {
    return imagePublicIds.filter((id): id is string => typeof id === "string")
  }
  const imageUrls = Array.isArray(itemData.imageUrls) ? itemData.imageUrls : []
  const legacyUrl = typeof itemData.imageUrl === "string" ? itemData.imageUrl : null
  const urls = [...imageUrls, ...(legacyUrl ? [legacyUrl] : [])]
  const publicIds: string[] = []
  for (const url of urls) {
    const publicId = extractCloudinaryPublicId(url)
    if (publicId) publicIds.push(publicId)
  }
  return publicIds
}
