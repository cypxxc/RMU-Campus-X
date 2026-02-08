# Checklist: ประสบการณ์ผู้ใช้งาน (UX)

ตรวจตามหลัก 3 ข้อ — Navigation, Responsive, ความเร็วในการโหลด

---

## 1. Navigation ที่เรียบง่าย (เมนูหลักไม่เกิน 5–7 เมนู, หาข้อมูลได้ภายในไม่กี่คลิก)

### สถานะปัจจุบัน ✅

| จุด | สถานะ | รายละเอียด |
|-----|--------|------------|
| จำนวนเมนูหลัก (หลังล็อกอิน) | ✅ | **4 เมนู**: หน้าหลัก, โปรไฟล์, การแลกเปลี่ยน, รายการโปรด (อยู่ในช่วง 5–7) |
| เมนูเสริม | ✅ | คำร้องของฉัน (แสดงเมื่อมีคำร้อง), ช่วยเหลือ, โพสต์สิ่งของ, Admin (เฉพาะแอดมิน) — เป็น action/ยูทิลิตี้ ไม่นับเป็นเมนูหลักเกิน |
| การเข้าถึงภายในไม่กี่คลิก | ✅ | หน้าหลัก → รายการ → ดูรายละเอียด = 2 คลิก; โปรไฟล์/การแลกเปลี่ยน/รายการโปรด = 1 คลิก |
| มือถือ | ✅ | ใช้ Sheet (เมนูด้านข้าง) รวมลิงก์เดียวกัน ไม่กระจาย เปิดปิดได้เร็ว |

### แนะนำ (ไม่บังคับ)

- ถ้าเมนูหลักจะเพิ่มในอนาคต ควรไม่เกิน **7** และพิจารณา grouped (เช่น “บัญชี” รวม โปรไฟล์ + ออกจากระบบ)

---

## 2. รองรับมือถือ (Responsive Design)

### สถานะปัจจุบัน ✅

| จุด | สถานะ | รายละเอียด |
|-----|--------|------------|
| Container & safe area | ✅ | ใช้ `container mx-auto px-4` และ `pl-safe pr-safe` ใน layout หลัก (dashboard) |
| Breakpoints | ✅ | ใช้ Tailwind `sm:`, `md:`, `lg:` สม่ำเสมอ (เช่น grid คอลัมน์, แสดง/ซ่อนเมนู desktop vs mobile) |
| เมนูมือถือ | ✅ | ปุ่ม Hamburger → Sheet ด้านขวา (w-[280px] sm:w-[320px]) แทนเมนูแนวนอน |
| หน้า Landing | ✅ | Hero ปุ่มเรียงแนวตั้งบนมือถือ (flex-col sm:flex-row), Features grid 1 col → 2 → 4 |
| Dashboard | ✅ | Sidebar กรองซ่อนบนมือถือ (หรือแสดงเป็น drawer ถ้ามี), Grid รายการ 1 → 2 → 3 col |
| ปุ่มและพื้นที่กด | ✅ | ปุ่มมีขนาดเพียงพอ (min touch target ~44px) ไม่แน่นเกินไป |

### จุดที่ตรวจแล้ว

- **Layout**: `dashboard/layout.tsx` ใช้ `container`, `px-4`, `pl-safe pr-safe`, `py-6 sm:py-8`
- **Landing**: header fixed, Hero max-w, CTA และ Features ปรับตามจอ
- **Footer**: จัดกลาง เรียงลิงก์แบบ wrap

---

## 3. ความเร็วในการโหลด (ปรับขนาดรูปให้เล็กลงแต่ยังชัด)

### สถานะปัจจุบัน ✅ / ⚠️

| จุด | สถานะ | รายละเอียด |
|-----|--------|------------|
| ใช้ Next.js Image | ✅ | ใช้ `next/image` ใน item-card, image-gallery, logo, item-detail-view, profile, report-modal ฯลฯ |
| สร้าง sizes ที่เหมาะสม | ✅ | item-card: `(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw`; image-gallery: `100vw` / `50vw` / `64px` thumb |
| priority สำหรับ above-the-fold | ✅ | การ์ดรายการ 4 รายการแรกใช้ `priority={true}` |
| อัปโหลดรูป | ✅ | Cloudinary ใช้ transformation: รายการ 800×600 limit, quality auto:good; avatar 200×200 |
| Cache static | ✅ | next.config ตั้ง Cache-Control สำหรับ .ico, .png, .jpg, .woff, /fonts/ |
| รูปที่ยังไม่ optimize | ✅ | แก้แล้ว: admin support ใช้ next/Image; profile แก้ไขรูป เอา unoptimized ออก; next.config เพิ่ม deviceSizes/imageSizes และ lh3.googleusercontent.com |

### การแก้ไขที่ทำแล้ว

1. **Admin Support** (`app/admin/support/page.tsx`): เปลี่ยน avatar ในแชทคำร้องจาก `<img>` เป็น next/Image (fill + sizes="36px")  
2. **next.config**: เพิ่ม `deviceSizes` / `imageSizes` ให้เหมาะกับมือถือ; เพิ่ม `lh3.googleusercontent.com` ใน `remotePatterns` สำหรับรูปโปรไฟล์ Google  
3. **Profile แก้ไขรูป** (`app/profile/page.tsx`): เอา `unoptimized` ออกจาก next/Image สำหรับ URL Cloudinary เพื่อให้ Next ส่งขนาดที่เหมาะสม

---

## สรุป

- **Navigation**: อยู่ในเกณฑ์ 5–7 เมนูหลัก และเข้าถึงได้ภายในไม่กี่คลิก  
- **Responsive**: ใช้ container, safe area, breakpoints และเมนูมือถือ (Sheet) ครบ  
- **ความเร็ว**: ใช้ next/image + sizes + priority และ optimize รูปที่อัปโหลด; แก้จุดที่ยังใช้ `<img>` / `unoptimized` ให้ใช้การ optimize ของ Next

ไฟล์นี้ใช้เป็นแนวทางตรวจและปรับ UX ต่อได้
