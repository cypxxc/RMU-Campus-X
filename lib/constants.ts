/**
 * Centralized Constants - RMU-Campus X
 * รวม constants ที่ใช้ทั้งโปรเจคเพื่อลด duplication
 */

import type { ItemCategory, ItemStatus } from "@/types";
import {
  Package,
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

// ============ Category Constants ============

export interface CategoryOption {
  value: ItemCategory;
  label: string;
  icon: typeof Package;
  color: string;
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value: "electronics",
    label: "อิเล็กทรอนิกส์",
    icon: Smartphone,
    color: "text-blue-500",
  },
  { value: "books", label: "หนังสือ", icon: BookOpen, color: "text-amber-500" },
  {
    value: "furniture",
    label: "เฟอร์นิเจอร์",
    icon: Sofa,
    color: "text-purple-500",
  },
  { value: "clothing", label: "เสื้อผ้า", icon: Shirt, color: "text-pink-500" },
  { value: "sports", label: "กีฬา", icon: Dumbbell, color: "text-cyan-500" },
  {
    value: "other",
    label: "อื่นๆ",
    icon: MoreHorizontal,
    color: "text-orange-500",
  },
];

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  electronics: "อิเล็กทรอนิกส์",
  books: "หนังสือ",
  furniture: "เฟอร์นิเจอร์",
  clothing: "เสื้อผ้า",
  sports: "กีฬา",
  other: "อื่นๆ",
};

// ============ Status Constants ============

export interface StatusOption {
  value: ItemStatus | "all";
  label: string;
  icon: typeof CheckCircle;
  color: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  { value: "all", label: "ทั้งหมด", icon: CheckCircle, color: "text-primary" },
  {
    value: "available",
    label: "พร้อมให้",
    icon: Check,
    color: "text-green-500",
  },
  {
    value: "pending",
    label: "รอดำเนินการ",
    icon: Clock,
    color: "text-amber-500",
  },
  { value: "completed", label: "เสร็จสิ้น", icon: X, color: "text-gray-500" },
];

export const STATUS_LABELS: Record<ItemStatus, string> = {
  available: "พร้อมให้",
  pending: "รอดำเนินการ",
  completed: "เสร็จสิ้น",
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
  "อื่นๆ (ระบุในรายละเอียด)",
] as const;

export type LocationOption = (typeof LOCATION_OPTIONS)[number];

// ============ Report Type Constants ============

export const REPORT_TYPE_LABELS: Record<string, string> = {
  item_report: "รายงานสิ่งของ",
  exchange_report: "รายงานการแลกเปลี่ยน",
  chat_report: "รายงานแชท",
  user_report: "รายงานผู้ใช้",
};

export const REPORT_REASON_OPTIONS = [
  { value: "inappropriate", label: "เนื้อหาไม่เหมาะสม" },
  { value: "spam", label: "สแปม/โฆษณา" },
  { value: "fake", label: "ข้อมูลเท็จ" },
  { value: "scam", label: "หลอกลวง" },
  { value: "harassment", label: "คุกคาม/ก่อกวน" },
  { value: "other", label: "อื่นๆ" },
] as const;

// ============ Support Ticket Constants ============

export const SUPPORT_CATEGORY_LABELS: Record<string, string> = {
  general: "ทั่วไป",
  bug: "แจ้งปัญหา",
  feature: "ขอฟีเจอร์",
  account: "บัญชีผู้ใช้",
  other: "อื่นๆ",
};

// ============ User Status Constants ============

export const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "ปกติ",
  WARNING: "ได้รับคำเตือน",
  SUSPENDED: "ถูกระงับชั่วคราว",
  BANNED: "ถูกแบน",
};

export const USER_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-500 border-green-500/20",
  WARNING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  SUSPENDED: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  BANNED: "bg-red-500/10 text-red-500 border-red-500/20",
};

// ============ Exchange Status Constants ============

export const EXCHANGE_STATUS_LABELS: Record<string, string> = {
  pending: "รอการตอบรับ",
  accepted: "ตอบรับแล้ว",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  rejected: "ปฏิเสธ",
};

export const EXCHANGE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  accepted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

// ============ Image Upload Constants ============

export const IMAGE_UPLOAD_CONFIG = {
  maxImages: 5,
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  allowedExtensions: ["jpg", "jpeg", "png", "gif", "webp"],
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
