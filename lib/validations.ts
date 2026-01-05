import { z } from "zod"

// ===== Item Validation =====
export const itemSchema = z.object({
  title: z
    .string()
    .min(3, "ชื่อสิ่งของต้องมีอย่างน้อย 3 ตัวอักษร")
    .max(100, "ชื่อสิ่งของต้องไม่เกิน 100 ตัวอักษร")
    .trim(),
  description: z
    .string()
    .min(10, "คำอธิบายต้องมีอย่างน้อย 10 ตัวอักษร")
    .max(1000, "คำอธิบายต้องไม่เกิน 1000 ตัวอักษร")
    .trim(),
  category: z.enum(
    ["electronics", "books", "furniture", "clothing", "sports", "other"],
    { errorMap: () => ({ message: "กรุณาเลือกหมวดหมู่" }) }
  ),
  location: z
    .string()
    .min(2, "กรุณาระบุสถานที่")
    .max(100, "สถานที่ต้องไม่เกิน 100 ตัวอักษร")
    .optional(),
  detailedLocation: z.string().max(200).optional(),
})

export type ItemFormData = z.infer<typeof itemSchema>

// ===== Report Validation =====
export const reportSchema = z.object({
  reason: z
    .string()
    .min(10, "กรุณาอธิบายเหตุผลอย่างน้อย 10 ตัวอักษร")
    .max(500, "เหตุผลต้องไม่เกิน 500 ตัวอักษร"),
  type: z.enum(["item", "exchange", "chat", "user"], {
    errorMap: () => ({ message: "กรุณาเลือกประเภทการรายงาน" }),
  }),
})

export type ReportFormData = z.infer<typeof reportSchema>

// ===== Support Ticket Validation =====
export const supportTicketSchema = z.object({
  subject: z
    .string()
    .min(5, "หัวข้อต้องมีอย่างน้อย 5 ตัวอักษร")
    .max(100, "หัวข้อต้องไม่เกิน 100 ตัวอักษร"),
  message: z
    .string()
    .min(20, "รายละเอียดต้องมีอย่างน้อย 20 ตัวอักษร")
    .max(2000, "รายละเอียดต้องไม่เกิน 2000 ตัวอักษร"),
  category: z.enum(["general", "bug", "feature", "account", "other"]),
})

export type SupportTicketFormData = z.infer<typeof supportTicketSchema>

// ===== Chat Message Validation =====
export const chatMessageSchema = z.object({
  content: z
    .string()
    .min(1, "กรุณาพิมพ์ข้อความ")
    .max(1000, "ข้อความต้องไม่เกิน 1000 ตัวอักษร")
    .trim(),
})

export type ChatMessageFormData = z.infer<typeof chatMessageSchema>

// ===== File Upload Validation =====
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // ตรวจสอบ file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WebP, GIF)",
    }
  }

  // ตรวจสอบขนาดไฟล์
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "ขนาดไฟล์ต้องไม่เกิน 5MB",
    }
  }

  return { valid: true }
}

// ===== Email Validation =====
export const emailSchema = z
  .string()
  .email("รูปแบบอีเมลไม่ถูกต้อง")
  .refine(
    (email) => email.endsWith("@rmu.ac.th"),
    "ต้องใช้อีเมล @rmu.ac.th เท่านั้น"
  )

// ===== Password Validation =====
export const passwordSchema = z
  .string()
  .min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
  .max(50, "รหัสผ่านต้องไม่เกิน 50 ตัวอักษร")

// ===== User Profile Validation =====
export const userProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร")
    .max(50, "ชื่อต้องไม่เกิน 50 ตัวอักษร")
    .optional(),
})

export type UserProfileFormData = z.infer<typeof userProfileSchema>

// ===== Sanitize Input =====
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // ลบ HTML tags
    .slice(0, 10000) // จำกัดความยาว
}
