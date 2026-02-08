import Link from "next/link"
import { BookOpen, Handshake, AlertTriangle, ShieldCheck, Heart, UserPlus, MessageCircle, FileText } from "lucide-react"

const GUIDELINES_LAST_UPDATED = "4 กุมภาพันธ์ 2568"

const SECTIONS = [
  { id: "intro", title: "บทนำ", icon: BookOpen },
  { id: "dos-donts", title: "สิ่งที่ควรทำ และสิ่งที่ไม่ควรทำ", icon: Handshake },
  { id: "safety", title: "ความปลอดภัยในการนัดรับ", icon: ShieldCheck },
  { id: "reporting", title: "การรายงานและผลของการฝ่าฝืน", icon: AlertTriangle },
]

export default function GuidelinesPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 max-w-3xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-4">
          <BookOpen className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold mb-2">แนวทางชุมชน</h1>
        <p className="text-muted-foreground mb-2">
          RMU-Campus X — สำหรับนักศึกษาและบุคลากร มหาวิทยาลัยราชภัฏมหาสารคาม
        </p>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          อัปเดตล่าสุด: {GUIDELINES_LAST_UPDATED}
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

      <div className="space-y-6">
        <section id="intro" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <BookOpen className="h-5 w-5 text-primary shrink-0" />
            บทนำ
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            RMU-Campus X เป็นพื้นที่สำหรับแบ่งปันและแลกเปลี่ยนสิ่งของระหว่างนักศึกษาและบุคลากร มหาวิทยาลัยราชภัฏมหาสารคาม
            เพื่อให้ชุมชนน่าอยู่และปลอดภัย เราขอความร่วมมือจากสมาชิกทุกท่านปฏิบัติตามแนวทางด้านล่าง
            การใช้งานอยู่ภายใต้ <Link href="/terms" className="text-primary hover:underline font-medium">ข้อกำหนดและเงื่อนไขการใช้งาน</Link> และ <Link href="/privacy" className="text-primary hover:underline font-medium">นโยบายความเป็นส่วนตัว</Link>
          </p>
        </section>

        <section id="dos-donts" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <Handshake className="h-5 w-5 text-primary shrink-0" />
            สิ่งที่ควรทำ และสิ่งที่ไม่ควรทำ
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-900/10 p-4">
              <h3 className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold mb-3">
                <Handshake className="w-4 h-4" />
                สิ่งที่ควรทำ (Do&apos;s)
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <UserPlus className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  ใช้ถ้อยคำสุภาพและให้เกียรติซึ่งกันและกัน
                </li>
                <li className="flex gap-2">
                  <Heart className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  แบ่งปันสิ่งของด้วยเจตนาดี ไม่หวังผลกำไร
                </li>
                <li className="flex gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  ตรวจสอบสภาพสิ่งของและบอกรายละเอียดตามจริง
                </li>
                <li className="flex gap-2">
                  <MessageCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  ตอบกลับข้อความแลกเปลี่ยนอย่างสม่ำเสมอ
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 p-4">
              <h3 className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold mb-3">
                <AlertTriangle className="w-4 h-4" />
                สิ่งที่ไม่ควรทำ (Don&apos;ts)
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold shrink-0">✕</span>
                  ลงประกาศสิ่งของผิดกฎหมาย ละเมิดลิขสิทธิ์ หรือสิ่งของที่ห้ามโพสต์ตามข้อกำหนด
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold shrink-0">✕</span>
                  ใช้ถ้อยคำหยาบคาย รุนแรง หรือคุกคามผู้อื่น (รวมถึงในแชทและการติดต่อ)
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold shrink-0">✕</span>
                  นัดรับสิ่งของในที่เปลี่ยวหรือไม่ปลอดภัย
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600 font-bold shrink-0">✕</span>
                  สแปมประกาศ โพสต์ซ้ำ หรือส่งข้อความรบกวนผู้อื่น
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="safety" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            ความปลอดภัยในการนัดรับ
          </h2>
          <p className="text-muted-foreground mb-4">การนัดรับเป็นวิธีแลกเปลี่ยนที่รวดเร็วและประหยัด แต่ต้องคำนึงถึงความปลอดภัยเป็นสำคัญ:</p>
          <ul className="grid sm:grid-cols-2 gap-3">
            <li className="flex items-start gap-3 bg-muted/30 p-4 rounded-lg border">
              <span className="bg-primary/20 px-2 py-0.5 rounded text-primary font-bold text-xs shrink-0">01</span>
              <div className="text-sm">
                <strong className="block mb-1 text-foreground">นัดในที่สาธารณะ</strong>
                เช่น หน้าโรงอาหาร, ลานกิจกรรม, หรือหน้าตึกคณะ ในเวลากลางวัน
              </div>
            </li>
            <li className="flex items-start gap-3 bg-muted/30 p-4 rounded-lg border">
              <span className="bg-primary/20 px-2 py-0.5 rounded text-primary font-bold text-xs shrink-0">02</span>
              <div className="text-sm">
                <strong className="block mb-1 text-foreground">พาเพื่อนไปด้วย</strong>
                หากไม่มั่นใจ หรือต้องไปในที่ที่ไม่คุ้นเคย ควรชวนเพื่อนไปด้วยเสมอ
              </div>
            </li>
            <li className="flex items-start gap-3 bg-muted/30 p-4 rounded-lg border">
              <span className="bg-primary/20 px-2 py-0.5 rounded text-primary font-bold text-xs shrink-0">03</span>
              <div className="text-sm">
                <strong className="block mb-1 text-foreground">ตรวจสอบสิ่งของ</strong>
                เช็คสภาพสิ่งของให้เรียบร้อยก่อนแยกย้าย เพื่อความสบายใจทั้งสองฝ่าย
              </div>
            </li>
            <li className="flex items-start gap-3 bg-muted/30 p-4 rounded-lg border">
              <span className="bg-primary/20 px-2 py-0.5 rounded text-primary font-bold text-xs shrink-0">04</span>
              <div className="text-sm">
                <strong className="block mb-1 text-foreground">เชื่อสัญชาตญาณ</strong>
                หากรู้สึกไม่ปลอดภัย ให้ยกเลิกการนัดรับ หรือเปลี่ยนสถานที่ทันที
              </div>
            </li>
          </ul>
        </section>

        <section id="reporting" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <AlertTriangle className="h-5 w-5 text-primary shrink-0" />
            การรายงานและผลของการฝ่าฝืน
          </h2>
          <div className="text-muted-foreground text-sm leading-relaxed space-y-3">
            <p>หากพบเห็นการกระทำที่ผิดกฎระเบียบหรือขัดกับแนวทางชุมชน โปรดใช้ปุ่ม <strong className="text-foreground">รายงานปัญหา</strong> บนหน้ารายการสิ่งของหรือในจุดที่ระบบกำหนด เพื่อให้ทีมงานพิจารณาต่อไป</p>
            <p>การฝ่าฝืนแนวทางนี้อาจนำไปสู่ <strong className="text-foreground">การออกคำเตือน</strong> <strong className="text-foreground">การระงับบัญชีชั่วคราว</strong> หรือ <strong className="text-foreground">การแบนถาวร</strong> ตามที่ระบุใน <Link href="/terms" className="text-primary hover:underline font-medium">ข้อกำหนดและเงื่อนไขการใช้งาน</Link></p>
          </div>
        </section>
      </div>

    </div>
  )
}
