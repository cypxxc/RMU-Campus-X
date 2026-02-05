# แนวทาง Flow จากเว็บไซต์อื่น และการปรับใช้กับ RMU-Campus X

เอกสารนี้รวบรวมแนวทาง **transaction flow** จากแพลตฟอร์ม marketplace / แลกเปลี่ยนสิ่งของชั้นนำ (Dittofi, Sharetribe, Carousell, Airbnb) และเปรียบเทียบกับระบบ RMU-Campus X พร้อมข้อเสนอแนะการปรับใช้

---

## 1. แนวทางจากเว็บไซต์อื่น

### 1.1 สรุปหลักสำคัญ (จาก Dittofi, Sharetribe)

| หลักการ | รายละเอียด |
|--------|------------|
| **Liquidity ไม่ใช่ User count** | เมตริกที่สำคัญคือ “ความน่าจะเป็นที่การแลกเปลี่ยนจะเกิดขึ้น” ไม่ใช่จำนวนผู้สมัคร |
| **Transaction flow = Value proposition** | flow การแลกเปลี่ยนคือหัวใจของแพลตฟอร์ม ลด friction = เพิ่ม transactions |
| **3 ขั้นตอนหลัก** | (1) ผู้ใช้เริ่ม transaction (2) การโอนค่า/สินค้า (3) Two-sided reviews |
| **Checkout ควรสั้นและชัดเจน** | ลดขั้นตอนให้น้อยที่สุด; ถ้าไม่จำเป็นก็ไม่ต้องมีตะกร้า (เช่น Airbnb) |
| **State machine ชัดเจน** | แต่ละ state มี transitions ที่อนุญาตเท่านั้น ป้องกันการข้ามขั้นตอน |

### 1.2 Flow ตัวอย่าง (Airbnb-style จาก Dittofi)

```
Initial → Inquiry/Payment Request → Payment Required → Preauthorized
    → Accepted (หรือ Declined) → Delivered → Reviewed
```

**States:**
- **Initial**: ยังไม่มีการติดต่อ
- **Inquiry**: ส่งคำถามก่อน
- **Payment Required**: รอชำระเงิน
- **Preauthorized**: ชำระแล้ว รอผู้ให้บริการยืนยัน
- **Accepted / Declined**: ยืนยันหรือปฏิเสธ
- **Delivered**: บริการ/สินค้าส่งแล้ว
- **Reviewed**: รีวิวแล้ว

### 1.3 แนวทางจาก Sharetribe

- **Request-based flow** (เหมาะกับแลกเปลี่ยน/บริการ):
  1. Customer ส่งคำขอ (หรือจอง)
  2. Provider ยืนยันหรือปฏิเสธ
  3. Payment (ถ้ามี) เกิดขึ้นหลังการยืนยัน
- **Preauthorization**: เก็บข้อมูลการชำระเงิน แต่ยังไม่ตัดเงิน จนกว่า provider จะยืนยัน

### 1.4 แนวทางจาก Carousell (Classified / แลกเปลี่ยนของใช้แล้ว)

- **Sell flow**: ถ่ายรูป → กรอกฟอร์ม → โพสต์ (ประมาณ 30 วินาที)
- **Chat**: ช่องทางหลักในการต่อรองและตกลง
- **Pain points**: onboarding สับสน, แชทหลายรายการติดตามยาก

### 1.5 สิ่งที่ควรมีใน marketplace

| มิติ | แนวทาง |
|-----|--------|
| **Discovery** | หมวดหมู่ชัด, ค้นหา, filter, sort |
| **Trust** | Reviews, verified badges, นโยบายที่ชัดเจน |
| **Transaction** | State machine ชัดเจน, notifications ทุก transition |
| **Post-transaction** | Two-sided reviews หลังส่งมอบจริง |

---

## 2. Flow ปัจจุบันของ RMU-Campus X

### 2.1 Exchange State Machine

```
                    ┌─────────────┐
                    │   pending   │  ← Requester สร้างคำขอ
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ accepted │     │ rejected │     │cancelled │
   └────┬─────┘     └──────────┘     └──────────┘
        │               (terminal)       (terminal)
        ▼
   ┌─────────────┐
   │ in_progress │  ← Owner หรือ Requester กด "เริ่มดำเนินการ"
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  completed  │  ← ทั้งสองฝ่ายยืนยันเสร็จ (ownerConfirmed + requesterConfirmed)
   └─────────────┘
        (terminal)
```

**Transitions ที่อนุญาต:**

| จาก | ไปได้ |
|-----|-------|
| pending | accepted, rejected, cancelled |
| accepted | in_progress, cancelled |
| in_progress | completed, cancelled |
| completed | — (terminal) |
| cancelled | — (terminal) |
| rejected | — (terminal) |

### 2.2 User Journeys ปัจจุบัน

| ขั้นตอน | ผู้ทำ | การกระทำ |
|---------|-------|----------|
| 1 | Requester | ดูรายการ → กด "ขอรับของ" → สร้าง exchange (pending) |
| 2 | Owner | ได้รับแจ้งเตือน → ตอบรับ (accepted) หรือปฏิเสธ (rejected) |
| 3 | Owner/Requester | กด "เริ่มดำเนินการ" → in_progress |
| 4 | Owner + Requester | แต่ละฝ่ายกด "ยืนยันเสร็จสิ้น" → completed (เมื่อทั้งสองกดแล้ว) |
| 5 | Owner/Requester | สามารถยกเลิกได้เมื่อ pending, accepted, in_progress |

### 2.3 สิ่งที่ระบบมีอยู่แล้วและสอดคล้องกับแนวทาง

