# คู่มือเพิ่มความเร็วระบบ (Performance)

## สิ่งที่ทำแล้วในโปรเจกต์

1. **Cache สถานะ user ใน API** (`lib/firebase-admin.ts`)  
   - เมื่อตรวจ token + สถานะ user (ACTIVE/WARNING) จะ cache ผลในหน่วยความจำ 30 วินาที  
   - ลดการอ่าน Firestore ซ้ำสำหรับ request เดิมในระยะเวลาสั้น

2. **Middleware รันเฉพาะ `/api`** (`middleware.ts`)  
   - หน้าเพจและ static files ไม่ผ่าน middleware  
   - ลดงานที่ต้องทำตอนโหลดหน้าและทรัพยากร

3. **Next.js**  
   - ใช้ Turbopack ในโหมด dev (`next dev --turbopack`)  
   - ลด console ใน production  
   - ปรับ package imports (lucide-react, date-fns) ให้โหลดเบาลง

4. **React Query** (แอดมิน)  
   - ใช้ `staleTime` 5 นาที และปิด refetch ตอน focus  
   - ข้อมูลแอดมินถูก cache ไม่ดึงซ้ำบ่อย

---

## วิธีทดสอบว่า “ช้า” จากอะไร

- **โหมด dev (`npm run dev`)** มักช้ากว่า production เสมอ (compile ตอนรัน, source map ฯลฯ)  
- ควรทดสอบความเร็วด้วย **production build**:
  ```bash
  npm run build
  npm run start
  ```
  แล้วลองกดไปหน้าต่างๆ / อัปเดตข้อมูล / โพส / แอดมิน อีกครั้ง

- ถ้า **production ก็ยังช้า** ให้ดูว่า:
  - ช้าตอน **โหลดหน้าแรก** → มักเกี่ยวกับ bundle size / โหลด JS ครั้งแรก  
  - ช้าตอน **กดไปหน้าอื่น** → การ fetch ข้อมูลหรือการทำงานของ API  
  - ช้าตอน **อัปเดต/โพส/แอดมิน** → การเรียก API และการเขียน Firestore

---

## แนวทางเพิ่มความเร็วเพิ่มเติม (ถ้าต้องการ)

### 1. ใช้ React Query / SWR สำหรับข้อมูลหลัก

- ตอนนี้หลายหน้าใช้ `useEffect` + `fetch` โดยตรง → ทุกครั้งที่เข้าใหม่จะดึงข้อมูลใหม่  
- ถ้าใช้ **React Query** (หรือ SWR) กับรายการสิ่งของ, โปรไฟล์, การแลกเปลี่ยน:
  - ข้อมูลจะถูก cache ตาม `staleTime`
  - เปลี่ยนแท็บ/กลับมาหน้าเดิมจะเห็นข้อมูลจาก cache ทันที แล้วค่อย refetch หลังเวลา

### 2. ลดการโหลดครั้งแรก (First Load)

- ใช้ **dynamic import** สำหรับ component ที่หนัก (เช่น chart, ฟอร์มใหญ่):
  ```tsx
  const HeavyChart = dynamic(() => import('@/components/HeavyChart'), { ssr: false })
  ```
- ตรวจว่า **Three.js / 3D** โหลดแบบ lazy (เช่น หลังหน้าโหลดเสร็จ) แล้ว

### 3. ปรับการเรียก API

- **GET ที่ไม่เปลี่ยนบ่อย** (เช่นรายการหมวดหมู่, config) อาจใส่ cache header หรือ revalidate ใน API route  
- **POST/PATCH** (โพส, อัปเดต, แอดมิน) ยังต้องรอ backend อยู่แล้ว แต่ฝั่ง client สามารถ:
  - แสดง loading/skeleton ให้ชัด
  - ทำ optimistic update (อัปเดต UI ก่อน แล้วค่อย sync กับ server)

### 4. Firebase / Hosting

- **Cold start**: request แรกหลัง idle นานอาจช้า (ทั้ง Vercel/Cloud Functions และ Firebase Admin)  
- ถ้าโฮสบน **Vercel**: ใช้ region ที่ใกล้ผู้ใช้  
- ตรวจว่า **Firestore rules** ไม่ซับซ้อนเกินไปและ index ครบสำหรับ query ที่ใช้บ่อย

### 5. เครื่องมือตรวจสอบ

- **Lighthouse** (Chrome DevTools) ดูคะแนน performance และข้อเสนอแนะ  
- **React DevTools Profiler** ดู component ที่ re-render บ่อย  
- **Network tab** ดู request ที่ช้า (API ไหนใช้เวลานาน)

---

## สรุปสั้นๆ

- ทดสอบความเร็วด้วย **production** (`npm run build && npm run start`) ก่อนตัดสินว่า “ช้า”  
- โปรเจกต์ได้เพิ่ม **cache สถานะ user** และ **จำกัด middleware ให้รันเฉพาะ /api** แล้ว  
- ถ้าต้องการให้รู้สึกเร็วขึ้นอีก: ใช้ **React Query/SWR** กับข้อมูลหลัก + **dynamic import** สำหรับ component หนัก + ปรับ **loading/optimistic UI** ให้ชัดเจน
