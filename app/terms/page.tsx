import { ShieldCheck, UserCheck, Ban, MessageSquareWarning, Scale, Gavel, FileText, ShieldAlert, UserX } from "lucide-react"
import { SUPPORT_MAILTO } from "@/lib/constants"

const TERMS_LAST_UPDATED = "4 กุมภาพันธ์ 2568"

const SECTIONS = [
  { id: "agreement", title: "ข้อตกลงทั่วไป", icon: Scale },
  { id: "eligibility", title: "คุณสมบัติของผู้ใช้งาน", icon: UserCheck },
  { id: "prohibited", title: "สิ่งของที่ห้ามโพสต์", icon: Ban },
  { id: "conduct", title: "การปฏิบัติตนของสมาชิก", icon: MessageSquareWarning },
  { id: "security", title: "บัญชีและความปลอดภัย", icon: ShieldAlert },
  { id: "suspension", title: "การระงับและยกเลิกบัญชี", icon: UserX },
  { id: "liability", title: "ข้อจำกัดความรับผิด", icon: Gavel },
]

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 max-w-3xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-4">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold mb-2">ข้อกำหนดและเงื่อนไขการใช้งาน</h1>
        <p className="text-muted-foreground mb-2">
          RMU-Campus X — แพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษาและบุคลากร มหาวิทยาลัยราชภัฏมหาสารคาม
        </p>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          อัปเดตล่าสุด: {TERMS_LAST_UPDATED}
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
        <section id="agreement" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <Scale className="h-5 w-5 text-primary shrink-0" />
            1. ข้อตกลงทั่วไป
          </h2>
          <div className="text-muted-foreground leading-relaxed space-y-3">
            <p>
              <strong className="text-foreground">ข้อกำหนดและเงื่อนไขการใช้งาน (Terms of Service)</strong> เว็บแอปพลิเคชัน RMU-Campus X
            </p>
            <ul className="list-disc list-outside ml-4 space-y-1">
              <li><strong className="text-foreground">การยอมรับ:</strong> เมื่อท่านลงทะเบียนหรือใช้งานแพลตฟอร์มนี้ ถือว่าท่านได้อ่าน เข้าใจ และยอมรับข้อกำหนดและเงื่อนไขทั้งหมดรวมถึงนโยบายความเป็นส่วนตัว</li>
              <li><strong className="text-foreground">วัตถุประสงค์ของแพลตฟอร์ม:</strong> จัดทำเพื่อการแลกเปลี่ยน/แบ่งปันสิ่งของระหว่างนักศึกษาและบุคลากรภายในมหาวิทยาลัยเท่านั้น ไม่ใช่ช่องทางขายหรือแสวงหาผลกำไรในเชิงพาณิชย์</li>
            </ul>
          </div>
        </section>

        <section id="eligibility" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <UserCheck className="h-5 w-5 text-primary shrink-0" />
            2. คุณสมบัติของผู้ใช้งาน
          </h2>
          <div className="text-muted-foreground leading-relaxed space-y-2">
            <p>เพื่อความปลอดภัยและความน่าเชื่อถือของชุมชน ผู้ใช้ต้องมีคุณสมบัติดังนี้:</p>
            <ul className="list-disc list-outside ml-4 space-y-1">
              <li>เป็นนักศึกษา หรือ บุคลากร/อาจารย์ ของมหาวิทยาลัยราชภัฏมหาสารคาม</li>
              <li>ลงทะเบียนและยืนยันตัวตนด้วยอีเมลโดเมน <code className="bg-muted px-1 rounded">@rmu.ac.th</code> เท่านั้น</li>
              <li>ยืนยันอีเมล (Email Verification) ตามที่ระบบกำหนด</li>
            </ul>
            <p className="text-sm">การสมัครสมาชิกถือเป็นการยืนยันว่าท่านมีคุณสมบัติตามที่กำหนด</p>
          </div>
        </section>

        <section id="prohibited" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <Ban className="h-5 w-5 text-primary shrink-0" />
            3. สิ่งของที่ห้ามโพสต์
          </h2>
          <div className="text-muted-foreground leading-relaxed space-y-2">
            <p>เพื่อความปลอดภัยและความเรียบร้อย <strong className="text-foreground">ห้ามลงประกาศสิ่งของต่อไปนี้โดยเด็ดขาด:</strong></p>
            <div className="grid sm:grid-cols-2 gap-2 mt-3">
              {["สิ่งของผิดกฎหมายทุกชนิด", "ยาเสพติดและสิ่งมึนเมา", "อาวุธและวัตถุอันตราย", "สื่อลามกอนาจาร", "สิ่งของที่ไม่ได้เป็นเจ้าของจริง"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/30 p-2 rounded border text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <p className="text-sm pt-2">การฝ่าฝืนจะถูกพิจารณาและอาจนำไปสู่การลบโพสต์ การเตือน หรือการระงับบัญชี</p>
          </div>
        </section>

        <section id="conduct" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <MessageSquareWarning className="h-5 w-5 text-primary shrink-0" />
            4. การปฏิบัติตนของสมาชิก
          </h2>
          <div className="text-muted-foreground leading-relaxed space-y-2">
            <p>ชุมชนของเราดำเนินไปด้วยความเคารพและความรับผิดชอบร่วมกัน ผู้ใช้ต้อง:</p>
            <ul className="list-disc list-outside ml-4 space-y-1">
              <li>ใช้ถ้อยคำสุภาพ ไม่ก่อความรำคาญ ไม่รังแก หรือคุกคามผู้อื่น (ทั้งในแชท และ การโพสต์)</li>
              <li>ปฏิบัติตามแนวทางของระบบ (เช่น ไม่สแปม ไม่โพสต์ซ้ำมากเกินไป)</li>
            </ul>
            <p><span className="text-red-600 dark:text-red-400 font-medium">ทางระบบมีสิทธิตรวจสอบและระงับบัญชีทันที</span> หากพบพฤติกรรมที่ไม่เหมาะสม หรือได้รับรายงานจากผู้ใช้ท่านอื่น</p>
          </div>
        </section>

        <section id="security" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <ShieldAlert className="h-5 w-5 text-primary shrink-0" />
            5. บัญชีและความปลอดภัย
          </h2>
          <div className="text-muted-foreground leading-relaxed">
            <ul className="list-disc list-outside ml-4 space-y-1">
              <li>ท่านมีหน้าที่รักษาความลับของรหัสผ่านและไม่เปิดเผยให้ผู้อื่นใช้บัญชีของท่าน</li>
              <li>หากสงสัยว่าบัญชีถูกใช้โดยไม่ได้รับอนุญาต กรุณาเปลี่ยนรหัสผ่านและแจ้งทีมงานผ่านเมนูช่วยเหลือ</li>
              <li>การกระทำใดๆ ที่เกิดจากบัญชีของท่าน (หลังล็อกอิน) ถือเป็นความรับผิดชอบของท่าน</li>
            </ul>
          </div>
        </section>

        <section id="suspension" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <UserX className="h-5 w-5 text-primary shrink-0" />
            6. การระงับและยกเลิกบัญชี
          </h2>
          <div className="text-muted-foreground leading-relaxed space-y-2">
            <p>ทางผู้ให้บริการ (ผู้พัฒนา) ขอสงวนสิทธิ์:</p>
            <ul className="list-disc list-outside ml-4 space-y-1">
              <li><strong className="text-foreground">ออกคำเตือน</strong> — บันทึกเหตุผลและจำนวนคำเตือนสะสม ผู้ใช้ยังใช้งานได้ตามปกติ แต่จะเห็นข้อความแจ้งเตือนในระบบ และหากได้รับคำเตือนซ้ำอาจถูกระงับหรือแบนในขั้นถัดไป</li>
              <li><strong className="text-foreground">ระงับบัญชีชั่วคราว</strong> — ผู้ใช้ยังล็อกอินได้ แต่จะไม่สามารถโพสต์ของ ขอแลกเปลี่ยน หรือแชทได้จนครบกำหนด ระบบจะแสดงวันที่ปลดระงับและปุ่มติดต่อทีมสนับสนุน หากต้องการติดต่อเพิ่มเติม ส่งอีเมลได้ที่ <a href={SUPPORT_MAILTO} className="text-primary hover:underline">Support</a></li>
              <li><strong className="text-foreground">แบนถาวร</strong> — ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้อีก ระบบจะแสดงเหตุผลและแนะนำให้ติดต่อทีมสนับสนุน หากคิดว่าเป็นข้อผิดพลาด กรุณาส่งอีเมลติดต่อที่ <a href={SUPPORT_MAILTO} className="text-primary hover:underline">Support</a></li>
              <li>ท่านสามารถยกเลิกบัญชีของท่านได้ผ่านการตั้งค่าในระบบ (ตามฟีเจอร์ที่ระบบรองรับ)</li>
            </ul>
          </div>
        </section>

        <section id="liability" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <Gavel className="h-5 w-5 text-primary shrink-0" />
            7. ข้อจำกัดความรับผิด
          </h2>
          <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary text-muted-foreground text-sm leading-relaxed space-y-2">
            <p>RMU-Campus X เป็น <strong className="text-foreground">พื้นที่กลาง (platform)</strong> สำหรับการแลกเปลี่ยนข้อมูลระหว่างผู้ใช้ ทางผู้ให้บริการ <strong className="text-foreground">ไม่รับผิดชอบ</strong> ต่อความเสียหายใดๆ ที่เกิดจากการแลกเปลี่ยน การนัดพบ หรือการติดต่อระหว่างผู้ใช้</p>
            <p>ท่านควร:</p>
            <ul className="list-disc list-outside ml-4 space-y-1">
              <li>ตรวจสอบสภาพสิ่งของและความน่าเชื่อถือของคู่แลกเปลี่ยนด้วยตนเองก่อนตกลง</li>
              <li>นัดพบในที่สาธารณะและปลอดภัย และระมัดระวังเรื่องความปลอดภัยส่วนตัว</li>
            </ul>
          </div>
        </section>
      </div>

    </div>
  )
}
