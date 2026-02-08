import { Lock, Eye, Database, ShieldAlert, FileText, Cookie, Server, ShieldCheck } from "lucide-react"

const PRIVACY_LAST_UPDATED = "4 กุมภาพันธ์ 2568"

const SECTIONS = [
  { id: "intro", title: "บทนำและหลัก PAPA", icon: ShieldCheck },
  { id: "data", title: "ข้อมูลที่เราเก็บรวบรวม", icon: Database },
  { id: "usage", title: "การใช้ข้อมูลของคุณ", icon: Eye },
  { id: "security", title: "ความปลอดภัยของข้อมูล", icon: ShieldAlert },
  { id: "cookies", title: "บันทึกและคุกกี้", icon: Cookie },
  { id: "deletion", title: "การลบบัญชีและข้อมูล", icon: Server },
]

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 max-w-3xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-4">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold mb-2">นโยบายความเป็นส่วนตัว</h1>
        <p className="text-muted-foreground mb-2">
          RMU-Campus X — แพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษาและบุคลากร มหาวิทยาลัยราชภัฏมหาสารคาม
        </p>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          อัปเดตล่าสุด: {PRIVACY_LAST_UPDATED}
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
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            บทนำและหลัก PAPA
          </h2>
          <div className="text-muted-foreground leading-relaxed space-y-4">
            <p>
              RMU-Campus X ให้ความสำคัญกับความเป็นส่วนตัวของคุณอย่างสูงสุด นโยบายนี้อธิบายถึงวิธีการที่เราเก็บรวบรวม ใช้ และปกป้องข้อมูลส่วนบุคคลของคุณในขณะที่คุณใช้งานแพลตฟอร์มของเรา
            </p>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">หลัก PAPA ในการพัฒนาระบบ</h4>
              <p className="text-xs mb-3">
                เราใช้กรอบจริยธรรมสารสนเทศ PAPA (Privacy, Accuracy, Property, Accessibility) ในการออกแบบและให้บริการ:
              </p>
              <ul className="text-xs space-y-1 list-none">
                <li><span className="font-medium text-foreground">P — Privacy:</span> เก็บ/ใช้/เปิดเผยข้อมูลตามนโยบายนี้ มี consent และสิทธิ์ลบข้อมูล</li>
                <li><span className="font-medium text-foreground">A — Accuracy:</span> ตรวจสอบข้อมูล (ยืนยันอีเมล, validation)</li>
                <li><span className="font-medium text-foreground">P — Property:</span> ข้อมูลที่คุณสร้างเป็นของคุณ ลบบัญชีได้ตลอดเวลา</li>
                <li><span className="font-medium text-foreground">A — Accessibility:</span> เข้าถึงระบบได้เฉพาะผู้มีอีเมล @rmu.ac.th</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="data" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <Database className="h-5 w-5 text-primary shrink-0" />
            1. ข้อมูลที่เราเก็บรวบรวม
          </h2>
          <div className="text-muted-foreground leading-relaxed">
            <p className="mb-2">เราเก็บรวบรวมข้อมูล:</p>
            <ul className="list-disc list-outside ml-4 space-y-1">
              <li><span className="font-medium text-foreground">ข้อมูลบัญชี:</span> ชื่อที่แสดง, อีเมล (@rmu.ac.th), รูปโปรไฟล์</li>
              <li><span className="font-medium text-foreground">ข้อมูลการใช้งาน:</span> ประวัติการโพสต์ (รายการสิ่งของ), การแลกเปลี่ยน</li>
            </ul>
          </div>
        </section>

        <section id="usage" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <Eye className="h-5 w-5 text-primary shrink-0" />
            2. การใช้ข้อมูลของคุณ
          </h2>
          <div className="text-muted-foreground leading-relaxed">
            <p className="mb-3">เราใช้ข้อมูลของคุณเพื่อ:</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {["ยืนยันตัวตนว่าเป็นนักศึกษาและบุคลากร RMU", "จัดการรายการสิ่งของและการแลกเปลี่ยน", "ส่งแจ้งเตือนที่สำคัญ"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/30 p-2 rounded border text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <ShieldAlert className="h-5 w-5 text-primary shrink-0" />
            3. ความปลอดภัยของข้อมูล
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            เราใช้มาตรการความปลอดภัยมาตรฐานอุตสาหกรรม (Firebase Authentication & Security Rules) เพื่อปกป้องข้อมูลของคุณจากการเข้าถึงโดยไม่ได้รับอนุญาต
          </p>
        </section>

        <section id="cookies" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <Cookie className="h-5 w-5 text-primary shrink-0" />
            4. บันทึกและคุกกี้
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            เราใช้คุกกี้เพื่อจดจำสถานะการเข้าสู่ระบบและการตั้งค่าของคุณ เพื่อให้คุณใช้งานเว็บไซต์ได้อย่างต่อเนื่อง
          </p>
        </section>

        <section id="deletion" className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <Server className="h-5 w-5 text-primary shrink-0" />
            5. การลบบัญชีและข้อมูล
          </h2>
          <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary text-muted-foreground text-sm leading-relaxed">
            คุณมีสิทธิ์ในการลบบัญชีผู้ใช้และข้อมูลส่วนตัวของคุณออกจากระบบได้ตลอดเวลา ผ่านเมนูตั้งค่าในหน้าโปรไฟล์
            เมื่อทำการลบแล้ว ข้อมูลจะไม่สามารถกู้คืนได้
          </div>
        </section>
      </div>

    </div>
  )
}
