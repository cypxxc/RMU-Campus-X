# วิเคราะห์ Performance และสาเหตุการโหลดช้า

เอกสารนี้อธิบายสาเหตุที่อาจทำให้ระบบโหลดช้า และจุดที่ควรปรับปรุง โดยอ้างอิงจาก codebase จริง

---

## 1. ลำดับการโหลด (Waterfall) — สาเหตุหลักที่รู้สึกช้า

### 1.1 หน้า Dashboard (/dashboard) และหน้าหลักที่ต้องล็อกอิน

การโหลดเป็นแบบ **ลำดับ (sequential)** มากกว่าขนาน:

```
[1] โหลด HTML + JS bundle
      ↓
[2] Hydrate + AuthProvider เริ่มทำงาน
      ↓
[3] Firebase onAuthStateChanged → ได้ user
      ↓
[4] user.getIdToken() แล้ว fetch GET /api/users/me
      ↓ (รอ response)
[5] setLoading(false) — หน้าจอพ้นสถานะ "กำลังโหลด"
      ↓
[6] useItems เรียก getItems() → GET /api/items (ต้องมี token จาก auth แล้ว)
      ↓ (รอ response)
[7] แสดงรายการสิ่งของ
```

**ผลกระทบ:** ผู้ใช้ต้องรออย่างน้อย **2 รอบเครือข่ายหลัก** (users/me แล้วตามด้วย items) ก่อนเห็นรายการของ ดังนั้นถ้าเครือข่ายหรือ API ช้า จะรู้สึกโหลดช้ามาก

**ที่มาในโค้ด:**
- `components/auth-provider.tsx`: โหลดโปรไฟล์ผ่าน `/api/users/me` หลังได้ user
- `hooks/use-items.ts`: เรียก `getItems()` ซึ่งใช้ `authFetchJson` (ต้องมี token)
- `lib/db/items.ts`: `getItems` เรียก `GET /api/items` — ไม่ได้ดึงข้อมูลก่อน auth เสร็จ

---

## 2. ฝั่ง API — จำนวนการอ่าน Firestore ต่อ request

### 2.1 GET /api/items (รายการสิ่งของ)

ต่อ 1 request มีการทำงานประมาณนี้:

| ขั้นตอน | รายละเอียด | จำนวน read โดยประมาณ |
|--------|------------|------------------------|
| 1 | Query รายการ items (orderBy postedAt, limit, where ตาม filter) | 1 query (จำนวน doc = limit หรือมากกว่าเมื่อมี search) |
| 2 | ถ้ามี `lastId` (pagination) | +1 read (doc นั้นสำหรับ startAfter) |
| 3 | เมื่อมี **search** | limit = min(pageSize × 3, 100) — ดึงมากแล้ว filter ใน memory |
| 4 | โปรไฟล์ผู้โพส (postedByName, rating) | 1 batch `getAll()` ต่อ unique postedBy ในหน้านั้น (ถ้าไม่ cache) |
| 5 | สถานะ favorite ของ current user | 1 batch `getAll()` ต่อจำนวน item ในหน้า (เช่น 12 docs) |

**ตัวอย่าง (หน้า 12 รายการ, 5 เจ้าของต่างคน):**
- อ่าน items: 12 (หรือ 36 ถ้ามี search)
- อ่าน users: 5
- อ่าน favorites: 12  
รวมอย่างน้อย **29–41 reads** ต่อ 1 ครั้งโหลดหนึ่งหน้า

**ที่มาในโค้ด:** `app/api/items/route.ts` (GET), โดยเฉพาะการใช้ `refineItemsBySearchTerms` หลัง query และ batch `getAll` สำหรับ users + favorites

### 2.2 GET /api/users/me (โปรไฟล์ผู้ใช้)

| ขั้นตอน | จำนวน read |
|--------|------------|
| verifyIdToken | 0 (ใช้ Firebase Admin ในหน่วยความจำ) |
| users.doc(uid).get() | 1 |
| admins.doc(uid).get() | 1 |
| userWarnings (ล่าสุด) | 1–2 (orderBy issuedAt หรือ limit 1) |

รวมประมาณ **3–4 reads** ต่อครั้งที่โหลดโปรไฟล์

**ที่มาในโค้ด:** `app/api/users/me/route.ts` — รวมถึง `getLatestWarningReason` ที่อาจ query userWarnings ถึง 2 ครั้ง

### 2.3 GET /api/items/[id] (รายการเดียว)

- อ่าน item: 1
- อ่าน user เจ้าของ (สำหรับชื่อ/เรตติ้ง): 1  

