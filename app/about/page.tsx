import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, Heart, Users, Shield, Sparkles } from "lucide-react"
import { BounceWrapper } from "@/components/ui/bounce-wrapper"

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <BounceWrapper variant="bounce-in">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 transition-colors">
            เกี่ยวกับเรา
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-linear-to-r from-primary to-primary/60">
            RMU-Campus X คืออะไร?
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            แพลตฟอร์มกลางสำหรับนักศึกษามหาวิทยาลัยราชภัฏมหาสารคาม 
            เพื่อการแลกเปลี่ยน แบ่งปัน และสร้างสังคมที่ยั่งยืน
          </p>
        </div>
      </BounceWrapper>

      <div className="grid md:grid-cols-2 gap-8 mb-16">
        <BounceWrapper variant="bounce-up" delay={0.1}>
          <Card className="h-full border-none shadow-soft hover:shadow-md transition-shadow">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-3">เป้าหมายของเรา</h2>
              <p className="text-muted-foreground leading-relaxed">
                สร้างพื้นที่ที่ปลอดภัยและเชื่อถือได้สำหรับให้นักศึกษาสามารถหมุนเวียนสิ่งของที่ไม่ได้ใช้ 
                ลดภาระค่าใช้จ่าย และส่งเสริมวัฒนธรรมการแบ่งปันภายในรั้วมหาวิทยาลัย
              </p>
            </CardContent>
          </Card>
        </BounceWrapper>

        <BounceWrapper variant="bounce-up" delay={0.2}>
          <Card className="h-full border-none shadow-soft hover:shadow-md transition-shadow">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-secondary/20 flex items-center justify-center mb-6">
                <Heart className="h-8 w-8 text-secondary-foreground" />
              </div>
              <h2 className="text-xl font-bold mb-3">คุณค่าที่เรายึดถือ</h2>
              <p className="text-muted-foreground leading-relaxed">
                เราเชื่อในการแบ่งปัน ความซื่อสัตย์ และการช่วยเหลือเกื้อกูลกัน 
                ทุกการแลกเปลี่ยนไม่ใช่แค่การส่งต่อสิ่งของ แต่คือการส่งต่อน้ำใจ
              </p>
            </CardContent>
          </Card>
        </BounceWrapper>
      </div>

      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">ทำไมต้อง RMU-Campus X?</h2>
        <div className="grid sm:grid-cols-3 gap-6">
           {[
             { title: "ยืนยันตัวตนจริง", desc: "สมาชิกรืนยันตัวตนผ่านอีเมลมหาวิทยาลัย", icon: Users },
             { title: "ปลอดภัย", desc: "ระบบตรวจสอบและรายงานปัญหาที่รวดเร็ว", icon: Shield },
             { title: "ใช้งานง่าย", desc: "ออกแบบมาเพื่อประสบการณ์ที่ดีที่สุด", icon: Sparkles },
           ].map((item, i) => (
             <BounceWrapper key={i} variant="bounce-up" delay={0.3 + (i * 0.1)}>
               <Card className="border shadow-none h-full">
                 <CardContent className="p-6">
                   <item.icon className="h-8 w-8 text-primary mb-4" />
                   <h3 className="font-bold mb-2">{item.title}</h3>
                   <p className="text-sm text-muted-foreground">{item.desc}</p>
                 </CardContent>
               </Card>
             </BounceWrapper>
           ))}
        </div>
      </div>
    </div>
  )
}
