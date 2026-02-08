# Motion & Performance + Core Web Vitals

สรุปสิ่งที่ทำแล้วและวิธีเช็คความเร็วด้วย Google PageSpeed Insights

---

## 1. Smooth Scroll (Lenis)

- **ที่ทำ**: ใช้ **Lenis** สำหรับเลื่อนหน้านุ่มนวลระดับพรีเมียม
- **การทำงาน**: โหลดแบบ dynamic ใน client เท่านั้น (`SmoothScrollProvider`) ไม่บล็อก SSR
- **การตั้งค่า**: duration 1.1, easing มาตรฐาน, touchMultiplier 1.5, autoRaf: true
- **ตำแหน่ง**: ครอบทั้งแอปใน `app/layout.tsx`

**ติดตั้งแพ็กเกจ** (ถ้ายังไม่ได้รัน):
```bash
npm install lenis
```

---

## 2. Lottie Animations

- **ที่ทำ**: ใช้ **lottie-react** + ไฟล์ JSON ขนาดเล็กใน `public/lottie/success.json`
- **คอมโพเนนต์**: `components/lottie-success.tsx` — แอนิเมชัน success (โหลดจาก JSON ใน public)
- **การใช้งาน**: แสดงเมื่อโหลดข้อมูลสำเร็จ เช่น ใน `LandingStats` เมื่อ stats โหลดครบ
- **Fallback**: ถ้าโหลด JSON ไม่ได้จะแสดงไอคอน Check (Lucide) แทน
- **ขนาด**: โหลด lottie-react แบบ dynamic (เฉพาะเมื่อใช้) และ JSON เบา

**ติดตั้งแพ็กเกจ** (ถ้ายังไม่ได้รัน):
```bash
npm install lottie-react
```

**หาแอนิเมชันเพิ่ม**: [LottieFiles](https://lottiefiles.com/) — เลือกไฟล์ JSON แล้ววางใน `public/lottie/` แล้วอ้าง path ในคอมโพเนนต์

---

## 3. Core Web Vitals & PageSpeed Insights

### วิธีเช็คคะแนนความเร็ว

1. เปิด **Google PageSpeed Insights**: https://pagespeed.web.dev/
2. ใส่ URL ของเว็บ (production หรือ preview URL)
3. กด **Analyze** — จะได้คะแนน Mobile / Desktop และ Core Web Vitals (LCP, INP, CLS)

### Core Web Vitals ที่ควรโฟกัส

| เมตริก | ความหมาย | เป้าหมาย |
|--------|----------|----------|
| **LCP** (Largest Contentful Paint) | เวลาโหลดองค์ประกอบใหญ่สุดบนจอ | &lt; 2.5s |
| **INP** (Interaction to Next Paint) | ความเร็วตอบสนองต่อการกด/ป้อนข้อมูล | &lt; 200ms |
| **CLS** (Cumulative Layout Shift) | การกระตุก/ขยับของ layout ขณะโหลด | &lt; 0.1 |

### สิ่งที่โปรเจกต์ทำไว้แล้ว (ช่วยให้คะแนนดีขึ้น)

- **รูปภาพ**: ใช้ `next/image` + `sizes` + `priority` สำหรับ above-the-fold, โหลดรูปผ่าน Cloudinary ที่ optimize แล้ว
- **ฟอนต์**: ใช้ `font-display: swap` และโหลด Kanit แบบ local ลด FOIT/FOUT
- **JavaScript**: Dynamic import สำหรับ Lenis, Lottie, Three.js, โมดัลหนัก เพื่อลด initial bundle
- **CSS**: Tailwind + optimizePackageImports (lucide-react, date-fns ฯลฯ) ใน next.config
- **Cache**: ตั้ง Cache-Control สำหรับ static assets, fonts ใน next.config
- **Layout stability**: ใช้ `scrollbar-gutter: stable`, กำหนด aspect ratio ให้การ์ดรูป (aspect-4/3) ลด CLS
- **Loading state**: ใช้ Skeleton ใน dashboard/loading.tsx ลด perceived wait

### แนวทางปรับเพิ่ม (ถ้าคะแนนยังไม่พอ)

- **LCP**: ลดขนาด hero/above-the-fold (รูปหรือ 3D background โหลดช้าลงหรือ lazy), ใช้ `priority` กับรูปแรกที่เห็น
- **INP**: หลีกเลี่ยง long task ใน main thread, ใช้ debounce ใน search/filter
- **CLS**: กำหนด width/height หรือ aspect-ratio ให้รูป/วิดีโอและพื้นที่โฆษณา
- **Bundle**: ตรวจ `next build` และวิเคราะห์ chunks ที่ใหญ่ แล้ว lazy load หน้าหรือคอมโพเนนต์ที่ใช้น้อย

---

## สรุป

- **Smooth Scroll**: Lenis ผ่าน `SmoothScrollProvider` ใน layout
- **Lottie**: คอมโพเนนต์ `LottieSuccess` + JSON ใน public, ใช้ใน LandingStats เมื่อโหลดสำเร็จ
- **Core Web Vitals**: เช็คด้วย PageSpeed Insights เป็นระยะ; โปรเจกต์มีภาพรวม optimize อยู่แล้ว (next/image, font-display, dynamic import, cache, skeleton)

รัน `npm install` แล้ว `npm run build` / `npm run dev` เพื่อทดสอบ Lenis และ Lottie
