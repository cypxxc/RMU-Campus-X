import { z } from "zod"
import { sanitizeText } from "./security"

// ============ User Schemas ============

// User Profile Schema
export const userProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร")
    .max(50, "ชื่อต้องมีความยาวไม่เกิน 50 ตัวอักษร")
    .transform(sanitizeText),
  bio: z
    .string()
    .max(300, "คำแนะนำตัวต้องมีความยาวไม่เกิน 300 ตัวอักษร")
    .optional()
    .transform(val => val ? sanitizeText(val) : val),
  photoURL: z
    .string()
    .max(2000)
    .optional()
    .refine((val) => val === undefined || val === "" || /^https?:\/\//.test(val ?? ""), "รูปโปรไฟล์ต้องเป็น URL ที่ถูกต้อง"),
  phoneNumber: z
    .string()
    .regex(/^0[0-9]{9}$/, "เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็นตัวเลข 10 หลัก เริ่มต้นด้วย 0)")
    .optional()
    .or(z.literal("")),
})

// Registration Schema
export const registrationSchema = z.object({
  email: z
    .string()
    .email("รูปแบบอีเมลไม่ถูกต้อง")
    .regex(/^[a-zA-Z0-9._+-]{1,64}@rmu\.ac\.th$/i, "ต้องเป็นอีเมล @rmu.ac.th (นักศึกษาหรือบุคลากร ม.ราชภัฏมหาสารคาม)"),
  password: z
    .string()
    .min(6, "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร")
    .max(100, "รหัสผ่านยาวเกินไป"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "รหัสผ่านไม่ตรงกัน",
  path: ["confirmPassword"],
})

// ============ Item Schemas ============

export const itemCategorySchema = z.enum([
  "electronics",
  "books",
  "furniture",
  "clothing",
  "sports",
  "other",
])

export const itemStatusSchema = z.enum(["available", "pending", "completed"])

export const itemSchema = z.object({
  title: z
    .string()
    .min(3, "ชื่อสิ่งของต้องมีความยาวอย่างน้อย 3 ตัวอักษร")
    .max(100, "ชื่อสิ่งของต้องมีความยาวไม่เกิน 100 ตัวอักษร")
    .transform(sanitizeText),
  description: z
    .string()
    .min(10, "คำอธิบายต้องมีความยาวอย่างน้อย 10 ตัวอักษร")
    .max(1000, "คำอธิบายต้องมีความยาวไม่เกิน 1000 ตัวอักษร")
    .transform(sanitizeText),
  category: itemCategorySchema,
  location: z.string().min(1, "กรุณาระบุสถานที่นัดรับ (เช่น ตึกคณะ, โรงอาหาร)").transform(sanitizeText),
  locationDetail: z.string().max(200, "รายละเอียดสถานที่ต้องไม่เกิน 200 ตัวอักษร").optional().transform(val => val ? sanitizeText(val) : val),
})

export const itemUpdateSchema = itemSchema.partial().extend({
  imageUrls: z.array(z.string().url()).max(5).optional(),
})

// ============ Exchange Schemas ============

export const exchangeStatusSchema = z.enum([
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
  "rejected",
])

export const createExchangeSchema = z.object({
  itemId: z.string().min(1, "กรุณาระบุรหัสสิ่งของ"),
})

export const respondExchangeSchema = z.object({
  exchangeId: z.string().min(1, "กรุณาระบุรหัสการแลกเปลี่ยน"),
  action: z.enum(["accept", "reject"]),
  reason: z.string().max(500).optional().transform(val => val ? sanitizeText(val) : val),
})

export const cancelExchangeSchema = z.object({
  exchangeId: z.string().min(1, "กรุณาระบุรหัสการแลกเปลี่ยน"),
  reason: z.string().min(1, "กรุณาระบุเหตุผลการยกเลิก").max(500, "เหตุผลต้องไม่เกิน 500 ตัวอักษร").transform(val => sanitizeText(val)),
})

export const confirmExchangeSchema = z.object({
  exchangeId: z.string().min(1, "กรุณาระบุรหัสการแลกเปลี่ยน"),
  role: z.enum(["owner", "requester"]),
})

// ============ Report Schemas ============

export const reportTypeSchema = z.enum([
  "item_report",
  "exchange_report",
  "user_report",
])

export const createReportSchema = z.object({
  reportType: reportTypeSchema,
  targetId: z.string().min(1, "กรุณาระบุเป้าหมายที่ต้องการรายงาน"),
  reasonCode: z.string().min(1, "กรุณาเลือกเหตุผลในการรายงาน"),
  reason: z.string().optional().transform(val => val ? sanitizeText(val) : val),
  description: z.string().max(1000, "คำอธิบายต้องไม่เกิน 1000 ตัวอักษร").optional().transform(val => val ? sanitizeText(val) : val),
  evidenceUrls: z.array(z.string().url()).max(5, "อัปโหลดหลักฐานได้สูงสุด 5 รูป").optional(),
})

// ============ Admin Schemas ============

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]),
  reason: z.string().max(500).optional().transform(val => val ? sanitizeText(val) : val),
  suspendDays: z.number().int().min(1).max(365).optional(),
  suspendMinutes: z.number().int().min(1).max(1440).optional(),
})

export const issueWarningSchema = z.object({
  reason: z.string().min(1, "กรุณาระบุเหตุผล").max(500, "เหตุผลต้องไม่เกิน 500 ตัวอักษร").transform(sanitizeText),
  relatedReportId: z.string().optional(),
  relatedItemId: z.string().optional(),
})

// ============ Chat Schemas ============

export const sendMessageSchema = z.object({
  exchangeId: z.string().min(1),
  message: z.string().min(1, "กรุณาพิมพ์ข้อความ").max(1000, "ข้อความต้องไม่เกิน 1000 ตัวอักษร").transform(sanitizeText),
  imageUrl: z.string().url().optional(),
})

// ============ Support Ticket Schemas ============

export const supportCategorySchema = z.enum([
  "general",
  "bug",
  "feature",
  "account",
  "exchange",
  "other",
])

export const createSupportTicketSchema = z.object({
  subject: z.string().min(5, "หัวข้อต้องมีความยาวอย่างน้อย 5 ตัวอักษร").max(100).transform(sanitizeText),
  category: supportCategorySchema,
  description: z.string().min(10, "คำอธิบายต้องมีความยาวอย่างน้อย 10 ตัวอักษร").max(2000).transform(sanitizeText),
})

// ============ Validation Helper ============

/**
 * Validate data against a schema, throws ValidationError if invalid
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }))
    const error = new Error("ข้อมูลไม่ถูกต้อง") as Error & { errors: typeof errors }
    error.errors = errors
    throw error
  }
  return result.data
}

/**
 * Safe validate - returns result instead of throwing
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Array<{ field: string; message: string }> } {
  const result = schema.safeParse(data)
  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    }
  }
  return { success: true, data: result.data }
}

// ============ Type Exports ============

export type UserProfileFormData = z.infer<typeof userProfileSchema>
export type RegistrationFormData = z.infer<typeof registrationSchema>
export type ItemFormData = z.infer<typeof itemSchema>
export type ItemUpdateFormData = z.infer<typeof itemUpdateSchema>
export type CreateExchangeInput = z.infer<typeof createExchangeSchema>
export type RespondExchangeInput = z.infer<typeof respondExchangeSchema>
export type CancelExchangeInput = z.infer<typeof cancelExchangeSchema>
export type CreateReportInput = z.infer<typeof createReportSchema>
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>
export type IssueWarningInput = z.infer<typeof issueWarningSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>
