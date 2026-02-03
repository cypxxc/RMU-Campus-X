import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Package, MessageSquare, Shield, Users, Sparkles, Bell } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { BounceWrapper } from "@/components/ui/bounce-wrapper"
import { Logo } from "@/components/logo"
import { LandingHero3D } from "@/components/landing-hero-3d"
import { LandingStats } from "@/components/landing-stats"

const features = [
  {
    icon: Package,
    title: "โพสต์และขอรับสิ่งของ",
    description: "ลงประกาศสิ่งของที่ไม่ใช้แล้ว หรือค้นหาและขอรับจากเพื่อนนักศึกษา",
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    icon: MessageSquare,
    title: "แชทและนัดรับของ",
    description: "แชทในระบบกับเจ้าของ/ผู้ขอ แล้วนัดรับของในมหาวิทยาลัย",
    color: "text-green-500 bg-green-500/10",
  },
  {
    icon: Bell,
    title: "แจ้งเตือนผ่าน LINE",
    description: "ผูก LINE แล้วรับการแจ้งเตือนเมื่อมีคนสนใจของ ขอรับ แชท หรือเมื่อมีการแก้ไขโดยผู้ดูแล",
    color: "text-emerald-500 bg-emerald-500/10",
  },
  {
    icon: Shield,
    title: "ปลอดภัย มั่นใจ",
    description: "สมัครด้วยอีเมล @rmu.ac.th เท่านั้น รองรับรายงานและแนวทางชุมชน",
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    icon: Users,
    title: "ชุมชนนักศึกษา มรม.",
    description: "เฉพาะนักศึกษาและบุคลากร มหาวิทยาลัยราชภัฏมหาสารคาม",
    color: "text-purple-500 bg-purple-500/10",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* 3D Background - Client Component for interactivity */}
      <LandingHero3D />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="sm" href="/" />
          <div className="flex items-center gap-3">
            <ModeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">เข้าสู่ระบบ</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">สมัครสมาชิก</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative z-10">
        <BounceWrapper variant="bounce-in" className="container mx-auto text-center max-w-3xl">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            แพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษา มรม.
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6">
            แลกเปลี่ยนสิ่งของ
            <span className="text-primary block mt-2">ง่ายๆ ในมหาวิทยาลัย</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            โพสต์สิ่งของที่ไม่ใช้แล้ว ขอรับของจากเพื่อนนักศึกษา แชทและนัดรับของได้ในมหาวิทยาลัย
            มหาวิทยาลัยราชภัฏมหาสารคาม
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="w-full sm:w-auto gap-2 px-8 h-12 text-base font-bold shadow-lg">
                เริ่มใช้งาน
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 h-12 text-base font-bold">
                สมัครสมาชิก
              </Button>
            </Link>
          </div>
          
          {/* Stats – ข้อมูลจริงจากระบบ อัปเดตอัตโนมัติ */}
          <LandingStats />
        </BounceWrapper>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30 relative z-10">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">ทำไมต้อง RMU-Campus X?</h2>
            <p className="text-muted-foreground">ฟีเจอร์ที่ออกแบบมาเพื่อนักศึกษาและบุคลากร ม.ราชภัฏมหาสารคาม</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title} className="border-none shadow-soft bg-background/80 backdrop-blur">
                  <CardContent className="p-6 text-center">
                    <div className={`h-12 w-12 rounded-xl ${feature.color} flex items-center justify-center mx-auto mb-4`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 relative z-10">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">วิธีใช้งาน</h2>
            <p className="text-muted-foreground">3 ขั้นตอนง่ายๆ</p>
          </div>
          
          <div className="space-y-6">
            {[
              { step: 1, title: "สมัครด้วยอีเมล @rmu.ac.th", desc: "กรอกอีเมลนักศึกษา/บุคลากร แล้วยืนยันตัวตนผ่านอีเมล" },
              { step: 2, title: "โพสต์สิ่งของ หรือค้นหาแล้วขอรับ", desc: "ลงประกาศของที่ไม่ใช้ หรือค้นหาและกดขอรับของที่สนใจ" },
              { step: 3, title: "แชท นัดรับ และยืนยันแลกเปลี่ยน", desc: "แชทกับอีกฝ่าย นัดรับของในมหาวิทยาลัย แล้วกดยืนยันเมื่อรับของแล้ว" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground relative z-10">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">พร้อมเริ่มแลกเปลี่ยนแล้วหรือยัง?</h2>
          <p className="mb-8 opacity-90">สมัครด้วยอีเมล @rmu.ac.th ใช้งานฟรี ไม่มีค่าใช้จ่าย</p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="px-8 h-12 text-base font-bold">
              สมัครสมาชิก
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