รวม 2 reads ต่อการเปิดรายการเดียว

---

## 3. ฝั่ง Frontend

### 3.1 หน้า Dashboard เป็น "use client" ทั้งหน้า

- **ไม่มี Server-Side Rendering (SSR)** สำหรับรายการของ
- ข้อมูลรายการโหลดหลัง hydrate และหลัง auth เสร็จเท่านั้น
- ถ้า auth หรือ `/api/users/me` ช้า หน้าจะค้างที่ skeleton นาน

### 3.2 การโหลดหลายอย่างพร้อมกันตอนเข้าแอป

บน layout หลักมีหลายอย่างที่อาจยิง request หรือทำงานหนักตั้งแต่โหลด:

- **AuthProvider**: โหลดโปรไฟล์ (`/api/users/me`) ทุกครั้งที่ state เปลี่ยน/เข้าแอป
- **AnnouncementBanner**: โหลด `/api/announcements` และอาจ refetch ตาม `nextCheckInMs` หรือ interval
- **ConsentGuard**: ต้องรอ auth โหลดก่อนถึงจะรู้ว่า termsAccepted หรือไม่

ถ้าหน้า dashboard แสดง AnnouncementBanner ด้วย จะมี **อย่างน้อย 2 request** (users/me + announcements) พร้อมกับที่เตรียมเรียก items หลังจากมี token

### 3.3 รูปภาพ (Images)

- Item card ใช้ `getItemPrimaryImageUrl(item, { width: 400 })` (Cloudinary)
- ใช้ `next/image` + `loading="lazy"` (ยกเว้น priority บางตัว) — ดีอยู่แล้ว
- แต่ถ้ารูปต้นทางใหญ่หรือไม่ใช้ CDN/resize ที่เหมาะสม จะกิน bandwidth และทำให้ scroll/โหลดช้า

### 3.4 Bundle และการโหลดครั้งแรก

- หน้า Landing มี `LandingHero3D` (Three.js) — ถ้าโหลดแบบไม่ lazy จะเพิ่มขนาด JS เริ่มต้น
- มีการ `optimizePackageImports` สำหรับ lucide-react, date-fns แล้ว — ช่วยลด bundle
- หน้า verify-email / consent ใช้ `dynamic` โหลด ThreeBackground — ลดน้ำหนักหน้าแรกได้

---

## 4. สรุปสาเหตุที่มักทำให้ “โหลดช้า”

| สาเหตุ | ผลกระทบ | ระดับ |
|--------|----------|--------|
| **Waterfall: auth → users/me → items** | ต้องรอ 2 รอบเครือข่ายก่อนเห็นรายการของ | สูง |
| **GET /api/items ทำหลาย batch (items + users + favorites)** | จำนวน Firestore read สูง, latency สะสม | สูง |
| **เมื่อมี search: ดึง 3× pageSize แล้ว filter ใน memory** | อ่าน Firestore มากขึ้น + โอนข้อมูลมากขึ้น | กลาง |
| **Dashboard ไม่มี SSR** | ต้องรอ hydrate + auth + items ถึงจะเห็นของ | กลาง |
| **GET /api/users/me มีหลาย query (user + admin + userWarnings)** | ช้าเล็กน้อยต่อการโหลดโปรไฟล์ | กลาง |
| **Announcements + users/me + items เรียกแยกกัน** | หลาย request ต่อการเข้า 1 ครั้ง | กลาง |
| **Cold start (Vercel/Serverless)** | request แรกหลัง idle ช้า | ขึ้นกับโฮสต์ |
| **โหมด dev (next dev)** | ช้ากว่า production จาก compile และ source map | เฉพาะตอนพัฒนา |

---

## 5. แนวทางปรับปรุง (เรียงตามผลลัพธ์ที่คาดได้)

### 5.1 ลด Waterfall และเร่งให้เห็นรายการของ

- **ให้ items กับ users/me เรียกขนานกัน (ฝั่ง client)**  
  - เมื่อมี token แล้ว ให้ยิงทั้ง `GET /api/users/me` และ `GET /api/items` พร้อมกัน (ไม่รอ users/me คืนมาก่อนค่อยยิง items)  
  - ปรับได้ที่ hook หรือที่ที่เรียก `getItems()` ให้ไม่ผูกกับ “หลังโหลดโปรไฟล์เสร็จ” ถ้าไม่จำเป็น

