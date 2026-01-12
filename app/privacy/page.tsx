import { ShieldCheck } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary/10 rounded-full text-primary">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">นโยบายความเป็นส่วนตัว</h1>
          <p className="text-muted-foreground">RMU-Campus X ให้ความสำคัญกับข้อมูลส่วนบุคคลของคุณ</p>
        </div>
      </div>
      
      <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none bg-card p-6 sm:p-8 rounded-xl border shadow-sm space-y-8">
        <section>
          <h3>1. ข้อมูลที่เราเก็บรวบรวม</h3>
          <p>เราเก็บรวบรวมข้อมูลเพื่อให้บริการที่ดีที่สุดแก่คุณ:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>ข้อมูลบัญชี:</strong> ชื่อ, อีเมล (จาก Google/RMU email), รูปโปรไฟล์</li>
            <li><strong>ข้อมูลการใช้งาน:</strong> ประวัติการโพสต์, การแลกเปลี่ยน, และการแชท</li>
            <li><strong>ข้อมูลทางเทคนิค:</strong> IP Address, Browser ที่ใช้ (เพื่อความปลอดภัย)</li>
          </ul>
        </section>

        <section>
          <h3>2. การใช้ข้อมูลของคุณ</h3>
          <p>เราใช้ข้อมูลเพื่อ:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>ยืนยันตัวตนว่าคุณคือนักศึกษา RMU จริง</li>
            <li>อำนวยความสะดวกในการติดต่อสื่อสารระหว่างผู้ให้และผู้รับ</li>
            <li>ปรับปรุงประสิทธิภาพและความปลอดภัยของระบบ</li>
            <li>ป้องกันการฉ้อโกงและการใช้งานผิดวัตถุประสงค์</li>
          </ul>
        </section>

        <section>
          <h3>3. การเปิดเผยข้อมูล</h3>
          <p>
            เรา <strong>ไม่</strong> ขายข้อมูลส่วนตัวของคุณให้แก่บุคคลภายนอก ข้อมูลบางส่วน (เช่น ชื่อ, รูปโปรไฟล์) 
            จะถูกแสดงให้ผู้ใช้ท่านอื่นเห็นเพื่อการใช้งานระบบแลกเปลี่ยนเท่านั้น
          </p>
        </section>

        <section>
          <h3>4. สิทธิ์ของคุณ</h3>
          <p>คุณมีสิทธิ์ในการ:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>เข้าถึงและแก้ไขข้อมูลส่วนตัวของคุณได้ตลอดเวลาผ่านหน้าโปรไฟล์</li>
            <li>ขอลบข้อมูลบัญชีถาวร (Delete Account) ได้ผ่านเมนูการตั้งค่า</li>
            <li>สอบถามเกี่ยวกับข้อมูลที่เราเก็บรักษาไว้</li>
          </ul>
        </section>

        <div className="mt-8 pt-8 border-t text-sm text-muted-foreground">
          หากมีข้อสงสัยเกี่ยวกับนโยบายความเป็นส่วนตัว สามารถติดต่อได้ที่ <a href="mailto:contact@rmu.ac.th" className="text-primary hover:underline">contact@rmu.ac.th</a>
        </div>
      </div>
    </div>
  )
}
