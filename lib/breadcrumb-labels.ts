/**
 * แปลง path/segment เป็น label ภาษาไทยสำหรับ breadcrumb
 */
export const ROUTE_LABELS: Record<string, string> = {
  dashboard: "หน้าหลัก",
  "my-exchanges": "การแลกเปลี่ยนของฉัน",
  favorites: "รายการโปรด",
  profile: "โปรไฟล์",
  settings: "ตั้งค่า",
  admin: "ผู้ดูแลระบบ",
  announcements: "ประกาศ",
  items: "จัดการสิ่งของ",
  users: "จัดการผู้ใช้",
  reports: "รายงานปัญหา",
  exchanges: "การแลกเปลี่ยน",
  support: "ช่วยเหลือ",
  logs: "บันทึกกิจกรรม",
  data: "ข้อมูล",
  "forgot-password": "ลืมรหัสผ่าน",
  register: "สมัครสมาชิก",
  login: "เข้าสู่ระบบ",
  "verify-email": "ยืนยันอีเมล",
  consent: "ยินยอมข้อกำหนด",
  notifications: "การแจ้งเตือน",
  guide: "คู่มือการใช้งาน",
  about: "เกี่ยวกับเรา",
  terms: "ข้อกำหนดและเงื่อนไข",
  privacy: "นโยบายความเป็นส่วนตัว",
  guidelines: "แนวทางชุมชน",
  report: "แจ้งปัญหาการใช้งาน",
  chat: "แชท",
  item: "รายละเอียดสิ่งของ",
  "api-docs": "เอกสาร API",
}

function isLikelyId(segment: string): boolean {
  return (segment.length > 15 && !segment.includes("-")) || /^\d+$/.test(segment)
}

export function getLabelForSegment(segment: string): string {
  if (isLikelyId(segment)) return "รายละเอียด"
  return ROUTE_LABELS[segment] || segment
}

/** สร้าง label ของ path จาก segment สุดท้าย */
export function getLabelForPath(pathname: string): string {
  if (pathname === "/") return "หน้าแรก"
  const segments = pathname.split("/").filter(Boolean)
  const last = segments[segments.length - 1]
  return last ? getLabelForSegment(last) : "หน้าแรก"
}

/** แปลง pathname เป็น array ของ { path, label } สำหรับ initial history */
export function pathToHistoryEntries(pathname: string): { path: string; label: string }[] {
  if (!pathname || pathname === "/") return [{ path: "/", label: "หน้าแรก" }]
  const segments = pathname.split("/").filter(Boolean)
  const entries: { path: string; label: string }[] = [{ path: "/", label: "หน้าแรก" }]
  let acc = ""
  for (const seg of segments) {
    acc += (acc ? "/" : "/") + seg
    entries.push({ path: acc, label: getLabelForSegment(seg) })
  }
  return entries
}
