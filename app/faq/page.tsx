import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { HelpCircle } from "lucide-react"

export default function FAQPage() {
  const faqs = [
    {
      question: "ใครสามารถใช้งาน RMU-Campus X ได้บ้าง?",
      answer: "เฉพาะนักศึกษาและบุคลากรของมหาวิทยาลัยราชภัฏมหาสารคามที่มีอีเมล @rmu.ac.th เท่านั้นที่สามารถสมัครสมาชิกและใช้งานได้"
    },
    {
      question: "การแลกเปลี่ยนมีค่าใช้จ่ายหรือไม่?",
      answer: "ไม่มีค่าใช้จ่ายในการลงประกาศหรือขอรับสิ่งของ แต่อาจมีค่าใช้จ่ายในการจัดส่งหากตกลงกันเอง ผู้ใช้งานควรนัดรับของในสถานที่ที่ปลอดภัยภายในมหาวิทยาลัยจะดีที่สุด"
    },
    {
      question: "จะลงประกาศสิ่งของได้อย่างไร?",
      answer: "เมื่อเข้าสู่ระบบแล้ว ให้กดปุ่ม 'โพสต์สิ่งของ' (เครื่องหมาย +) ที่แถบเมนู กรอกรายละเอียด ถ่ายรูป และกดโพสต์ได้ทันที"
    },
    {
      question: "ถ้าเจอสิ่งของผิดกฎหมายหรือผู้ใช้งานที่ไม่เหมาะสมต้องทำอย่างไร?",
      answer: "สามารถกดปุ่ม 'รายงาน' ที่หน้าสิ่งของหรือหน้าโปรไฟล์ของผู้ใช้นั้นๆ เพื่อแจ้งให้ทีมงานตรวจสอบได้ทันที"
    },
    {
      question: "ลืมรหัสผ่านทำอย่างไร?",
      answer: "สามารถกดที่ 'ลืมรหัสผ่าน?' ในหน้าเข้าสู่ระบบ กรอกอีเมลของคุณ และระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปทางอีเมล"
    },
    {
      question: "สามารถลบบัญชีผู้ใช้ถาวรได้หรือไม่?",
      answer: "ได้ โดยไปที่หน้า โปรไฟล์ > ตั้งค่า > พื้นที่อันตราย แล้วเลือก 'ลบบัญชี' (โปรดระวัง ข้อมูลทั้งหมดจะหายไปและกู้คืนไม่ได้)"
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-4">
          <HelpCircle className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold mb-2">FAQ</h1>
        <p className="text-muted-foreground">คำถามและคำตอบเกี่ยวกับการใช้งาน</p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-2">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4 bg-card shadow-xs">
            <AccordionTrigger className="text-left font-medium hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
