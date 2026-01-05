/**
 * Item Categories
 * Categories available for items in the exchange platform
 */
export const ITEM_CATEGORIES = {
  ELECTRONICS: "อิเล็กทรอนิกส์",
  BOOKS: "หนังสือ",
  FURNITURE: "เฟอร์นิเจอร์",
  CLOTHING: "เสื้อผ้า",
  SPORTS: "กีฬา",
  OTHER: "อื่นๆ",
} as const

export type ItemCategory = keyof typeof ITEM_CATEGORIES

/**
 * Array of all item categories for iteration
 */
export const ITEM_CATEGORY_OPTIONS = Object.entries(ITEM_CATEGORIES).map(([key, label]) => ({
  value: key.toLowerCase(),
  label,
}))
