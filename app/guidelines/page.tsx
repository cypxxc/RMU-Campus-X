import Link from "next/link"
import { BookOpen, Handshake, AlertTriangle, ShieldCheck, Heart, UserPlus, MessageCircle, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const GUIDELINES_LAST_UPDATED = "4 กุมภาพันธ์ 2568"

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Content */}
        <Card className="border-none shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-8 pt-10">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              แนวทางชุมชน
            </CardTitle>
            <CardDescription className="text-base mt-2">
              RMU-Campus X — สำหรับนักศึกษาและบุคลากร มหาวิทยาลัยราชภัฏมหาสารคาม
            </CardDescription>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4 bg-muted/50 py-1.5 px-4 rounded-full w-fit mx-auto">
              <FileText className="w-4 h-4 shrink-0" />
              <span>อัปเดตล่าสุด: {GUIDELINES_LAST_UPDATED}</span>
            </div>
          </CardHeader>
          
          <Separator />

          <CardContent className="p-6 sm:p-10">
            <div className="space-y-10">
                
                {/* Introduction */}
                <section className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed text-center max-w-2xl mx-auto">
                    RMU-Campus X เป็นพื้นที่สำหรับแบ่งปันและแลกเปลี่ยนสิ่งของระหว่างนักศึกษาและบุคลากร มหาวิทยาลัยราชภัฏมหาสารคาม
                    เพื่อให้ชุมชนน่าอยู่และปลอดภัย เราขอความร่วมมือจากสมาชิกทุกท่านปฏิบัติตามแนวทางด้านล่าง.
                    การใช้งานอยู่ภายใต้ <Link href="/terms" className="text-primary hover:underline font-medium">ข้อกำหนดและเงื่อนไขการใช้งาน</Link> และ <Link href="/privacy" className="text-primary hover:underline font-medium">นโยบายความเป็นส่วนตัว</Link>
                  </p>
                </section>

                <div className="grid sm:grid-cols-2 gap-6">
                    {/* Do's */}
                    <Card className="border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-900/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                <Handshake className="w-5 h-5" />
                                สิ่งที่ควรทำ (Do's)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex gap-2">
                                <UserPlus className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                <span>ใช้ถ้อยคำสุภาพและให้เกียรติซึ่งกันและกัน</span>
                            </div>
                            <div className="flex gap-2">
                                <Heart className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                <span>แบ่งปันสิ่งของด้วยเจตนาดี ไม่หวังผลกำไร</span>
                            </div>
                            <div className="flex gap-2">
                                <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                <span>ตรวจสอบสภาพสิ่งของและบอกรายละเอียดตามจริง</span>
                            </div>
                            <div className="flex gap-2">
                                <MessageCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                <span>ตอบกลับข้อความแลกเปลี่ยนอย่างสม่ำเสมอ</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Don'ts */}
                    <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
                         <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                <AlertTriangle className="w-5 h-5" />
                                สิ่งที่ไม่ควรทำ (Don'ts)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex gap-2">
                                <span className="text-red-600 font-bold shrink-0">✕</span>
                                <span>ลงประกาศสิ่งของผิดกฎหมาย ละเมิดลิขสิทธิ์ หรือสิ่งของที่ห้ามโพสต์ตามข้อกำหนด</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-red-600 font-bold shrink-0">✕</span>
                                <span>ใช้ถ้อยคำหยาบคาย รุนแรง หรือคุกคามผู้อื่น (รวมถึงในแชทและการติดต่อ)</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-red-600 font-bold shrink-0">✕</span>
                                <span>นัดรับสิ่งของในที่เปลี่ยวหรือไม่ปลอดภัย</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-red-600 font-bold shrink-0">✕</span>
                                <span>สแปมประกาศ โพสต์ซ้ำ หรือส่งข้อความรบกวนผู้อื่น</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Section: Safety Guide */}
                 <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <ShieldCheck className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-xl font-semibold">ความปลอดภัยในการนัดรับ</h3>
                  </div>
                   <div className="bg-muted/30 rounded-xl p-6 space-y-4">
                        <p className="text-muted-foreground">การนัดรับเป็นวิธีแลกเปลี่ยนที่รวดเร็วและประหยัด แต่ต้องคำนึงถึงความปลอดภัยเป็นสำคัญ:</p>
                        <ul className="grid sm:grid-cols-2 gap-4">
                            <li className="flex items-start gap-3 bg-card p-4 rounded-lg border shadow-sm">
                                <div className="bg-primary/20 p-2 rounded-full text-primary font-bold text-xs">01</div>
                                <div className="text-sm">
                                    <strong className="block mb-1">นัดในที่สาธารณะ</strong>
                                    เช่น หน้าโรงอาหาร, ลานกิจกรรม, หรือหน้าตึกคณะ ในเวลากลางวัน
                                </div>
                            </li>
                             <li className="flex items-start gap-3 bg-card p-4 rounded-lg border shadow-sm">
                                <div className="bg-primary/20 p-2 rounded-full text-primary font-bold text-xs">02</div>
                                <div className="text-sm">
                                    <strong className="block mb-1">พาเพื่อนไปด้วย</strong>
                                    หากไม่มั่นใจ หรือต้องไปในที่ที่ไม่คุ้นเคย ควรชวนเพื่อนไปด้วยเสมอ
                                </div>
                            </li>
                             <li className="flex items-start gap-3 bg-card p-4 rounded-lg border shadow-sm">
                                <div className="bg-primary/20 p-2 rounded-full text-primary font-bold text-xs">03</div>
                                <div className="text-sm">
                                    <strong className="block mb-1">ตรวจสอบสิ่งของ</strong>
                                    เช็คสภาพสิ่งของให้เรียบร้อยก่อนแยกย้าย เพื่อความสบายใจทั้งสองฝ่าย
                                </div>
                            </li>
                             <li className="flex items-start gap-3 bg-card p-4 rounded-lg border shadow-sm">
                                <div className="bg-primary/20 p-2 rounded-full text-primary font-bold text-xs">04</div>
                                <div className="text-sm">
                                    <strong className="block mb-1">เชื่อสัญชาตญาณ</strong>
                                    หากรู้สึกไม่ปลอดภัย ให้ยกเลิกการนัดรับ หรือเปลี่ยนสถานที่ทันที
                                </div>
                            </li>
                        </ul>
                   </div>
                </section>

                {/* การรายงานและผลของการฝ่าฝืน */}
                <section className="pt-4">
                  <h3 className="text-lg font-semibold text-foreground mb-3">การรายงานและผลของการฝ่าฝืน</h3>
                  <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
                    <p>หากพบเห็นการกระทำที่ผิดกฎระเบียบหรือขัดกับแนวทางชุมชน โปรดใช้ปุ่ม <strong className="text-foreground">"รายงานปัญหา"</strong> บนหน้ารายการสิ่งของหรือในจุดที่ระบบกำหนด เพื่อให้ทีมงานพิจารณาต่อไป</p>
                    <p>การฝ่าฝืนแนวทางนี้อาจนำไปสู่ <strong className="text-foreground">การออกคำเตือน</strong> <strong className="text-foreground">การระงับบัญชีชั่วคราว</strong> หรือ <strong className="text-foreground">การแบนถาวร</strong> ตามที่ระบุใน <Link href="/terms" className="text-primary hover:underline font-medium">ข้อกำหนดและเงื่อนไขการใช้งาน</Link></p>
                  </div>
                </section>

                <div className="pt-8 text-center text-sm text-muted-foreground">
                  <p>ขอบคุณที่ร่วมสร้างชุมชนให้น่าอยู่</p>
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
