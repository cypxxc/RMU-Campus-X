import { BookOpen, UserPlus, Package, Search, MessageSquare, Handshake, Heart, Flag } from "lucide-react"

const SECTIONS = [
  {
    id: "register",
    icon: UserPlus,
    title: "สมัครสมาชิกและยืนยันอีเมล",
    steps: [
      "ไปที่หน้าแรก แล้วกดปุ่ม **สมัครสมาชิก**",
      "กรอกอีเมล @rmu.ac.th (เฉพาะนักศึกษาและบุคลากร RMU เท่านั้น)",
      "ตั้งรหัสผ่านที่ปลอดภัย และกดสมัคร",
      "เปิดอีเมลที่ลงทะเบียน แล้วกดลิงก์ยืนยันตัวตนในจดหมายจากระบบ",
      "หลังยืนยันแล้ว สามารถเข้าสู่ระบบได้ทันที",
    ],
  },
  {
    id: "post",
    icon: Package,
    title: "โพสต์สิ่งของ",
    steps: [
      "เข้าสู่ระบบ แล้วกดปุ่ม **โพสต์สิ่งของ** (เครื่องหมาย +) ที่แถบด้านบนหรือในหน้าหลัก",
      "กรอก **ชื่อสิ่งของ** และ **รายละเอียด** ให้ครบ",
      "เลือก **หมวดหมู่** (หนังสือ อุปกรณ์อิเล็กทรอนิกส์ เครื่องใช้ ฯลฯ) และ **สถานที่รับของ**",
      "อัปโหลดรูปภาพ (ได้สูงสุด 5 รูป) เพื่อให้ผู้สนใจเห็นสภาพของจริง",
      "กด **โพสต์สิ่งของ** ประกาศจะแสดงในหน้าหลักและค้นหาจากหมวดหมู่ได้ทันที",
    ],
  },
  {
    id: "search-request",
    icon: Search,
    title: "ค้นหาและขอรับสิ่งของ",
    steps: [
      "ที่ **หน้าหลัก** ใช้ช่องค้นหาด้านบน หรือเลือก **ตัวกรอง** (หมวดหมู่ / สถานะ) ทางซ้าย",
      "คลิกที่การ์ดสิ่งของที่สนใจ เพื่อดูรายละเอียดเต็ม",
      "กดปุ่ม **ขอรับสิ่งของนี้**",
      "เจ้าของจะได้รับแจ้งเตือนและสามารถ **ตอบรับ** หรือ **ปฏิเสธ** คำขอได้",
    ],
  },
  {
    id: "exchange-chat",
    icon: MessageSquare,
    title: "การแลกเปลี่ยนและแชท",
    steps: [
      "กด **ขอรับสิ่งของ** → ระบบจะเปิด **ห้องแชท** ให้ทันที",
      "หรือดูรายการในเมนู **การแลกเปลี่ยน** แล้วกดเข้าไปที่รายการนั้นเพื่อเปิดห้องแชท",
      "ใช้แชทในการนัดวันเวลา",
      "เมื่อทั้งสองฝ่ายรับของครบแล้ว ให้กด **ยืนยันการแลกเปลี่ยน** ตามลำดับ",
      "หลังยืนยันครบ การแลกเปลี่ยนจะถือว่า **สำเร็จ** และจะแสดงในประวัติ",
    ],
  },
  {
    id: "meet-confirm",
    icon: Handshake,
    title: "นัดรับของและยืนยันการแลกเปลี่ยน",
    steps: [
      "นัดหมายกับอีกฝ่ายผ่านแชท ให้ชัดเจนเรื่อง **วัน เวลา สถานที่** (แนะนำจุดภายใน RMU ที่ปลอดภัย)",
      "เมื่อมอบของ/รับของแล้ว ให้เข้าไปที่หน้ารายการแลกเปลี่ยนนั้น",
      "กด **ยืนยันว่าส่งมอบของแล้ว** (ฝ่ายให้ของ) หรือ **ยืนยันว่าได้รับของแล้ว** (ฝ่ายรับของ)",
      "เมื่อทั้งสองฝ่ายกดยืนยันครบ การแลกเปลี่ยนจะเสร็จสมบูรณ์",
    ],
  },
  {
    id: "favorites",
    icon: Heart,
    title: "รายการโปรด",
    steps: [
      "ที่การ์ดสิ่งของในหน้าหลักหรือหน้ารายละเอียด กดไอคอน **หัวใจ** เพื่อเก็บเข้า **รายการโปรด**",
      "ดูรายการที่บันทึกไว้ได้จากเมนู **รายการโปรด**",
      "สามารถยกเลิกการบันทึกได้โดยกดหัวใจอีกครั้ง",
    ],
  },
  {
    id: "report",
    icon: Flag,
    title: "แจ้งปัญหาการใช้งาน",
    steps: [
      "พบสิ่งของหรือผู้ใช้ที่ผิดกฎหรือไม่เหมาะสม: กดปุ่ม **รายงาน** ที่หน้ารายการสิ่งของหรือหน้าโปรไฟล์ของผู้ใช้",
      "มีคำถามหรือปัญหาเฉพาะ: ใช้เมนู **ช่วยเหลือ** แล้วเลือก **ส่งคำร้อง** เพื่อแจ้งทีมงาน (คำร้องของฉันจะแสดงในเมนูเมื่อมีคำร้องอยู่)",
      "อ่าน **แนวทางชุมชน** และ **ข้อกำหนดการใช้งาน** ได้จากลิงก์ในฟุตเตอร์",
    ],
  },
]

export default function GuidePage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 max-w-3xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-4">
          <BookOpen className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold mb-2">คู่มือการใช้งาน</h1>
        <p className="text-muted-foreground">
          วิธีการใช้งานระบบ RMU-Campus X แบบละเอียด
        </p>
      </div>

      <nav className="mb-10 rounded-lg border bg-muted/30 p-4" aria-label="สารบัญ">
        <p className="text-sm font-medium text-muted-foreground mb-3">สารบัญ</p>
        <ul className="space-y-1.5 text-sm">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-primary hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-10">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm"
            >
              <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                {section.title}
              </h2>
              <ol className="space-y-3 list-decimal list-inside text-muted-foreground leading-relaxed">
                {section.steps.map((step, i) => (
                  <li key={i} className="[&_strong]:text-foreground">
                    {step.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )
        })}
      </div>

    </div>
  )
}
