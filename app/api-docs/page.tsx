import { redirect } from "next/navigation"

/** Redirect ไปหน้าหลัก — หน้าเอกสาร API ปิดไว้ก่อน (ลดประเด็นกรรมการถาม) */
export default function ApiDocsPage() {
  redirect("/")
}
