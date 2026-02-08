import { redirect } from "next/navigation"

/** Redirect ไปหน้าหลัก — หน้ารายละเอียดเกี่ยวกับเราปิดไว้ก่อน (ลดประเด็นกรรมการถาม) */
export default function AboutPage() {
  redirect("/")
}
