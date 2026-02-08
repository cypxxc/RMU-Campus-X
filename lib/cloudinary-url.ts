/**
 * Cloudinary URL utilities
 * ใช้ @cloudinary/url-gen สำหรับ Responsive Resize + f_auto, q_auto
 */

import { Cloudinary } from "@cloudinary/url-gen"
import { Resize } from "@cloudinary/url-gen/actions/resize"

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || ""

const cld = CLOUD_NAME
  ? new Cloudinary({ cloud: { cloudName: CLOUD_NAME }, url: { secure: true } })
  : null

export interface CloudinaryTransformOptions {
  width?: number
  height?: number
  crop?: "fill" | "limit" | "fit" | "thumb" | "scale"
  quality?: "auto" | "auto:good" | "auto:eco" | number
  format?: "webp" | "jpg" | "png"
}

/** Breakpoints สำหรับ responsive srcSet (px) */
const RESPONSIVE_WIDTHS = [400, 800, 1200]

/**
 * Build Cloudinary URL จาก public_id ด้วย @cloudinary/url-gen
 * f_auto, q_auto อัตโนมัติ
 */
export function getCloudinaryUrl(
  publicId: string,
  options?: CloudinaryTransformOptions
): string {
  if (!publicId) return ""
  if (!cld) return buildFallbackUrl(publicId, options)

  const img = cld.image(publicId)
  img.format("auto").quality("auto")
  if (options?.width || options?.height) {
    const resize = Resize.scale()
    if (options.width) resize.width(options.width)
    if (options.height) resize.height(options.height)
    img.resize(resize)
  } else if (options?.crop === "fill" && (options.width || options.height)) {
    const fill = Resize.fill()
    if (options.width) fill.width(options.width)
    if (options.height) fill.height(options.height)
    img.resize(fill)
  }
  return img.toURL()
}

const AUTO_OPTIMIZE = "f_auto,q_auto"

/** Fallback เมื่อไม่มี CLOUD_NAME (manual URL) */
function buildFallbackUrl(publicId: string, options?: CloudinaryTransformOptions): string {
  if (!CLOUD_NAME) return ""
  const transforms: string[] = [AUTO_OPTIMIZE]
  if (options?.width) transforms.push(`w_${options.width}`)
  if (options?.height) transforms.push(`h_${options.height}`)
  if (options?.crop) transforms.push(`c_${options.crop}`)
  const str = transforms.join(",") + "/"
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${str}${publicId}`
}

/**
 * สร้าง srcSet สำหรับ responsive images
 * @returns "url1 400w, url2 800w, url3 1200w"
 */
export function getCloudinarySrcSet(publicId: string): string {
  if (!publicId) return ""
  return RESPONSIVE_WIDTHS.map((w) => `${getCloudinaryUrl(publicId, { width: w })} ${w}w`).join(", ")
}

/**
 * Resolve a single image reference to display URL.
 * Accepts either public_id or legacy full Cloudinary URL.
 * Injects f_auto,q_auto for legacy URLs เพื่อให้ได้ auto-optimization เหมือนกัน
 */
export function resolveImageUrl(ref: string | undefined | null): string {
  if (!ref || typeof ref !== "string") return ""
  // Legacy: full Cloudinary URL - inject f_auto,q_auto ก่อน public_id
  if (ref.startsWith("https://res.cloudinary.com/") || ref.startsWith("http://res.cloudinary.com/")) {
    const match = ref.match(/^((?:https?:)?\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/)
    const prefix = match?.[1]
    if (prefix && !ref.includes("/f_auto,")) {
      return `${prefix}${AUTO_OPTIMIZE}/${ref.slice(prefix.length)}`
    }
    return ref
  }
  // New: public_id
  return getCloudinaryUrl(ref)
}

/**
 * Get all displayable image URLs from an item.
 * Supports imagePublicIds (new) and imageUrls/imageUrl (legacy).
 */
export function getItemImageUrls(item: {
  imagePublicIds?: string[]
  imageUrls?: string[]
  imageUrl?: string
}): string[] {
  if (item.imagePublicIds && item.imagePublicIds.length > 0) {
    return item.imagePublicIds.map(resolveImageUrl).filter(Boolean)
  }
  const urls = item.imageUrls ?? []
  const legacy = item.imageUrl ? [item.imageUrl] : []
  return [...urls, ...legacy].filter(Boolean)
}

/**
 * Get primary (first) image URL for thumbnail/card display
 */
export function getItemPrimaryImageUrl(item: {
  imagePublicIds?: string[]
  imageUrls?: string[]
  imageUrl?: string
}): string {
  const urls = getItemImageUrls(item)
  return urls[0] ?? ""
}

/**
 * Get responsive srcSet สำหรับ primary image (เมื่อเป็น public_id เท่านั้น)
 * @returns srcSet string หรือ undefined ถ้าเป็น legacy URL
 */
export function getItemPrimaryImageSrcSet(item: {
  imagePublicIds?: string[]
  imageUrls?: string[]
  imageUrl?: string
}): string | undefined {
  const publicId = item.imagePublicIds?.[0]
  if (publicId && !publicId.startsWith("http")) return getCloudinarySrcSet(publicId)
  return undefined
}

/** Extract Cloudinary public_id from a Cloudinary URL (for migration/legacy) */
const CLOUDINARY_PUBLIC_ID_REGEX = /(rmu-exchange\/[^/]+\/[^/.]+)/

export function extractPublicIdFromUrl(url: string): string | null {
  if (!url || !url.includes("cloudinary")) return null
  const m = url.match(CLOUDINARY_PUBLIC_ID_REGEX)
  return m?.[1] ?? null
}
