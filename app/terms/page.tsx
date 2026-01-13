import Link from "next/link"
import { ShieldCheck, UserCheck, Ban, MessageSquareWarning, Scale, Gavel, FileText, ChevronLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function TermsPage() {
  const lastUpdated = new Date().toLocaleDateString('th-TH', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation */}
        <div>
          <Link href="/">
            <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all">
              <ChevronLeft className="h-4 w-4" />
              กลับสู่หน้าหลัก
            </Button>
          </Link>
        </div>

        {/* Main Content */}
        <Card className="border-none shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-8 pt-10">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              ข้อกำหนดและเงื่อนไขการใช้งาน
            </CardTitle>
            <CardDescription className="text-base mt-2">
              RMU-Campus X Platform
            </CardDescription>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4 bg-muted/50 py-1.5 px-4 rounded-full w-fit mx-auto">
              <FileText className="w-4 h-4" />
              <span>อัปเดตล่าสุด: {lastUpdated}</span>
            </div>
          </CardHeader>
          
          <Separator />

          <CardContent className="p-0">
            <ScrollArea className="h-[600px] p-6 sm:p-10">
              <div className="space-y-10 pr-4">
                
                {/* Section 1 */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Scale className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold">1. ข้อตกลงทั่วไป</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-14">
                    ยินดีต้อนรับสู่ RMU-Campus X การใช้งานแพลตฟอร์มนี้ถือว่าท่านยอมรับข้อกำหนดและเงื่อนไขทั้งหมดที่ระบุไว้
                    หากท่านไม่ยอมรับเงื่อนไขเหล่านี้ กรุณาระงับการใช้งานทันที แพลตฟอร์มนี้จัดทำขึ้นเพื่อการแลกเปลี่ยนแบ่งปันภายในมหาวิทยาลัยเท่านั้น
                  </p>
                </section>

                {/* Section 2 */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold">2. คุณสมบัติของผู้ใช้งาน</h3>
                  </div>
                  <div className="pl-14 space-y-2 text-muted-foreground">
                    <p>เพื่อให้สังคมของเราปลอดภัยและน่าเชื่อถือ ผู้ใช้งานต้องมีคุณสมบัติดังนี้:</p>
                    <ul className="list-disc list-outside ml-4 space-y-1">
                      <li>เป็นนักศึกษาหรือบุคลากรของมหาวิทยาลัยราชภัฏมหาสารคาม</li>
                      <li>ยืนยันตัวตนด้วยอีเมลโดเมน <code>@rmu.ac.th</code> เท่านั้น</li>
                    </ul>
                  </div>
                </section>

                {/* Section 3 */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <Ban className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-xl font-semibold">3. กฎระเบียบเกี่ยวกับสิ่งของ</h3>
                  </div>
                  <div className="pl-14 space-y-2 text-muted-foreground">
                    <p>เพื่อความปลอดภัยและความเรียบร้อย ห้ามลงประกาศสิ่งของต่อไปนี้:</p>
                    <div className="grid sm:grid-cols-2 gap-3 mt-3">
                      {[
                        "สิ่งของผิดกฎหมายทุกชนิด",
                        "ยาเสพติดและสิ่งมึนเมา",
                        "อาวุธและวัตถุอันตราย",
                        "สื่อลามกอนาจาร",
                        "สินค้าละเมิดลิขสิทธิ์",
                        "สิ่งของที่ไม่ได้เป็นเจ้าของจริง"
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 bg-muted/30 p-2 rounded border text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Section 4 */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <MessageSquareWarning className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-xl font-semibold">4. การปฏิบัติตนของสมาชิก</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-14">
                    สังคมของเราอยู่ได้ด้วยความเคารพซึ่งกันและกัน ต้องใช้ถ้อยคำสุภาพ ไม่ก่อความรำคาญ รังแก หรือคุกคามผู้อื่น 
                    ทางเรามีระบบตรวจสอบและ <span className="text-red-500 font-medium">ระงับบัญชีทันที</span> หากตรวจพบพฤติกรรมที่ไม่เหมาะสม
                  </p>
                </section>

                {/* Section 5 */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <Gavel className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold">5. การปฏิเสธความรับผิด</h3>
                  </div>
                  <div className="pl-14 p-4 bg-muted/30 rounded-lg border-l-4 border-purple-500 text-muted-foreground text-sm leading-relaxed">
                    RMU-Campus X เป็นเพียงพื้นที่กลางในการแลกเปลี่ยนข้อมูล ทางเราไม่รับผิดชอบต่อความเสียหายใดๆ ที่เกิดจากการแลกเปลี่ยน 
                    ผู้ใช้งานควรตรวจสอบสภาพสิ่งของและความปลอดภัยด้วยตนเองก่อนตกลงแลกเปลี่ยน นัดพบในที่สาธารณะ และระมัดระวังเสมอ
                  </div>
                </section>

                <div className="pt-8 text-center text-sm text-muted-foreground">
                  <p>หากมีข้อสงสัยเพิ่มเติม สามารถติดต่อทีมงานผ่านเมนูช่วยเหลือ</p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-muted-foreground/60">
          &copy; {new Date().getFullYear()} RMU-Campus X. All rights reserved.
        </div>
      </div>
    </div>
  )
}
