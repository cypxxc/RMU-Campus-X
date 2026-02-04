import { Lock, Eye, Database, Share2, ShieldAlert, FileText, Cookie, Server, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const PRIVACY_LAST_UPDATED = "4 กุมภาพันธ์ 2568"

export default function PrivacyPage() {

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Content */}
        <Card className="border-none shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-8 pt-10">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              นโยบายความเป็นส่วนตัว
            </CardTitle>
            <CardDescription className="text-base mt-2">
              RMU-Campus X — แพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษาและบุคลากร มหาวิทยาลัยราชภัฏมหาสารคาม
            </CardDescription>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4 bg-muted/50 py-1.5 px-4 rounded-full w-fit mx-auto">
              <FileText className="w-4 h-4 shrink-0" />
              <span>อัปเดตล่าสุด: {PRIVACY_LAST_UPDATED}</span>
            </div>
          </CardHeader>
          
          <Separator />

          <CardContent className="p-6 sm:p-10">
            <div className="space-y-10">
                
                {/* Introduction */}
                <section className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    RMU-Campus X ให้ความสำคัญกับความเป็นส่วนตัวของคุณอย่างสูงสุด นโยบายนี้อธิบายถึงวิธีการที่เราเก็บรวบรวม 
                    ใช้ และปกป้องข้อมูลส่วนบุคคลของคุณในขณะที่คุณใช้งานแพลตฟอร์มของเรา
                  </p>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                      <h4 className="text-sm font-semibold text-foreground">หลัก PAPA ในการพัฒนาระบบ</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      เราใช้กรอบจริยธรรมสารสนเทศ PAPA (Privacy, Accuracy, Property, Accessibility) ในการออกแบบและให้บริการ:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-none">
                      <li><span className="font-medium text-foreground">P — Privacy:</span> เก็บ/ใช้/เปิดเผยข้อมูลตามนโยบายนี้ มี consent และสิทธิ์ลบข้อมูล</li>
                      <li><span className="font-medium text-foreground">A — Accuracy:</span> ตรวจสอบข้อมูล (ยืนยันอีเมล, validation)</li>
                      <li><span className="font-medium text-foreground">P — Property:</span> ข้อมูลที่คุณสร้างเป็นของคุณ ลบบัญชีได้ตลอดเวลา</li>
                      <li><span className="font-medium text-foreground">A — Accessibility:</span> เข้าถึงระบบได้เฉพาะผู้มีอีเมล @rmu.ac.th</li>
                    </ul>
                  </div>
                </section>

                {/* Section 1 */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold">1. ข้อมูลที่เราเก็บรวบรวม</h3>
                  </div>
                  <div className="pl-14 space-y-2 text-muted-foreground">
                    <p>เราเก็บรวบรวมข้อมูล:</p>
                    <ul className="list-disc list-outside ml-4 space-y-1">
                      <li><span className="font-medium text-foreground">ข้อมูลบัญชี:</span> ชื่อที่แสดง, อีเมล (@rmu.ac.th), รูปโปรไฟล์</li>
                      <li><span className="font-medium text-foreground">ข้อมูลการใช้งาน:</span> ประวัติการโพสต์ (รายการสิ่งของ), การแลกเปลี่ยน</li>
                    </ul>
                  </div>
                </section>

                {/* Section 2 */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Eye className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold">2. การใช้ข้อมูลของคุณ</h3>
                  </div>
                  <div className="pl-14 space-y-2 text-muted-foreground">
                     <p>เราใช้ข้อมูลของคุณเพื่อ:</p>
                     <div className="grid sm:grid-cols-2 gap-3 mt-3">
                      {[
                        "ยืนยันตัวตนว่าเป็นนักศึกษาและบุคลากร RMU",
                        "จัดการรายการสิ่งของและการแลกเปลี่ยน",
                        "ส่งแจ้งเตือนที่สำคัญ"
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 bg-muted/30 p-2 rounded border text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Section 3 */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <Share2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-xl font-semibold">3. การเปิดเผยข้อมูล</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-14">
                    เรา <span className="text-red-500 font-medium">ไม่ขาย</span> ข้อมูลส่วนบุคคลของคุณให้กับบุคคลภายนอก 
                    ข้อมูลของคุณจะถูกเปิดเผยเฉพาะกับคู่กรณีในการแลกเปลี่ยน เมื่อการแลกเปลี่ยนได้รับการยืนยันแล้วเท่านั้น
                  </p>
                </section>

                {/* Section 4 */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <ShieldAlert className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold">4. ความปลอดภัยของข้อมูล</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-14">
                    เราใช้มาตรการความปลอดภัยมาตรฐานอุตสาหกรรม (Firebase Authentication & Security Rules) เพื่อปกป้องข้อมูลของคุณจากการเข้าถึงโดยไม่ได้รับอนุญาต
                  </p>
                </section>

                 {/* Section 5 */}
                 <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                      <Cookie className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                    </div>
                    <h3 className="text-xl font-semibold">5. บันทึกและคุกกี้</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-14">
                    เราใช้คุกกี้เพื่อจดจำสถานะการเข้าสู่ระบบและการตั้งค่าของคุณ เพื่อให้คุณใช้งานเว็บไซต์ได้อย่างต่อเนื่อง
                  </p>
                </section>

                 {/* Section 6 */}
                 <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Server className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold">6. การลบบัญชีและข้อมูล</h3>
                  </div>
                  <div className="pl-14 p-4 bg-muted/30 rounded-lg border-l-4 border-gray-500 text-muted-foreground text-sm leading-relaxed">
                    คุณมีสิทธิ์ในการลบบัญชีผู้ใช้และข้อมูลส่วนตัวของคุณออกจากระบบได้ตลอดเวลา ผ่านเมนูตั้งค่าในหน้าโปรไฟล์ 
                    เมื่อทำการลบแล้ว ข้อมูลจะไม่สามารถกู้คืนได้
                  </div>
                </section>
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
