/**
 * Centralized Constants - RMU-Campus X
 * รวม constants ที่ใช้ทั้งโปรเจคเพื่อลด duplication
 */

import type { ItemCategory, ItemStatus } from "@/types";
import type { LucideIcon } from "lucide-react";
import {
  Smartphone,
  BookOpen,
  Sofa,
  Shirt,
  Dumbbell,
  MoreHorizontal,
  CheckCircle,
  Check,
  Clock,
  X,
} from "lucide-react";

// ============ Bilingual Label Type ============

export interface BilingualLabel {
  th: string;
  en: string;
}

// ============ Category Constants (หมวดรายการสิ่งของ) ============
// แหล่งอ้างอิงเดียว: หมวดหมู่สำหรับโพสต์/กรอง/แสดงรายการ กำหนดในไฟล์นี้เท่านั้น
// ค่า value (electronics, books, ...) ใช้ใน DB/API ไม่เปลี่ยน; แก้เฉพาะ label ได้

export interface CategoryOption {
  value: ItemCategory;
  label: BilingualLabel;
  icon: LucideIcon;
  color: string;
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: "electronics", label: { th: "อิเล็กทรอนิกส์", en: "Electronics" }, icon: Smartphone, color: "text-blue-500" },
  { value: "books", label: { th: "หนังสือ", en: "Books" }, icon: BookOpen, color: "text-amber-500" },
  { value: "clothing", label: { th: "เสื้อผ้า", en: "Clothing" }, icon: Shirt, color: "text-pink-500" },
  { value: "furniture", label: { th: "เฟอร์นิเจอร์", en: "Furniture" }, icon: Sofa, color: "text-purple-500" },
  { value: "sports", label: { th: "อุปกรณ์กีฬา", en: "Sports" }, icon: Dumbbell, color: "text-cyan-500" },
  { value: "other", label: { th: "อื่นๆ", en: "Other" }, icon: MoreHorizontal, color: "text-orange-500" },
];

export const CATEGORY_LABELS: Record<ItemCategory, BilingualLabel> = {
  electronics: { th: "อิเล็กทรอนิกส์", en: "Electronics" },
  books: { th: "หนังสือ", en: "Books" },
  furniture: { th: "เฟอร์นิเจอร์", en: "Furniture" },
  clothing: { th: "เสื้อผ้า", en: "Clothing" },
  sports: { th: "อุปกรณ์กีฬา", en: "Sports" },
  other: { th: "อื่นๆ", en: "Other" },
};

