# Checklist: การจัดวาง, Visual Hierarchy, Bento Box

ตรวจตามหลัก 3 ข้อ — จุดที่สมบูรณ์แล้ว ✅ และจุดที่ยังไม่สมบูรณ์ ⚠️

---

## 1. การจัดวางและพื้นที่ว่าง (Layout & White Space)

### หน้า Landing (/)
| จุด | สถานะ | หมายเหตุ |
|-----|--------|----------|
| พื้นที่ว่างระหว่าง section | ✅ | ใช้ `py-24` สม่ำเสมอ |
| ความกว้างเนื้อหาจำกัด (max-width) | ✅ | Hero max-w-3xl, Features max-w-5xl, CTA max-w-2xl |
| ช่องว่างใน Hero | ✅ | pt-36 pb-24, mb-10 ใต้ข้อความ |
| ช่องว่างระหว่างการ์ด Features | ✅ | gap-6 |
| ช่องว่างใน CTA | ✅ | py-24, mb-8 ก่อนปุ่ม |

### หน้า Dashboard (/dashboard)
| จุด | สถานะ | หมายเหตุ |
|-----|--------|----------|
| Hero บรรทัดเดียว | ✅ | space-y-2, max-w-lg |
| ระยะ main content | ✅ | py-6 sm:py-8, gap-6 ระหว่าง sidebar กับ grid |
| Grid รายการ | ✅ | gap-4 sm:gap-6 |
| ระยะใต้ Results header | ✅ | ปรับเป็น mb-8 แล้ว |

### Footer
| จุด | สถานะ | หมายเหตุ |
|-----|--------|----------|
| พื้นที่ว่าง | ✅ | py-12 sm:py-14, gap-10 sm:gap-12, mt-10 sm:mt-12 ก่อน copyright |

---

## 2. Visual Hierarchy (ลำดับความสำคัญด้วยขนาด/สี)

### หน้า Landing
| จุด | สถานะ | หมายเหตุ |
|-----|--------|----------|
| H1 ใหญ่กว่า H2 | ✅ | H1: text-4xl→6xl, H2: text-2xl→3xl |
| H2 ใหญ่กว่า body | ✅ | ข้อความใช้ text-muted-foreground, text-sm/lg |
| สีเน้นหัวข้อหลัก | ✅ | "ง่ายๆ ในมหาวิทยาลัย" ใช้ primary gradient |
| Badge / สรุปส่วน | ✅ | Badge มี border-primary/30, text-primary |
| คำอธิบายใต้หัวข้อ section | ✅ | ปรับเป็น text-sm แล้ว (ทำไมต้อง RMU-Campus X, วิธีใช้งาน) |

### หน้า Dashboard
| จุด | สถานะ | หมายเหตุ |
|-----|--------|----------|
| H1 หน้าหลัก | ✅ | ปรับเป็น text-3xl sm:text-4xl + py-10 sm:py-14 แล้ว |
| สถานะผลลัพธ์ / secondary | ✅ | "ทั้งหมด X รายการ" ใช้ text-sm text-muted-foreground |

### Footer
| จุด | สถานะ | หมายเหตุ |
|-----|--------|----------|
| ลิงก์นโยบาย | ✅ | เพิ่ม label "นโยบายและความปลอดภัย" (text-xs uppercase) ข้างบนลิงก์แล้ว |

---

## 3. Bento Box Design (จัดเป็นช่อง/กล่อง ดูเป็นระเบียบทันสมัย)

### หน้า Landing
| จุด | สถานะ | หมายเหตุ |
|-----|--------|----------|
| Features เป็นการ์ดกล่อง | ✅ | Card + rounded-2xl, shadow-soft |
| Stats เป็นกล่องเดียว | ✅ | กล่องเดียวมีตัวเลข 3 ช่อง + divider |
| Features Bento | ✅ | การ์ดแรก (โพสต์และขอรับสิ่งของ) ใหญ่ 1 ช่อง (lg:col-span-2) บน desktop + layout แนวนอนในการ์ดใหญ่ |

### หน้า Dashboard
| จุด | สถานะ | หมายเหตุ |
|-----|--------|----------|
| Grid รายการเป็นระเบียบ | ✅ | grid-cols-1 sm:2 xl:3 |
| ⚠️ ทุกการ์ดเท่ากัน | พอใช้ | เป็น list สม่ำเสมอถูกต้อง แต่ถ้าต้องการ Bento สไตล์อาจมีแถว "แนะนำ" 1 รายการใหญ่ + 2 รายการเล็ก แล้วค่อย grid ปกติ (เป็นไอเดียต่อยอด) |

---

## สรุปการแก้ไขที่ทำแล้ว

1. **Landing – Bento Features**  
   ✅ การ์ดแรกใช้ `lg:col-span-2` และบน desktop แสดงเป็นแถว (ไอคอนซ้าย ข้อความขวา) ส่วนการ์ดอื่น 4 ช่องเท่ากัน

2. **Landing – Hierarchy คำอธิบาย section**  
   ✅ คำอธิบายใต้ "ทำไมต้อง RMU-Campus X?" และ "วิธีใช้งาน" ใช้ `text-sm`

3. **Dashboard – Hero H1**  
   ✅ H1 เป็น text-3xl sm:text-4xl, Hero ใช้ py-10 sm:py-14 และ space-y-3

4. **Dashboard – ระยะใต้ Results header**  
   ✅ ใช้ mb-8

5. **Footer – Hierarchy ลิงก์**  
   ✅ เพิ่ม label "นโยบายและความปลอดภัย" (text-xs uppercase) เหนือลิงก์

---

จุดที่ยังเป็นไอเดียต่อยอด (ไม่บังคับ):

- **Dashboard**: แถว "แนะนำ" แบบ Bento (1 รายการใหญ่ + 2 เล็ก) ก่อน grid ปกติ — ต้องมี logic เลือกรายการแนะนำ
- **หน้าอื่น**: ใช้หลักเดียวกัน (white space, hierarchy, bento) ตรวจได้จาก checklist ด้านบน

ไฟล์นี้ใช้เป็นแนวทางตรวจและปรับ UI ต่อได้