- **พิจารณา SSR หรือ Streaming สำหรับรายการของ**  
  - ใช้ Server Component หรือ getData ฝั่ง server สำหรับ list แรก (เช่น หน้าแรกของ dashboard) แล้ว hydrate  
  - หรือส่ง HTML เปล่า/ skeleton จาก server แล้ว stream ข้อมูล items เข้ามาทีหลัง เพื่อลดความรู้สึกรอ

### 5.2 ลดจำนวน Firestore read และความซับซ้อนของ GET /api/items

- **Cache โปรไฟล์ผู้โพส (postedBy) ฝั่ง server**  
  - มี in-memory cache อยู่แล้ว (posterProfileCache) — ตรวจว่า TTL และ key ครอบคลุม use case แล้วอาจขยาย TTL หรือใช้ Redis ถ้า scale หลาย instance

- **ลดการดึงเมื่อมี search**  
  - พิจารณาใช้ Full-Text Search (เช่น Firestore extension, Algolia, หรือ search index แยก) แทนการดึง 3× limit แล้ว filter ใน memory เพื่อลดทั้ง read และ payload

- **รวมข้อมูลที่จำเป็นใน item document (denormalize)**  
  - เช่น เก็บ `postedByName` (หรือ displayName) ลงใน item ตอนโพส/อัปเดต เพื่อลดการ batch อ่าน users บาง request (ยังคงต้องมีกลยุทธ์ eventual consistency)

### 5.3 ปรับ GET /api/users/me

- ลดการ query userWarnings ให้เหลือ 1 ครั้ง (ใช้ index ที่มี orderBy issuedAt ให้ได้ผลลัพธ์เดียว)
- พิจารณา cache response users/me ฝั่ง client (เช่น React Query) ด้วย staleTime สั้นๆ เพื่อไม่ยิงซ้ำทุกครั้งที่เข้าแอป

### 5.4 ฝั่ง Frontend

- **โหลด announcements หลังหน้าพร้อมหรือไม่บล็อกการแสดงเนื้อหาหลัก**  
  - โหลด announcements แบบไม่บล็อกการแสดง dashboard (หรือโหลดหลังจาก items เริ่มโหลดแล้ว)

- **Dynamic import หน้าหรือ component ที่หนัก**  
  - ใช้ `next/dynamic` สำหรับหน้าที่มี chart, 3D, หรือฟอร์มใหญ่ เพื่อลด initial JS

- **ตรวจสอบรูปภาพ**  
  - ให้แน่ใจว่า Cloudinary ใช้ขนาด/format ที่เหมาะสม (เช่น width 400, f_auto, q_auto ตามที่ใช้อยู่) และไม่โหลดรูปใหญ่เกินจำเป็น

### 5.5 โฮสต์และ Infra

- เลือก **region ของ Vercel** ให้ใกล้ผู้ใช้มากที่สุด เพื่อลด latency ของ API
- ตรวจ **Firestore index** ให้ครบสำหรับ query ที่ใช้ (รวมถึง items + category + status + postedAt และ search ถ้ามีใช้ index)

---

## 6. สิ่งที่ทำได้ดีแล้ว (จาก codebase)

- มี **posterProfileCache** (in-memory) ใน GET /api/items ลดการอ่าน users ซ้ำ
- **React Query** ใน use-items มี staleTime และ placeholderData ช่วย UX
- **Middleware** รันเฉพาะ `/api` ไม่ไปรบกวน static/หน้าเพจ
- **next/image** + lazy loading และ Cloudinary URL ที่กำหนด width
- **optimizePackageImports** สำหรับ lucide-react, date-fns
- **Firestore composite indexes** ครบสำหรับ items, exchanges, notifications ฯลฯ
- เอกสาร **PERFORMANCE.md** มีแนวทางทดสอบและเครื่องมือตรวจแล้ว

---

## 7. วิธีตรวจว่า “ช้า” มาจากจุดไหน

1. **Production build**: `npm run build && npm run start` แล้วทดสอบ (ไม่ใช้แค่ dev)
2. **Chrome DevTools → Network**: ดูว่า request ไหนใช้เวลานาน (โดยเฉพาะ `/api/users/me`, `/api/items`, `/api/announcements`)
3. **Lighthouse**: ดูคะแนน Performance, LCP, TBT และข้อเสนอแนะ
4. **ฝั่ง server**: วัดเวลาใน GET /api/items และ GET /api/users/me (log หรือ APM) ว่าใช้เวลาที่ query Firestore เท่าไร

---

*เอกสารนี้อ้างอิงจาก codebase ณ วันที่วิเคราะห์ อาจต้องตรวจซ้ำหลังมีการเปลี่ยน flow หรือเพิ่มฟีเจอร์*