// ============ Support / Admin Contact ============
export const SUPPORT_EMAIL = "653120100120@rmu.ac.th"
export const SUPPORT_EMAIL_SUBJECT = "RMU Campus X Appeal"
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_EMAIL_SUBJECT)}`

// ============ Status Constants ============

export interface StatusOption {
  value: ItemStatus | "all";
  label: BilingualLabel;
  icon: LucideIcon;
  color: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  { value: "all", label: { th: "ทั้งหมด", en: "All" }, icon: CheckCircle, color: "text-primary" },
  {
    value: "available",
    label: { th: "พร้อมให้", en: "Available" },
    icon: Check,
    color: "text-green-500",
  },
  {
    value: "pending",
    label: { th: "รอดำเนินการ", en: "Pending" },
    icon: Clock,
    color: "text-amber-500",
  },
  { value: "completed", label: { th: "เสร็จสิ้น", en: "Completed" }, icon: X, color: "text-gray-500" },
];

export const STATUS_LABELS: Record<ItemStatus, BilingualLabel> = {
  available: { th: "พร้อมให้", en: "Available" },
  pending: { th: "รอดำเนินการ", en: "Pending" },
  completed: { th: "เสร็จสิ้น", en: "Completed" },
};

export const STATUS_COLORS: Record<ItemStatus, string> = {
  available: "bg-primary/10 text-primary border-primary/20",
  pending: "badge-warning",
  completed: "bg-muted text-muted-foreground border-border",
};

// ============ Location Constants ============

export const LOCATION_OPTIONS = [
  "1. คณะครุศาสตร์",
  "3. คณะมนุษยศาสตร์และสังคมศาสตร์",
  "5. ตึกปฏิบัติการทางวิทยาศาสตร์",
  "6. คณะวิทยาศาสตร์และเทคโนโลยี",
  "7. คณะครุศาสตร์ (หลังเก่า)",
  "8. อาคารเทคโนโลยีและนวัตกรรมการศึกษา",
  "10. ศูนย์วิทยาศาสตร์และวิทยาศาสตร์ประยุกต์",
  "11. ศูนย์การศึกษาพิเศษ",
  "12. อาคารเทคโนโลยีอุตสาหกรรม",
  "15. อาคารเฉลิมพระเกียรติ 72 พรรษา (อาคาร 15 ชั้น)",
  "16. อาคารสำนักวิทยบริการและเทคโนโลยีสารสนเทศ",
  "17. อาคารวิริยะ บัณฑิตครุศาสตร์",
  "18. คณะเทคโนโลยีการเกษตร",
  "19. อาคารวิศวกรรมศาสตร์",
  "20. อาคารเทคโนโลยีคอมพิวเตอร์ออกแบบผลิตภัณฑ์",
  "23. อาคารสาธารณสุขชุมชน",
  "24. สำนักศิลปะและวัฒนธรรม",
  "25. โรงยิม 1",
  "26. ศูนย์ภาษาและคอมพิวเตอร์",
  "31. หอประชุมเฉลิมพระเกียรติ 80 พรรษา",
  "32. อาคารกองกิจการนักศึกษา (กองพัฒน์)",
  "33. คณะนิติศาสตร์ / ศูนย์กฎหมายและการปกครอง",
  "34. คณะวิทยาการจัดการ",
  "อาคารเฉลิมพระเกียรติฉลองสิริราชสมบัติครบ 60 ปี",
  "36. ศูนย์การเรียนรู้ภูมิปัญญาท้องถิ่น",
  "37. ศูนย์ถ่ายทอดเทคโนโลยีอุตสาหกรรมสู่ท้องถิ่น",
  "38. คณะเทคโนโลยีสารสนเทศ",
  "39. อาคารปฏิบัติการกลางวิทยาศาสตร์",
  "อาคารศูนย์กลางพัฒนาทรัพยากรมนุษย์เพื่อพัฒนาท้องถิ่น",
  "A. สนามอรุณ ปรีดีดิลก (สนาม 3)",
  "B. สนามมวย",
  "C. สนามกีฬา",
  "D. โรงเรียนสาธิตมหาวิทยาลัยราชภัฏมหาสารคาม",
  "E. โรงเรียนอนุบาลสาธิตมหาวิทยาลัยราชภัฏมหาสารคาม",
  "G. โรงอาหาร",
  "H. สนามกีฬา 1",
  "I. สนามกีฬา 2",
  "J. อาคารบูรพา / หอพักนักศึกษา",
  "L. สระว่ายน้ำ",
  "N. โรงแรมสวนวรุณ",
  "อื่นๆ (ภายในมหาวิทยาลัย)",
] as const;

export type LocationOption = (typeof LOCATION_OPTIONS)[number];

// ============ Report Type Constants ============

export const REPORT_TYPE_LABELS: Record<string, BilingualLabel> = {
  item_report: { th: "รายงานสิ่งของ", en: "Item report" },
  exchange_report: { th: "รายงานการแลกเปลี่ยน", en: "Exchange report" },
  user_report: { th: "รายงานผู้ใช้", en: "User report" },
};

export const REPORT_REASON_OPTIONS = [
  { value: "inappropriate", label: { th: "เนื้อหาไม่เหมาะสม", en: "Inappropriate content" } },
  { value: "spam", label: { th: "สแปม/โฆษณา", en: "Spam/Advertising" } },
  { value: "fake", label: { th: "ข้อมูลเท็จ", en: "False information" } },
  { value: "scam", label: { th: "หลอกลวง", en: "Scam" } },
  { value: "harassment", label: { th: "คุกคาม/ก่อกวน", en: "Harassment" } },
  { value: "other", label: { th: "อื่นๆ", en: "Other" } },
] as const;

// ============ Support Ticket Constants ============

export const REPORT_REASONS = {
  item_report: [
    { code: "item_fake_info", label: { th: "ข้อมูลสิ่งของไม่ถูกต้องหรือเท็จ", en: "Incorrect or false item information" } },
    { code: "item_inappropriate", label: { th: "เนื้อหาไม่เหมาะสม", en: "Inappropriate content" } },
    { code: "item_spam", label: { th: "สแปมโพส", en: "Spam post" } },
    { code: "item_illegal", label: { th: "สิ่งของผิดกฎหมาย", en: "Illegal item" } },
    { code: "other", label: { th: "อื่นๆ (โปรดระบุ)", en: "Other (please specify)" } },
  ],
  exchange_report: [
    { code: "exchange_no_show", label: { th: "ไม่มาตามนัด", en: "No show" } },
    { code: "exchange_wrong_item", label: { th: "สิ่งของไม่ตรงตามที่ตกลง", en: "Wrong item" } },
    { code: "exchange_unsafe", label: { th: "พฤติกรรมไม่เหมาะสม", en: "Inappropriate behavior" } },
    { code: "other", label: { th: "อื่นๆ (โปรดระบุ)", en: "Other (please specify)" } },
  ],
  user_report: [
    { code: "user_inappropriate", label: { th: "พฤติกรรมไม่เหมาะสม", en: "Inappropriate behavior" } },
    { code: "user_spam", label: { th: "สแปมข้อความ", en: "Spam messages" } },
    { code: "other", label: { th: "อื่นๆ (โปรดระบุ)", en: "Other (please specify)" } },
  ],
};

// ============ Support Ticket Constants ============

export const SUPPORT_CATEGORY_LABELS: Record<string, BilingualLabel> = {
  general: { th: "ทั่วไป", en: "General" },
  bug: { th: "แจ้งปัญหา", en: "Bug report" },
  feature: { th: "ขอฟีเจอร์", en: "Feature request" },
  account: { th: "บัญชีผู้ใช้", en: "Account" },
  other: { th: "อื่นๆ", en: "Other" },
};

// ============ User Status Constants ============

export const USER_STATUS_LABELS: Record<string, BilingualLabel> = {
  ACTIVE: { th: "ปกติ", en: "Active" },
  WARNING: { th: "ได้รับคำเตือน", en: "Warning" },
  SUSPENDED: { th: "ถูกระงับชั่วคราว", en: "Suspended" },
  BANNED: { th: "ถูกแบน", en: "Banned" },
};

export const USER_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-500 border-green-500/20",
  WARNING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  SUSPENDED: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  BANNED: "bg-red-500/10 text-red-500 border-red-500/20",
};

// ============ Exchange Status Constants ============

export const EXCHANGE_STATUS_LABELS: Record<string, BilingualLabel> = {
  pending: { th: "รอการตอบรับ", en: "Pending" },
  accepted: { th: "กำลังดำเนินการ", en: "In progress" },
  in_progress: { th: "กำลังดำเนินการ", en: "In progress" },
  completed: { th: "เสร็จสิ้น", en: "Completed" },
  cancelled: { th: "ยกเลิก", en: "Cancelled" },
  rejected: { th: "ปฏิเสธ", en: "Rejected" },
};

export const EXCHANGE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  accepted: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  in_progress: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

// ============ Image Upload Constants ============

export const IMAGE_UPLOAD_CONFIG = {
  maxImages: 5,
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedTypes: ["image/jpeg", "image/png"],
  allowedExtensions: ["jpg", "jpeg", "png"],
} as const;

// ============ Rate Limit Constants ============

export const RATE_LIMIT_CONFIG = {
  createItem: {
    cooldownMs: 60 * 1000, // 1 minute
    maxAttempts: 5,
  },
  sendMessage: {
    cooldownMs: 1000, // 1 second
    maxAttempts: 30,
  },
  createReport: {
    cooldownMs: 5 * 60 * 1000, // 5 minutes
    maxAttempts: 3,
  },
} as const;
