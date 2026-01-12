import { z } from "zod"

// User Profile Schema
export const userProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร")
    .max(50, "ชื่อต้องมีความยาวไม่เกิน 50 ตัวอักษร"),
  bio: z
    .string()
    .max(300, "คำแนะนำตัวต้องมีความยาวไม่เกิน 300 ตัวอักษร")
    .optional(),
  phoneNumber: z
    .string()
    .regex(/^0[0-9]{9}$/, "เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็นตัวเลข 10 หลัก เริ่มต้นด้วย 0)")
    .optional()
    .or(z.literal("")),
})

// Item Schema
export const itemSchema = z.object({
  title: z
    .string()
    .min(3, "ชื่อสิ่งของต้องมีความยาวอย่างน้อย 3 ตัวอักษร")
    .max(100, "ชื่อสิ่งของต้องมีความยาวไม่เกิน 100 ตัวอักษร"),
  description: z
    .string()
    .min(10, "คำอธิบายต้องมีความยาวอย่างน้อย 10 ตัวอักษร")
    .max(1000, "คำอธิบายต้องมีความยาวไม่เกิน 1000 ตัวอักษร"),
  category: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  location: z.string().min(1, "กรุณาระบุสถานที่นัดรับ (เช่น ตึกคณะ, โรงอาหาร)"),
  locationDetail: z.string().max(200, "รายละเอียดสถานที่ต้องไม่เกิน 200 ตัวอักษร").optional(),
})

export type UserProfileFormData = z.infer<typeof userProfileSchema>
export type ItemFormData = z.infer<typeof itemSchema>
