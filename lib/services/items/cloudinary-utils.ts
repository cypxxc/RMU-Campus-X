const CLOUDINARY_ITEM_REGEX = /\/rmu-exchange\/items\/([^/.]+)/

export function extractItemImagePublicIds(itemData: Record<string, unknown>): string[] {
  const imageUrls = Array.isArray(itemData.imageUrls) ? itemData.imageUrls : []
  const legacyUrl = typeof itemData.imageUrl === "string" ? itemData.imageUrl : null
  const urls = [
    ...imageUrls,
    ...(legacyUrl ? [legacyUrl] : []),
  ]

  const publicIds: string[] = []

  for (const url of urls) {
    if (typeof url !== "string" || !url.includes("cloudinary")) continue
    const matches = url.match(CLOUDINARY_ITEM_REGEX)
    if (matches?.[1]) {
      publicIds.push(`rmu-exchange/items/${matches[1]}`)
    }
  }

  return publicIds
}
