import { ShieldCheck, UserCheck, Ban, MessageSquareWarning, Scale, Gavel, FileText, ShieldAlert, UserX } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

/** วันที่แก้ไขข้อกำหนดล่าสุด (อัปเดตเมื่อมีการเปลี่ยนเนื้อหา) */
const TERMS_LAST_UPDATED = "4 กุมภาพันธ์ 2568"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-none shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-8 pt-10">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              ข้อกำหนดและเงื่อนไขการใช้งาน
            </CardTitle>
            <CardDescription className="text-base mt-2">
              RMU-Campus X — แพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษาและบุคลากร มหาวิทยาลัยราชภัฏมหาสารคาม
            </CardDescription>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4 bg-muted/50 py-1.5 px-4 rounded-full w-fit mx-auto">
              <FileText className="w-4 h-4 shrink-0" />
              <span>อัปเดตล่าสุด: {TERMS_LAST_UPDATED}</span>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-6 sm:p-10">
            <div className="space-y-10">
              {/* 1. ข้อตกลงทั่วไป */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg shrink-0">
                    <Scale className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold">1. ข้อตกลงทั่วไป</h2>
                </div>
                <div className="pl-14 space-y-3 text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">ข้อกำหนดและเงื่อนไขการใช้งาน (Terms of Service)</strong> เว็บแอปพลิเคชัน RMU-Campus X
                  </p>
                  <ul className="list-disc list-outside ml-4 space-y-1">
                    <li><strong className="text-foreground">การยอมรับ:</strong> เมื่อท่านลงทะเบียนหรือใช้งานแพลตฟอร์มนี้ ถือว่าท่านได้อ่าน เข้าใจ และยอมรับข้อกำหนดและเงื่อนไขทั้งหมดรวมถึงนโยบายความเป็นส่วนตัว</li>
                    <li><strong className="text-foreground">วัตถุประสงค์ของแพลตฟอร์ม:</strong> จัดทำเพื่อการแลกเปลี่ยน/แบ่งปันสิ่งของระหว่างนักศึกษาและบุคลากรภายในมหาวิทยาลัยเท่านั้น ไม่ใช่ช่องทางขายหรือแสวงหาผลกำไรในเชิงพาณิชย์</li>
                  </ul>
                </div>
              </section>

              {/* 2. คุณสมบัติของผู้ใช้งาน */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg shrink-0">
                    <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-semibold">2. คุณสมบัติของผู้ใช้งาน</h2>
                </div>
                <div className="pl-14 space-y-2 text-muted-foreground leading-relaxed">
                  <p>เพื่อความปลอดภัยและความน่าเชื่อถือของชุมชน ผู้ใช้ต้องมีคุณสมบัติดังนี้:</p>
                  <ul className="list-disc list-outside ml-4 space-y-1">
                    <li>เป็นนักศึกษา หรือ บุคลากร/อาจารย์ ของมหาวิทยาลัยราชภัฏมหาสารคาม</li>
                    <li>ลงทะเบียนและยืนยันตัวตนด้วยอีเมลโดเมน <code className="bg-muted px-1 rounded">@rmu.ac.th</code> เท่านั้น</li>
                    <li>ยืนยันอีเมล (Email Verification) ตามที่ระบบกำหนด</li>
                  </ul>
                  <p className="text-sm">การสมัครสมาชิกถือเป็นการยืนยันว่าท่านมีคุณสมบัติตามที่กำหนด</p>
                </div>
              </section>

              {/* 3. สิ่งของที่ห้ามโพสต์ */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg shrink-0">
                    <Ban className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-xl font-semibold">3. สิ่งของที่ห้ามโพสต์</h2>
                </div>
                <div className="pl-14 space-y-2 text-muted-foreground leading-relaxed">
                  <p>เพื่อความปลอดภัยและความเรียบร้อย <strong className="text-foreground">ห้ามลงประกาศสิ่งของต่อไปนี้โดยเด็ดขาด:</strong></p>
                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                    {[
                      "สิ่งของผิดกฎหมายทุกชนิด",
                      "ยาเสพติดและสิ่งมึนเมา",
                      "อาวุธและวัตถุอันตราย",
                      "สื่อลามกอนาจาร",
                      "สิ่งของที่ไม่ได้เป็นเจ้าของจริง",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-muted/30 p-2 rounded border text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm pt-2">การฝ่าฝืนจะถูกพิจารณาและอาจนำไปสู่การลบโพสต์ การเตือน หรือการระงับบัญชี</p>
                </div>
              </section>

              {/* 4. การปฏิบัติตนของสมาชิก */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg shrink-0">
                    <MessageSquareWarning className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h2 className="text-xl font-semibold">4. การปฏิบัติตนของสมาชิก</h2>
                </div>
                <div className="pl-14 space-y-2 text-muted-foreground leading-relaxed">
                  <p>ชุมชนของเราดำเนินไปด้วยความเคารพและความรับผิดชอบร่วมกัน ผู้ใช้ต้อง:</p>
                  <ul className="list-disc list-outside ml-4 space-y-1">
                    <li>ใช้ถ้อยคำสุภาพ ไม่ก่อความรำคาญ ไม่รังแก หรือคุกคามผู้อื่น (ทั้งในแชท และ การโพสต์)</li>
                    <li>ไม่ใช้ข้อมูลส่วนตัวของผู้อื่นในทางที่ผิด หรือแอบอ้างตัวตน</li>
                    <li>ปฏิบัติตามแนวทางของระบบ (เช่น ไม่สแปม ไม่โพสต์ซ้ำมากเกินไป)</li>
                  </ul>
                  <p><span className="text-red-600 dark:text-red-400 font-medium">ทางระบบมีสิทธิตรวจสอบและระงับบัญชีทันที</span> หากพบพฤติกรรมที่ไม่เหมาะสม หรือได้รับรายงานจากผู้ใช้ท่านอื่น</p>
                </div>
              </section>

              {/* 5. บัญชีและความปลอดภัย */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg shrink-0">
                    <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-xl font-semibold">5. บัญชีและความปลอดภัย</h2>
                </div>
                <div className="pl-14 space-y-2 text-muted-foreground leading-relaxed">
                  <ul className="list-disc list-outside ml-4 space-y-1">
                    <li>ท่านมีหน้าที่รักษาความลับของรหัสผ่านและไม่เปิดเผยให้ผู้อื่นใช้บัญชีของท่าน</li>
                    <li>หากสงสัยว่าบัญชีถูกใช้โดยไม่ได้รับอนุญาต กรุณาเปลี่ยนรหัสผ่านและแจ้งทีมงานผ่านเมนูช่วยเหลือ</li>
                    <li>การกระทำใดๆ ที่เกิดจากบัญชีของท่าน (หลังล็อกอิน) ถือเป็นความรับผิดชอบของท่าน</li>
                  </ul>
                </div>
              </section>

              {/* 6. การระงับและยกเลิกบัญชี */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg shrink-0">
                    <UserX className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h2 className="text-xl font-semibold">6. การระงับและยกเลิกบัญชี</h2>
                </div>
                <div className="pl-14 space-y-2 text-muted-foreground leading-relaxed">
                  <p>ทางผู้ให้บริการ (ผู้พัฒนา) ขอสงวนสิทธิ์:</p>
                  <ul className="list-disc list-outside ml-4 space-y-1">
                    <li><strong className="text-foreground">ออกคำเตือน</strong> — บันทึกเหตุผลและจำนวนคำเตือนสะสม ผู้ใช้ยังใช้งานได้ตามปกติ แต่จะเห็นข้อความแจ้งเตือนในระบบ และหากได้รับคำเตือนซ้ำอาจถูกระงับหรือแบนในขั้นถัดไป</li>
                    <li><strong className="text-foreground">ระงับบัญชีชั่วคราว</strong> — ผู้ใช้ยังล็อกอินได้ แต่จะไม่สามารถโพสต์ของ ขอแลกเปลี่ยน หรือแชทได้จนครบกำหนด ระบบจะแสดงวันที่ปลดระงับและปุ่มติดต่อทีมสนับสนุน</li>
                    <li><strong className="text-foreground">แบนถาวร</strong> — ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้อีก ระบบจะแสดงเหตุผลและแนะนำให้ติดต่อทีมสนับสนุนหากคิดว่าเป็นข้อผิดพลาด</li>
                    <li>ลบหรือแก้ไขเนื้อหาที่ไม่เหมาะสมโดยไม่ต้องแจ้งล่วงหน้า</li>
                    <li>ท่านสามารถยกเลิกบัญชีของท่านได้ผ่านการตั้งค่าในระบบ (ตามฟีเจอร์ที่ระบบรองรับ)</li>
                  </ul>
                </div>
              </section>

              {/* 7. ข้อจำกัดความรับผิด */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg shrink-0">
                    <Gavel className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-xl font-semibold">7. ข้อจำกัดความรับผิด</h2>
                </div>
                <div className="pl-14 p-4 bg-muted/30 rounded-lg border-l-4 border-purple-500 text-muted-foreground text-sm leading-relaxed space-y-2">
                  <p>RMU-Campus X เป็น <strong className="text-foreground">พื้นที่กลาง (platform)</strong> สำหรับการแลกเปลี่ยนข้อมูลระหว่างผู้ใช้ ทางผู้ให้บริการ <strong className="text-foreground">ไม่รับผิดชอบ</strong> ต่อความเสียหายใดๆ ที่เกิดจากการแลกเปลี่ยน การนัดพบ หรือการติดต่อระหว่างผู้ใช้</p>
                  <p>ท่านควร:</p>
                  <ul className="list-disc list-outside ml-4 space-y-1">
                    <li>ตรวจสอบสภาพสิ่งของและความน่าเชื่อถือของคู่แลกเปลี่ยนด้วยตนเองก่อนตกลง</li>
                    <li>นัดพบในที่สาธารณะและปลอดภัย และระมัดระวังเรื่องความปลอดภัยส่วนตัว</li>
                  </ul>
                </div>
              </section>

              <div className="pt-8 text-center text-sm text-muted-foreground">
                <p>ขอบคุณที่ใช้บริการ RMU-Campus X อย่างมีความรับผิดชอบ</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground/60">
          &copy; {new Date().getFullYear()} RMU-Campus X. All rights reserved.
        </div>
      </div>
    </div>
  )
}