| แนวทาง | สถานะใน RMU-Campus X |
|--------|----------------------|
| State machine ชัดเจน | มี `validateTransition`, `VALID_TRANSITIONS` |
| Request → Accept/Reject | มี flow ชัดเจน |
| Chat เป็นช่องทางหลัก | มีแชทเว็บ + LINE |
| Notifications ทุก transition | มีแจ้งเตือนเมื่อมีคำขอ, ตอบรับ/ปฏิเสธ, สถานะเปลี่ยน |
| Reviews | มีระบบ reviews หลังแลกเปลี่ยนเสร็จ |
| ลด friction ในการขอรับ | ไม่ต้องชำระเงิน; ขอรับด้วยคลิกเดียว |

---

## 3. ข้อเสนอแนะการปรับใช้

### 3.1 สิ่งที่ทำได้ดีอยู่แล้ว (ไม่ต้องเปลี่ยนหลักการ)

- State machine ใช้ได้ดี มี validation ชัดเจน
- Flow การขอรับ → ตอบรับ → เริ่มดำเนินการ → ยืนยันเสร็จ → completed สอดคล้องกับแนวทาง marketplace
- มีแชทและ LINE แจ้งเตือนครบ

### 3.2 ปรับปรุงที่แนะนำ (ดำเนินการแล้ว ✅)

#### A. ทำให้ transition ระหว่าง `accepted` → `in_progress` ชัดเจนขึ้น ✅

**ปัญหา:** ผู้ใช้บางคนอาจไม่เข้าใจความต่างระหว่าง “ตอบรับแล้ว” กับ “กำลังดำเนินการ”

**แนวทาง:**
- ใช้ข้อความ/ปุ่มที่สื่อความหมายชัด เช่น  
  - accepted: “เตรียมพบกันหรือส่งของ”
  - in_progress: “กำลังส่งมอบ/รับของ”
- แสดงขั้นตอนเป็น step-by-step (1. ตอบรับแล้ว → 2. กำลังดำเนินการ → 3. เสร็จสิ้น)
- **Implement:** ปุ่ม accepted="เริ่มดำเนินการ", in_progress="ยืนยันส่งมอบ/รับแล้ว", ExchangeStepIndicator ในหน้าแชท

#### B. ปรับ UX การยืนยันเสร็จ (completed)

**แนวทางจาก marketplace อื่น:** บางแห่งใช้ “ผู้รับยืนยันได้รับของแล้ว” เป็นจุดจบ

**ใน RMU-Campus X:** ใช้ “ทั้งสองฝ่ายกดยืนยัน” ซึ่งเหมาะกับระบบแลกเปลี่ยนแบบ face-to-face อยู่แล้ว

**ข้อเสนอ:** แสดงสถานะว่า “รออีกฝ่ายยืนยัน” เพื่อลดความสับสน

#### C. Two-sided reviews

**แนวทาง:** รีวิวควรทำได้เฉพาะหลัง `completed` และใช้ double-blind ถ้าเป็นไปได้ (ทั้งสองฝ่ายรีวิวก่อน แล้วค่อยเผยพร้อมกัน)

**ตรวจสอบ:** ระบบปัจจุบันเปิดให้รีวิวได้เมื่อไหร่ และมีขั้นตอนอย่างไร

#### D. Discovery & Trust

- หมวดหมู่, filter, ค้นหา — มีอยู่แล้ว
- Reviews, ratings — มีอยู่แล้ว
- ขยายได้: verified badges ถ้ามีการยืนยันตัวตน

### 3.3 Flow Diagram สรุป (แนะนำ)

```
[Requester] ดูรายการ → ขอรับของ
        ↓
    [pending]
        ↓
[Owner] ตอบรับ / ปฏิเสธ / [Requester] ยกเลิก
        ↓ (ตอบรับ)
    [accepted]
        ↓
[Owner/Requester] เริ่มดำเนินการ (นัดหมาย/ส่งของ)
        ↓
   [in_progress]
        ↓
[Owner + Requester] ยืนยันเสร็จทั้งคู่
        ↓
   [completed] → รีวิวกันได้
```

---

## 4. สรุปการจัดทำเอกสาร Flow

แนะนำให้มีเอกสาร flow แยกตามประเภทผู้ใช้:

1. **Flow diagram** — exchange state machine (ใช้ diagram ข้างต้น)
2. **User journey** — ขั้นตอนที่ Requester และ Owner ต้องทำในแต่ละ state
3. **API / State transitions** — ตาราง transitions และเงื่อนไข (เช่น ใครเปลี่ยนได้บ้าง)
4. **Notification triggers** — เมื่อไหร่ควรแจ้งเตือน (สร้างคำขอ, ตอบรับ, เปลี่ยนสถานะ, เสร็จสิ้น)

---

## 5. อ้างอิง

- [Dittofi: How to design a two-sided marketplace transaction flow](https://www.dittofi.com/learn/how-to-design-a-two-sided-marketplace-transaction-flow)
- [Sharetribe Academy: How to design your marketplace transaction flow](https://sharetribe.com/academy/how-to-design-your-marketplaces-transaction-flow)
- [Sharetribe: Your user journey – A guide](https://sharetribe.com/docs/design-toolkit/your-user-journey-a-guide)
- [Carousell UX Case Study](https://medium.com/design-bootcamp/can-you-sell-on-carousell-a-ux-case-study-on-singapores-top-classifieds-platform-4a02a9b7546c)
- [Baymard: Checkout UX Research](https://baymard.com/blog/checkout-usability)
