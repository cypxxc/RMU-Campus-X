# คู่มือระบบ RMU-Campus X สำหรับการนำเสนอโครงงานจบ

เอกสารนี้อธิบายระบบอย่างละเอียด สำหรับใช้ในการพรีเซนต์โครงงานจบ ครอบคลุมทุกหน้าต่าง การทำงาน การส่ง/เก็บ/ดึงข้อมูล และเทคโนโลยีที่ใช้

---

## เอกสารฉบับเต็ม (ทุกส่วน ทุกฟังก์ชัน ทุกหน้า)

ถ้าต้องการ **ทุก API ทุกหน้า ทุกฟังก์ชัน** ที่โค้ดทำงานจริง ใช้เอกสาร 3 ไฟล์นี้ร่วมกับคู่มือหลัก:

| เอกสาร | เนื้อหา |
|--------|---------|
| **[PRESENTATION-API-COMPLETE.md](PRESENTATION-API-COMPLETE.md)** | **ทุก API endpoint** — Method, Path, Auth, หน้าที่ (Items, Exchanges, Chat, Notifications, Favorites, Users, Reviews, Reports, Support, Announcements, Upload, LINE, Health, Admin ทุก route) |
| **[PRESENTATION-PAGES-COMPLETE.md](PRESENTATION-PAGES-COMPLETE.md)** | **ทุกหน้า (Page)** — 33 หน้า: ไฟล์ component, หน้าที่, Hooks/API ที่เรียก, State, Component หลัก (Landing, Auth, Dashboard, Item, Profile, Favorites, My-Exchanges, Chat, Notifications, Support, Report, Announcements, เอกสาร, Admin ทุกหน้า) |
| **[PRESENTATION-LIB-FUNCTIONS.md](PRESENTATION-LIB-FUNCTIONS.md)** | **ทุกฟังก์ชันหลักใน Lib** — api-client, lib/db (items, exchanges, notifications, favorites, users, reviews, reports, support, logs, drafts, collections, converters), lib/services (client-firestore, client-line, report-service, admin user-cleanup, items), exchange-state-machine, storage, cloudinary-url, api-validation, hooks |

---

## สารบัญ

1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [สถาปัตยกรรมและ Data Flow](#2-สถาปัตยกรรมและ-data-flow)
3. [รายละเอียดแต่ละหน้า (หน้าต่าง)](#3-รายละเอียดแต่ละหน้า-หน้าต่าง)
4. [การส่งข้อมูล (Client → API)](#4-การส่งข้อมูล-client--api)
5. [การเก็บข้อมูล (Database & Storage)](#5-การเก็บข้อมูล-database--storage)
6. [การดึงข้อมูล (API → Firestore, Pagination, Search)](#6-การดึงข้อมูล)
7. [การแสดงผล (UI Components & Libraries)](#7-การแสดงผล-ui-components--libraries)
8. [Library และเทคโนโลยีที่ใช้](#8-library-และเทคโนโลยีที่ใช้)

---

## 1. ภาพรวมระบบ

**RMU-Campus X** คือ **แพลตฟอร์มแลกเปลี่ยนสิ่งของ** สำหรับนักศึกษา มหาวิทยาลัยราชภัฏมหาสารคาม

- **วัตถุประสงค์:** ให้ผู้ใช้โพสต์สิ่งของที่ไม่ใช้แล้ว ขอรับสิ่งของจากคนอื่น แลกเปลี่ยนผ่านแชท และติดตามสถานะการแลกเปลี่ยน
- **ผู้ใช้หลัก:** นักศึกษา (อีเมล @rmu.ac.th รหัส 12 หลัก) และอาจารย์
- **ฟีเจอร์หลัก:** โพสต์สิ่งของ, ค้นหา/กรอง, รายการโปรด, ขอรับของ, แชท, แจ้งเตือน (ในแอป + LINE), รีวิว, รายงานปัญหา, ซัพพอร์ต, ระบบผู้ดูแล (Admin)

---

## 2. สถาปัตยกรรมและ Data Flow

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT (Browser / PWA)                                         │
│  Next.js 16 App Router │ React 19 │ TailwindCSS 4               │
│  • Server Components (RSC) สำหรับ Landing, เอกสาร                │
│  • Client Components สำหรับ Dashboard, แชท, โปรไฟล์, Admin       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │  HTTP/HTTPS + Bearer Token (Firebase ID Token)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  API LAYER (Next.js API Routes)                                  │
│  /api/items, /api/users/me, /api/exchanges, /api/notifications   │
│  /api/favorites, /api/reports, /api/support, /api/admin/* ...    │
│  • ตรวจ Auth (verifyIdToken), termsAccepted, canPost/canExchange  │
│  • Rate Limiting (Upstash Redis), Zod Validation                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  SERVICE LAYER                                                   │
│  • Firebase Admin SDK → Firestore (อ่าน/เขียน)                   │
│  • Cloudinary → เก็บรูป (Signed Upload จาก Client)               │
│  • LINE Messaging API → แจ้งเตือน Push                            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow แบบย่อ

- **การโหลดข้อมูล:** ผู้ใช้กดใช้งาน → Component เรียก `lib/db/*` หรือ `lib/firestore` → ใช้ `authFetchJson` จาก `lib/api-client` ส่ง request ไป API Route → API ใช้ Firebase Admin อ่าน Firestore → ส่ง JSON กลับ → Component แสดงผล
- **การบันทึกข้อมูล:** ผู้ใช้กรอกฟอร์ม/กดปุ่ม → Client ส่ง POST/PATCH/DELETE ผ่าน `authFetchJson` → API ตรวจสอบสิทธิ์ + Zod → เขียน Firestore (และอาจสร้างแจ้งเตือน/LINE)
- **รูปภาพ:** Client เรียก `/api/upload/sign` ได้ signature → อัปโหลดไฟล์ตรงไป Cloudinary → ได้ `public_id` → ส่ง `public_id` ไปกับข้อมูล item/announcement เก็บใน Firestore (ไม่เก็บ URL เต็มใน DB เพื่อความยืดหยุ่นในการ transform)

---

## 3. รายละเอียดแต่ละหน้า (หน้าต่าง)

> แนวคิดของส่วนนี้คือ **มองแต่ละหน้าแบบคนใช้งานจริง** ก่อน (ผู้ใช้เห็นอะไร / ทำอะไรได้บ้าง)  
> แล้วค่อยบอกว่า **เบื้องหลังระบบทำอะไร** (เรียก API ไหน เก็บข้อมูลตรงไหน) เพื่อใช้ตอบคำถามกรรมการได้ครบ

---

### 3.1 หน้า Landing (/) — หน้าแรกก่อนล็อกอิน

- **มุมมองผู้ใช้**
  - เห็นหน้าต้อนรับที่อธิบายว่า RMU‑Campus X คืออะไร, ใช้ทำอะไร, มีขั้นตอนใช้งานกี่ขั้น
  - มีปุ่มให้กดไปเริ่มใช้งาน เช่น **“เริ่มใช้งานเลย”** (ไปหน้า Dashboard ถ้าล็อกอินแล้ว) หรือ **“สมัครสมาชิก”** (ไปหน้า Register)
  - เปลี่ยนภาษาได้ (ไทย/อังกฤษ) จากสวิตช์ภาษาด้านบน

- **เบื้องหลังระบบ**
  - ใช้ **Server Component** แสดงผล เน้นโหลดเร็วและ SEO ดี
  - ข้อความทุกอย่างมาจากระบบ i18n (`getServerTranslator()` + ไฟล์ `lib/i18n/messages`) จึงรองรับหลายภาษา
  - หน้านี้ **ไม่เรียก API ธุรกิจ** (ไม่มีการดึง Firestore) ทำให้เบาและปลอดภัย
  - ใช้คอมโพเนนต์เช่น `LandingHero3D`, `LandingStats`, `ScrollReveal`, `Card`, `Badge`, `Button` ทำหน้าให้ดูทันสมัย

---

### 3.2 หน้า Dashboard (/dashboard) — หน้าหลักหลังล็อกอิน

- **มุมมองผู้ใช้**
  - เห็น **รายการสิ่งของทั้งหมด** เป็นรูปแบบการ์ด (รูป + ชื่อ + หมวดหมู่ + สถานะ)
  - มีแถบค้นหา, ตัวกรองหมวดหมู่, ตัวกรองสถานะ (เช่น ว่าง/กำลังแลกเปลี่ยน/ปิดแล้ว) และปุ่มเลื่อนหน้าถัดไป–ก่อนหน้า
  - คลิกที่การ์ดแต่ละใบเพื่อดูรายละเอียดเพิ่มเติม หรือเข้าไปดูหน้า `/item/[id]`
  - มีปุ่ม **“โพสต์สิ่งของ”** เพื่อเปิดหน้าต่าง/ป็อปอัปสำหรับลงของชิ้นใหม่

- **เบื้องหลังระบบ**
  - เป็น **Client Component** ใช้ hook `useItems()` เรียกฟังก์ชัน `getItems()` (จาก `lib/firestore`)  
    ซึ่งภายในไปเรียก API `GET /api/items` พร้อมพารามิเตอร์:
    - `categories` (หมวดหมู่ที่เลือก), `status`, `search` (คำค้น), `pageSize`, `lastId` (ใช้แบ่งหน้า)
  - การค้นหาจะมี **ดีเลย์ประมาณ 500 ms (debounce)** เพื่อไม่ยิง API ทุกตัวอักษรที่ผู้ใช้พิมพ์
  - API ฝั่งเซิร์ฟเวอร์อ่านข้อมูลจาก Firestore collection `items` โดย
    - กรองตาม `category`, `status`, `postedBy` ตามตัวกรองบนหน้า
    - ถ้ามีคำค้นจะใช้ field `searchKeywords` + `array-contains-any` ดึงรายการที่เกี่ยวข้อง แล้วคัดกรองต่อในหน่วยความจำ เพื่อให้ผลลัพธ์ตรงทุกคำค้น
    - ใช้การแบ่งหน้าแบบ cursor ด้วย `lastId` เพื่อเลื่อนไปหน้าถัดไป
  - หน้านี้ **ไม่ได้บันทึกข้อมูลโดยตรง** (การโพสต์ของใหม่ใช้ Modal → `POST /api/items`)
  - ด้าน UI ใช้ `ItemCard`, `ItemCardSkeletonGrid`, `FilterSidebar`, `ItemDetailView` (แบบ Dialog) และ TanStack Query ช่วย cache ข้อมูล ลดการยิง API ซ้ำ

---

### 3.3 หน้ารายละเอียดสิ่งของ (/item/[id])

- **มุมมองผู้ใช้**
  - เห็นรูปสิ่งของ ชื่อ รายละเอียด หมวดหมู่ สถานะ และข้อมูลเจ้าของอย่างชัดเจน
  - มีปุ่ม **“ขอรับสิ่งของ”** เพื่อขอแลกเปลี่ยน และปุ่มรูปหัวใจเพื่อเพิ่ม/ลบจาก **รายการโปรด**
  - คลิกชื่อเจ้าของเพื่อไปดูโปรไฟล์สาธารณะของเขา

- **เบื้องหลังระบบ**
  - เมื่อเข้าหน้า ระบบเรียก `getItemById(id)` (จาก `lib/firestore`) → API `GET /api/items/[id]`
  - API อ่าน document จาก Firestore `items/[id]` แล้วแปลงด้วย `parseItemFromFirestore` เพื่อเช็กโครงสร้างข้อมูลให้ถูกต้องก่อนส่งกลับ
  - ถ้าไม่พบ item จะตอบกลับเป็น 404 เพื่อให้หน้าแสดง “ไม่พบรายการ”
  - ปุ่มต่าง ๆ ทำงานดังนี้
    - ขอรับสิ่งของ → `POST /api/exchanges`
    - เพิ่ม/ลบรายการโปรด → `POST` หรือ `DELETE /api/favorites`
  - รูปสิ่งของแสดงผ่าน `ItemDetailView` โดยดึง URL จาก Cloudinary ด้วย `resolveImageUrl(public_id)`

---

### 3.4 หน้าโปรไฟล์ของฉัน (/profile) และโปรไฟล์สาธารณะ (/profile/[uid])

- **มุมมองผู้ใช้**
  - `/profile`:
    - แก้ไขข้อมูลส่วนตัว เช่น ชื่อ, รูปโปรไฟล์, ช่องทางติดต่อ (เช่น LINE)
    - ดูสรุปการใช้งานของตัวเอง เช่น ของที่โพสต์, คะแนนรีวิว
  - `/profile/[uid]`:
    - ดูโปรไฟล์ของคนอื่นแบบสาธารณะ รวมถึงรายการสิ่งของที่เขาโพสต์ และรีวิวจากผู้ใช้คนอื่น

- **เบื้องหลังระบบ**
  - โปรไฟล์ของตัวเอง:
    - ใช้ API `GET /api/users/me` เพื่อดึงข้อมูล และ `PATCH /api/users/me` เมื่อแก้ไข
    - เมื่อผู้ใช้ยอมรับข้อกำหนด จะเรียก `POST /api/users/me/accept-terms`
  - โปรไฟล์สาธารณะ:
    - ใช้ API `GET /api/users/[id]` (ไม่ต้องล็อกอินก็อ่านได้ ถ้าอนุญาต)
    - ของที่โพสต์โดย user นั้น เรียก `getItems({ postedBy: uid })` → `GET /api/items?postedBy=...`
    - รีวิวดึงจาก `GET /api/reviews?targetUserId=...`
  - รูปโปรไฟล์อัปโหลดโดย
    - เรียก `POST /api/upload/sign` เพื่อขอลายเซ็น/โทเคนสำหรับอัปโหลด Cloudinary
    - อัปโหลดรูปขึ้น Cloudinary แล้วได้ `public_id`
    - ส่ง `public_id` กลับมาที่ `PATCH /api/users/me`
  - ข้อมูลหลักเก็บใน collection `users` และรูปเก็บที่ Cloudinary

---

### 3.5 หน้ารายการโปรด (/favorites)

- **มุมมองผู้ใช้**
  - เห็นรายการสิ่งของที่เคยกดหัวใจเก็บไว้เป็น **รายการโปรด** เพื่อกลับมาดูภายหลังได้ง่าย
  - สามารถกดลบออกจากรายการโปรดได้จากหน้านี้

- **เบื้องหลังระบบ**
  - เมื่อเปิดหน้า ระบบเรียก `GET /api/favorites` เพื่อดึงรายการ item ที่ถูกกดเป็น favorite ของ user คนนี้
  - โครงสร้างข้อมูลอาจมี 2 แบบ (แล้วแต่ implementation)
    - ดึงมาเป็น **เฉพาะ item id** แล้วไปโหลดรายละเอียดสิ่งของต่อ
    - หรือ API คืนข้อมูลสิ่งของมาให้เลยพร้อม flag `isFavorite`
  - การลบออกจากรายการโปรดใช้ `DELETE /api/favorites/[itemId]`
  - ฝั่ง Firestore เก็บความสัมพันธ์ระหว่างผู้ใช้กับสิ่งของ (เช่น collection `favorites` หรือ subcollection ใต้ `users`)

---

### 3.6 หน้าคำขอแลกเปลี่ยนของฉัน (/my-exchanges)

- **มุมมองผู้ใช้**
  - เห็นรายการ **คำขอแลกเปลี่ยนทั้งหมด** ที่เกี่ยวข้องกับตัวเอง
    - ทั้งที่เราเป็นเจ้าของสิ่งของ และที่เราเป็นคนขอรับ
  - แต่ละรายการจะบอกสถานะ เช่น รออนุมัติ (pending), กำลังดำเนินการ (in progress), สำเร็จ (completed), ยกเลิก (cancelled), ถูกปฏิเสธ (rejected)
  - สามารถ
    - กดเข้าไปดูรายละเอียดการแลกเปลี่ยน
    - เข้าไปหน้าแชทของคู่แลกเปลี่ยน
    - กดยืนยัน/ปฏิเสธคำขอ
    - กดยืนยันการส่งมอบหรือรับของ เพื่อปิดดีล

- **เบื้องหลังระบบ**
  - หน้าใช้ API หลัก ๆ ดังนี้
    - `GET /api/exchanges` ดึงรายการการแลกเปลี่ยนทั้งหมดของผู้ใช้
    - `POST /api/exchanges/respond` ใช้สำหรับเจ้าของของเพื่อ **ตอบรับ/ปฏิเสธ** คำขอ
    - `PATCH /api/exchanges/[id]` ใช้เปลี่ยนสถานะ เช่น ยืนยันส่งของแล้ว หรือยืนยันรับของแล้ว
    - `POST /api/exchanges/[id]/hide` ใช้ซ่อนรายการนี้ออกจากหน้าจอของผู้ใช้ (แต่ข้อมูลยังอยู่ในระบบ)
  - ข้อมูลเก็บใน Firestore collection `exchanges` และมี **State Machine** (`lib/exchange-state-machine.ts`) กำหนดว่าจากสถานะไหนไปสถานะไหนได้บ้าง เช่น
    - `pending → in_progress / rejected / cancelled`
    - `in_progress → completed / cancelled`

---

### 3.7 หน้าแชท (/chat/[exchangeId])

- **มุมมองผู้ใช้**
  - เป็นห้องแชทระหว่าง **เจ้าของสิ่งของ** กับ **ผู้ขอรับสิ่งของ** สำหรับดีลหนึ่งรายการ
  - ผู้ใช้สามารถพิมพ์ข้อความ ส่งรูป และเลื่อนย้อนดูประวัติการสนทนาได้
  - สามารถกดชื่ออีกฝ่ายเพื่อไปดูโปรไฟล์สาธารณะ

- **เบื้องหลังระบบ**
  - ตอนเข้าแชท ระบบจะโหลด
    - ข้อมูลการแลกเปลี่ยนจาก `GET /api/exchanges/[id]`
    - ข้อความเก่า ๆ จาก subcollection `exchanges/[exchangeId]/chatMessages`
  - การส่งข้อความใหม่อาจใช้ `POST` ไปยัง API แชท (เช่น `/api/chat/[exchangeId]/messages` หรือ route ภายใต้ exchanges)
  - ระบบรองรับการอัปเดตแบบเกือบเรียลไทม์
    - ใช้ Firestore listener (`onSnapshot` ใน `lib/services/client-firestore.ts`) เพื่อดึงข้อความใหม่อัตโนมัติ
    - หรือใช้การโพล API ตามช่วงเวลา ถ้าไม่ได้เปิดโหมด realtime
  - ข้อความแต่ละอันเก็บใน `chatMessages` พร้อม `senderId`, `message`, `createdAt` และ `imageUrl` ถ้ามีรูปแนบ

---

### 3.8 หน้าแจ้งเตือน (/notifications)

- **มุมมองผู้ใช้**
  - เห็นรายการแจ้งเตือนทุกประเภท เช่น การแลกเปลี่ยน, แชท, ซัพพอร์ต, รายงาน, คำเตือนจากระบบ
  - เลือกดูเฉพาะ **ยังไม่อ่าน**, หรือกรองตามประเภทได้
  - กดแต่ละรายการเพื่อไปยังหน้าที่เกี่ยวข้อง (เช่น ไปหน้าแชท หรือไปหน้าการแลกเปลี่ยน)
  - มีปุ่ม "อ่านทั้งหมด" และสามารถลบแจ้งเตือนทีละอันได้

- **เบื้องหลังระบบ**
  - ใช้ API
    - `GET /api/notifications` (รองรับพารามิเตอร์ `pageSize`, `lastId`, `types`, `unreadOnly`)
    - `PATCH /api/notifications/[id]` เพื่อทำเครื่องหมายว่าอ่านแล้ว
    - `POST /api/notifications/read-all` เพื่อทำเครื่องหมายว่าอ่านทั้งหมด
    - `DELETE /api/notifications/[id]` เพื่อลบแจ้งเตือนรายตัว
  - API อ่านจาก Firestore collection `notifications` โดยกรองตาม `userId` ของผู้ใช้ที่ล็อกอินอยู่
  - แต่ละรายการเก็บ `type`, `readAt`, และ `payload` สำหรับลิงก์ไปหน้าที่เกี่ยวข้อง

---

### 3.9 หน้า Support (/support)

- **มุมมองผู้ใช้**
  - ใช้เมื่อต้องการ **ติดต่อทีมดูแลระบบ** เช่น มีปัญหาใช้งาน, ถูกละเมิดสิทธิ์, หรืออยากเสนอแนะ
  - ผู้ใช้สามารถ
    - กดสร้าง ticket ใหม่ ใส่หัวข้อและรายละเอียด
    - ดูรายการ ticket ที่เคยส่งไว้
    - กดเข้าไปดูและตอบโต้ข้อความกับแอดมินได้เหมือนห้องสนทนาย่อย ๆ

- **เบื้องหลังระบบ**
  - ใช้ API หลักคือ
    - `GET /api/support` เพื่อดึงรายการ ticket ของผู้ใช้
    - `POST /api/support` เพื่อสร้าง ticket ใหม่
    - `GET /api/support/[ticketId]/messages` และ `POST /api/support/[ticketId]/messages` สำหรับอ่าน/ส่งข้อความภายใน ticket
  - ข้อมูลเก็บใน Firestore
    - collection `support_tickets` สำหรับหัวข้อหลักของแต่ละ ticket
    - subcollection `support_tickets/[id]/messages` สำหรับข้อความโต้ตอบระหว่างผู้ใช้กับแอดมิน

---

### 3.10 หน้ารายงานปัญหา (/report)

- **มุมมองผู้ใช้**
  - ใช้เมื่อต้องการ **รายงานสิ่งที่ผิดปกติ** เช่น
    - รายการสิ่งของที่ไม่เหมาะสม
    - การแลกเปลี่ยนที่มีปัญหา
    - ผู้ใช้ที่มีพฤติกรรมไม่เหมาะสม
  - ฟอร์มจะให้เลือกประเภทเรื่อง, เลือกเหตุผลแบบรายการ, เขียนอธิบายรายละเอียดเพิ่มเติม และแนบรูปหลักฐานได้

- **เบื้องหลังระบบ**
  - เมื่อส่งฟอร์ม จะเรียก `POST /api/reports` ผ่าน service ฝั่งเซิร์ฟเวอร์ (`report-service`)
  - API จะตรวจว่า user **ยอมรับข้อกำหนด (termsAccepted)** แล้วหรือยัง ก่อนให้ส่งรายงาน
  - ถ้าผ่าน ระบบจะสร้าง document ใหม่ใน collection `reports` เก็บข้อมูลเช่น
    - `reportType`, `reasonCode`, `description`, `reporterId`, `targetId`, `evidenceUrls`, เวลาแจ้ง ฯลฯ
  - อาจมีการสร้างแจ้งเตือนไปยังผู้ดูแลหรือระบบ Admin เพิ่มเติม

---

### 3.11 หน้าประกาศ (/announcements)

- **มุมมองผู้ใช้**
  - เป็นหน้าที่แสดง **ประวัติประกาศทั้งหมด** ของระบบ เช่น ข่าวสาร, เงื่อนไขใหม่, ข้อควรรู้
  - ผู้ใช้สามารถเลื่อนอ่านประกาศเก่า ๆ ย้อนหลังได้

- **เบื้องหลังระบบ**
  - ใช้ API `GET /api/announcements/history` (ไม่ต้องล็อกอินก็อ่านได้ ถ้าระบบอนุญาต)
  - API อ่านข้อมูลจาก collection `announcements` และกรองตามเวลา/สถานะ เช่น
    - เฉพาะประกาศที่เคยออนไลน์, กำลังออนไลน์, หรือครบเงื่อนไขที่กำหนด

---

### 3.12 แถบประกาศ (Announcement Banner) — Component ใต้ Navbar

- **มุมมองผู้ใช้**
  - เป็นแถบแคบ ๆ ใต้ Navbar ที่แสดง **ประกาศสำคัญล่าสุด** ขณะใช้งานหน้าอื่น
  - ผู้ใช้สามารถกดอ่านรายละเอียด หรือกดปิดแถบนี้ได้

- **เบื้องหลังระบบ**
  - ฝั่ง Client เรียก `GET /api/announcements` (ไม่ต้องใช้ token) เพื่อดึงประกาศที่กำลังใช้งานอยู่
  - API จะคืนข้อมูลประกาศพร้อมตัวเลข `nextCheckInMs` บอกว่าควรเรียกซ้ำอีกเมื่อไหร่
  - ถ้าผู้ใช้กดปิดประกาศ id นั้นจะถูกเก็บใน `localStorage` ภายใต้ key `announcements_dismissed` เพื่อไม่ให้แสดงซ้ำในเบราว์เซอร์เครื่องเดิม
  - Context `AnnouncementContext` ช่วยบอกส่วนอื่นของ UI (เช่น Breadcrumb) ว่าขณะนี้มีแถบประกาศหรือไม่ เพื่อจัดตำแหน่ง layout ให้สวยงาม
  - ข้อมูลประกาศเก็บใน Firestore collection `announcements` และสถานะการปิด/เปิดเก็บเฉพาะฝั่ง client

---

### 3.13 หน้าเข้าสู่ระบบ (/login), ลงทะเบียน (/register), ยืนยันอีเมล (/verify-email), ยอมรับข้อกำหนด (/consent), ลืมรหัส (/forgot-password)

- **มุมมองผู้ใช้**
  - `/login`:
    - กรอกอีเมลมหาวิทยาลัยและรหัสผ่านเพื่อเข้าสู่ระบบ
    - มีตัวเลือก “จดจำฉัน” เพื่อให้อยู่ในระบบได้นานขึ้น
  - `/register`:
    - กรอกข้อมูลสมัครสมาชิกใหม่ ระบบจะตรวจว่าใช้อีเมล `@rmu.ac.th` ตามเงื่อนไข
  - `/verify-email`:
    - ใช้เมื่อผู้ใช้กดลิงก์ยืนยันจากอีเมลที่ส่งไป เพื่อยืนยันตัวตน
  - `/consent`:
    - แสดงเนื้อหาเงื่อนไขการใช้งาน ให้ผู้ใช้ติ๊กยอมรับก่อนใช้ระบบเต็มรูปแบบ
  - `/forgot-password`:
    - ใส่อีเมลที่สมัครไว้ เพื่อให้ระบบส่งลิงก์รีเซ็ตรหัสผ่าน

- **เบื้องหลังระบบ**
  - ใช้ **Firebase Auth ฝั่ง Client** สำหรับ
    - สมัครสมาชิก, ล็อกอิน, ส่งอีเมลยืนยัน, ส่งอีเมลลืมรหัส, รีเซ็ตรหัสผ่าน
  - ฝั่ง API ใช้ **Firebase Admin SDK** (`verifyIdToken`) ตรวจสอบ token ที่มาจาก client ทุกครั้งก่อนเข้าถึงข้อมูลสำคัญ
  - เมื่อผู้ใช้ล็อกอินแล้ว ระบบจะ
    - สร้างหรืออัปเดตข้อมูลใน Firestore collection `users` ผ่าน API `GET /api/users/me`
    - เก็บข้อมูลสำคัญ เช่น `displayName`, `termsAccepted`, `termsAcceptedAt`, `status`, ช่องทางติดต่อ ฯลฯ
  - เมื่อผู้ใช้กดยอมรับข้อกำหนดที่หน้า `/consent` จะเรียก `POST /api/users/me/accept-terms` เพื่อบันทึกสถานะใน Firestore

---

### 3.14 หน้า Admin (ชุด /admin ทั้งหมด)

เช่น `/admin`, `/admin/items`, `/admin/users`, `/admin/reports`, `/admin/support`, `/admin/announcements`, `/admin/exchanges`, `/admin/logs`

- **มุมมองผู้ใช้ (แอดมิน)**
  - เห็นแดชบอร์ดสรุปสถิติระบบ เช่น จำนวนผู้ใช้, ของที่โพสต์, การแลกเปลี่ยน, รายงานที่ค้างอยู่
  - มีเมนูย่อยแต่ละส่วนสำหรับ
    - จัดการสิ่งของ (ปิด/ลบ/แก้ไข)
    - จัดการผู้ใช้ (ระงับ / ปลดระงับ / ส่งคำเตือน)
    - ตรวจสอบรายงานปัญหาและตอบกลับ
    - ดูและตอบ ticket ซัพพอร์ต
    - ตั้งค่าและจัดการประกาศ
    - ดูประวัติการแลกเปลี่ยน และ log การทำงานของแอดมิน

- **เบื้องหลังระบบ**
  - ทุกรายการในหน้า Admin จะผ่าน **Admin Guard** ก่อน คือ hook `useAdminGuard()`  
    ที่ฝั่ง client จะเรียก API `/api/admin/verify` เพื่อตรวจสอบว่า user คนนี้เป็นแอดมินจริงหรือไม่
  - ข้อมูลต่าง ๆ ถูกโหลดผ่าน Admin API หลายตัว เช่น
    - `/api/admin/stats`, `/api/admin/items`, `/api/admin/users`, `/api/admin/reports`, `/api/admin/support`, `/api/admin/announcements`, `/api/admin/exchanges`, `/api/admin/logs` ฯลฯ
  - การกระทำของแอดมิน (เช่น ยกเลิกโพสต์, ระงับผู้ใช้, ปิดรายงาน) จะถูกบันทึกลงใน collections ที่เกี่ยวข้อง เช่น
    - ใช้ collection เดียวกับฝั่งผู้ใช้ (`items`, `users`, `reports`, `support_tickets`, `exchanges`) แต่ให้สิทธิ์มากกว่า
    - มี collection เพิ่มพิเศษ เช่น `adminLogs`, `userWarnings`, `cases` สำหรับเก็บประวัติการจัดการ

---

### 3.15 หน้าเอกสาร (Guide, Terms, Privacy, Guidelines) — /guide, /terms, /privacy, /guidelines

- **มุมมองผู้ใช้**
  - เป็นหน้าเนื้อหาแบบอ่านอย่างเดียว เช่น คู่มือการใช้งาน, ข้อตกลงการใช้บริการ, นโยบายความเป็นส่วนตัว, แนวทางการใช้งานที่เหมาะสม
  - ผู้ใช้สามารถเลื่อนอ่านได้ทั้งภาษาไทยและภาษาอังกฤษ (ถ้าระบบเปิดสองภาษา)

- **เบื้องหลังระบบ**
  - ส่วนใหญ่เป็น **Server Component** หรือ Client ที่โหลดข้อความจากระบบ i18n (`lib/i18n/messages`)
  - ใช้รูปแบบ Markdown หรือข้อความธรรมดา ไม่มีการเรียก API ธุรกิจ / ไม่แตะ Firestore
  - ทำให้หน้าเหล่านี้ปลอดภัย โหลดไว และแก้ไขข้อความได้ง่ายจากไฟล์ภาษา

---

## 4. การส่งข้อมูล (Client → API)

### 4.1 ช่องทางส่งข้อมูล

- **HTTP Method:** GET (ดึงข้อมูล), POST (สร้าง), PATCH (แก้ไขบางส่วน), PUT (แทนที่), DELETE (ลบ)
- **Endpoint ฐาน:** Same-origin เช่น `https://your-domain.com/api/...` (หรือ relative `/api/...` แล้ว `lib/api-client` เติม origin)
- **Authentication:** ทุก request ที่ต้องล็อกอิน ส่ง header `Authorization: Bearer <Firebase_ID_Token>`; token ได้จาก `getAuthToken()` ใน `lib/api-client` (cache 45 วินาที)

### 4.2 ฟังก์ชันที่ใช้ส่ง

- **authFetch(url, options)** — ส่ง request พร้อม Bearer token; รองรับ retry (เฉพาะ GET/HEAD/OPTIONS) เมื่อได้ 429 หรือ 5xx หรือ network error; ใช้ exponential backoff + เคารพ `Retry-After`; POST/PATCH/PUT/DELETE ไม่ retry เพื่อกัน duplicate
- **authFetchJson(url, options)** — เรียก authFetch แล้ว parse JSON; คืน `{ success, data, error }`

### 4.3 การส่ง Body

- **Content-Type:** `application/json` เมื่อ body เป็น object
- **Validation:** ฝั่ง API ใช้ Zod schema (ใน `withValidation`) ตรวจ body ก่อนประมวลผล

### 4.4 Rate Limiting และข้อจำกัด

- **General API:** 100 requests / นาที (Upstash Redis)
- **Upload:** 10 requests / นาที
- **Auth:** 5 requests / นาที  
เมื่อเกิน (429) API ส่ง header `Retry-After`; client retry อัตโนมัติเฉพาะ method แบบ idempotent

---

## 5. การเก็บข้อมูล (Database & Storage)

### 5.1 Firestore Collections (ใช้ผ่าน Firebase Admin SDK ฝั่ง API)

| Collection | การใช้งานหลัก |
|------------|------------------|
| **items** | สิ่งของ (title, description, category, status, imagePublicIds, postedBy, postedAt, searchKeywords ฯลฯ) |
| **users** | ผู้ใช้ (email, displayName, termsAccepted, status, LINE, rating ฯลฯ) |
| **exchanges** | การแลกเปลี่ยน (itemId, ownerId, requesterId, status, ownerConfirmed, requesterConfirmed ฯลฯ) |
| **exchanges/[id]/chatMessages** | ข้อความแชทในแต่ละการแลกเปลี่ยน |
| **notifications** | แจ้งเตือนในแอป (userId, type, readAt, payload) |
| **reports** | รายงานปัญหา (reportType, reasonCode, reporterId, targetId ฯลฯ) |
| **announcements** | ประกาศแบนเนอร์ (title, body, startAt, endAt, isActive, image ฯลฯ) |
| **support_tickets** | คำร้องซัพพอร์ต |
| **support_tickets/[id]/messages** | ข้อความในแต่ละ ticket |
| **userWarnings** | คำเตือนผู้ใช้ |
| **adminLogs** | บันทึกการดำเนินการของแอดมิน |
| **cases** | เคส (ถ้ามีใช้จัดการรายงาน/การดำเนินการ) |
| **drafts** | ร่างโพสต์ (ถ้ามี) |

Collection ต่างๆ ใช้ **typed converter** จาก `lib/db/collections.ts` และ `lib/db/converters.ts` เพื่อให้อ่าน/เขียนเป็น TypeScript type ชัดเจน

### 5.2 การเก็บรูปภาพ

- **ที่เก็บ:** Cloudinary (CDN)
- **ขั้นตอน:** Client เรียก POST `/api/upload/sign` ส่ง preset (item | avatar | announcement) → ได้ signature, timestamp, api_key, folder → Client POST ไฟล์ตรงไป Cloudinary → ได้ `public_id`
- **ใน Firestore:** เก็บเฉพาะ `public_id` (หรือ imageUrls แบบ legacy) ไม่เก็บ URL เต็ม เพื่อให้เปลี่ยนขนาด/รูปแบบ (f_auto, q_auto) ได้ที่ฝั่งแสดงผล
- **การบีบอัด:** ก่อนอัปโหลดมี compression (ใน `lib/storage` / `lib/image-utils`) ลดขนาดไฟล์ 50–80% ถ้าเกินเกณฑ์

### 5.3 ข้อมูลที่เก็บฝั่ง Client

- **localStorage:** ภาษาที่เลือก (`rmu_locale`), ธีม (`theme`), สถานะปิดประกาศ (`announcements_dismissed`), สถานะยอมรับแถบคุกกี้ (`rmu-cookie-consent`), สถานะ “จดจำฉัน” หน้าเข้าสู่ระบบ (`REMEMBER_KEY`), ตัวนับ/สถานะคำเตือนบางอย่างของบัญชี, และค่า **cooldown การกดปุ่มบางอย่าง** (`cooldown_*`) เพื่อกันกดรัว ๆ
- **sessionStorage:** สถานะยอมรับข้อกำหนดการใช้งานใน session ปัจจุบัน (`TERMS_ACCEPTED_KEY`) — ปิดเบราว์เซอร์แล้วค่ารีเซ็ต เพื่อให้ต้องตรวจใหม่เมื่อเข้าสู่ระบบวนรอบใหม่
- **การจำการเข้าสู่ระบบ (Remember me):** Firebase Auth ใช้ localStorage + IndexedDB สำหรับเก็บ session แบบอยู่ข้ามการปิดเบราว์เซอร์; ถ้าผู้ใช้ **ไม่ติ๊ก “จดจำฉัน”** ระบบจะล้างค่าใน localStorage/IndexedDB เหลือแค่ sessionStorage ทำให้ **ปิดแท็บแล้วออกจากระบบจริง** แต่ถ้าติ๊ก ระบบจะเก็บสถานะไว้ทำให้ยังค้างล็อกอินได้ในครั้งถัดไป
- **Cookie:** ใช้เป็น **locale cookie** เพื่อให้ทั้งฝั่ง server และ client รู้ภาษาที่เลือก (ตามที่กำหนดใน i18n); ไม่ได้ใช้เก็บข้อมูลฟอร์มหรือข้อมูลส่วนตัวอื่น ๆ

---

## 6. การดึงข้อมูล

### 6.1 แบบดึง (Pattern)

- **REST API ผ่าน API Route:** เกือบทุกฟีเจอร์โหลดผ่าน API (ไม่ใช้ Firestore SDK โดยตรงบน client) เพื่อควบคุมสิทธิ์และ cache
- **ดึงแบบแบ่งหน้า (Pagination):** ใช้ **cursor-based** ด้วย `lastId` (document id รายการล่าสุดของหน้าก่อน) ส่งเป็น query `lastId=xxx`; API ใช้ `.startAfter(cursorDoc)` ใน Firestore
- **การค้นหา (Search):** คำค้นถูก split เป็นคำ (terms); ฝั่ง API ใช้ field `searchKeywords` (array) กับ Firestore `array-contains-any` ดึง candidate แล้ว **refine ใน memory** ให้ตรงทุก term (AND) เพื่อไม่ให้ scan หนัก

### 6.2 ตัวอย่างการดึงรายการสิ่งของ (Dashboard)

1. Client: `getItems({ pageSize: 12, lastId, categories, status, searchQuery })` ใน `lib/db/items` → สร้าง query string ไป GET `/api/items?pageSize=12&lastId=...&categories=...&status=...&search=...`
2. API: ตรวจ token → parse query → สร้าง base query `itemsCollection().orderBy("postedAt", "desc")` + where ตาม category, status, postedBy
3. ถ้ามี search: เพิ่ม `where("searchKeywords", "array-contains-any", terms)` ดึงหลาย doc แล้ว filter ใน memory; ถ้าไม่มี search: limit(pageSize+1), startAfter(cursor)
4. แปลง doc ด้วย `parseItemFromFirestore` (Zod schema ใน `lib/schemas-firestore.ts`) กรอง document ที่ไม่ผ่าน
5. คืน `{ items, lastId, hasMore, totalCount }`; totalCount อาจมาจาก count aggregation แยก เพื่อไม่ต้องดึงทั้งหมด

### 6.3 Cache ฝั่ง Client

- **TanStack Query (React Query):** ใช้ใน `useItems()` กำหนด `queryKey` ตาม filters + หน้า; `staleTime: 2 * 60_000` (2 นาที); ใช้ `placeholderData: keepPreviousData` ตอนเปลี่ยนหน้า
- **API Retry:** เฉพาะ GET/HEAD/OPTIONS retry สูงสุด 2 ครั้ง เมื่อ 429/5xx/network error; write methods ไม่ retry

---

## 7. การแสดงผล (UI Components & Libraries)

### 7.1 โครงสร้าง UI

- **Framework หลัก:** Next.js 16 (App Router) + React 19
- **Styling:** TailwindCSS 4; โทนสีและตัวแปรอยู่ใน theme (background, foreground, primary, muted ฯลฯ)
- **Component ฐาน:** Shadcn/ui (ใช้ Radix UI เป็นหลัก) — Button, Card, Dialog, Input, Select, Tabs, Toast (Sonner), Badge, Skeleton ฯลฯ

### 7.2 การแสดงรูป

- **ที่มา URL:** จาก `public_id` ผ่าน `lib/cloudinary-url.ts` — ใช้ `@cloudinary/url-gen` สร้าง URL พร้อม `format("auto").quality("auto")` (f_auto, q_auto); รองรับ responsive widths (เช่น 400, 800, 1200) สำหรับ srcSet
- **Component:** ใช้ Next.js `Image` หรือ `<img>` ตามความเหมาะสม; ใช้ `resolveImageUrl(publicId, options)` เพื่อได้ URL สำหรับแสดง

### 7.3 การแสดงรายการ (List / Grid)

- **Dashboard:** Grid ของ `ItemCard` (รายการสิ่งของ); โหลด skeleton (`ItemCardSkeletonGrid`) ตอนโหลด
- **การ์ด:** แสดงรูป, ชื่อ, หมวด, สถานะ, เจ้าของ; คลิกเปิด `ItemDetailView` ใน Dialog หรือไป `/item/[id]`

### 7.4 หลายภาษา (i18n)

- **Hook:** `useI18n()` จาก `components/language-provider.tsx` — ได้ `tt(thText, enText)` และ `locale`; ฝั่ง server ใช้ `getServerTranslator()` จาก `lib/i18n/server`
- **Constants:** ข้อความแบบสองภาษาใน `lib/constants.ts` เป็น `BilingualLabel` ({ th, en }); สถานะการแลกเปลี่ยนใน `lib/exchange-state-machine.ts` ก็เป็น bilingual

### 7.5 Animation / UX

- **Framer Motion:** ใช้สำหรับ animation บางส่วน (เช่น landing, scroll reveal)
- **Lenis:** scroll behavior (ถ้ามีใช้)
- **Lottie:** ใช้แสดง animation (ถ้ามี)

---

## 8. Library และเทคโนโลยีที่ใช้

### 8.1 Frontend (แสดงผล + Logic)

| Library | การใช้งาน |
|---------|-----------|
| **Next.js** 16.1.5 | App Router, RSC, API Routes, Turbopack (dev) |
| **React** 19.2.3 | UI, Hooks |
| **TypeScript** 5.x | Type safety ทั้งโปรเจกต์ |
| **TailwindCSS** 4.1.9 | Styling, theme |
| **Radix UI** (หลายตัว) | Dialog, Dropdown, Select, Tabs, Toast ฯลฯ (ผ่าน Shadcn) |
| **Framer Motion** 12.x | Animation |
| **TanStack React Query** 5.x | การดึงข้อมูลแบบ cache, useItems ฯลฯ |
| **React Hook Form** + **@hookform/resolvers** + **Zod** | ฟอร์มและ validation ฝั่ง client |
| **Lucide React** | ไอคอน |
| **Sonner** | Toast แจ้งผล |
| **date-fns** | จัดการวันที่ |
| **lodash** | debounce (ค้นหา), ฟังก์ชันอรรถประโยชน์ |
| **next-themes** | โหมดสว่าง/มืด |
| **@cloudinary/url-gen** | สร้าง URL รูปจาก public_id (f_auto, q_auto) |

### 8.2 Backend & Services

| Library / Service | การใช้งาน |
|-------------------|-----------|
| **Firebase** 12.5.0 (client) | Auth, Firestore (ถ้ามีใช้ realtime ฝั่ง client) |
| **firebase-admin** 13.6.0 | Verify token, อ่าน/เขียน Firestore ฝั่ง API |
| **Zod** 3.25.76 | Schema validation (API body/query, schemas-firestore) |
| **Cloudinary** (cloudinary, @cloudinary/url-gen) | Signed Upload, CDN, สร้าง URL |
| **LINE Messaging API** | Push notification, บอทแชท (ถ้าเปิดใช้) |
| **Upstash Redis** (@upstash/redis, @upstash/ratelimit) | Rate limiting แบบกระจาย |

### 8.3 Development & Testing

| Library | การใช้งาน |
|---------|-----------|
| **Vitest** 4.x | Unit/integration tests |
| **Playwright** 1.57.x | E2E tests (หลาย browser) |
| **ESLint** + **eslint-config-next** | Lint |
| **@ducanh2912/next-pwa** | PWA (offline, installable) |

### 8.4 อื่นๆ

- **Sentry** (@sentry/nextjs): ติดตาม error และ performance
- **Vercel Analytics**: การวิเคราะห์การใช้งาน
- **next-swagger-doc** + **swagger-ui-react**: เอกสาร API (หน้า /api-docs อาจปิดชั่วคราว)

---

## สรุปสำหรับการนำเสนอ

- **ระบบคืออะไร:** แพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษา RMU
- **แต่ละหน้ามีหน้าที่อะไร:** ตั้งแต่ Landing, Dashboard (รายการสิ่งของ), รายละเอียดสิ่งของ, โปรไฟล์, รายการโปรด, การแลกเปลี่ยน, แชท, แจ้งเตือน, Support, รายงาน, ประกาศ, Auth, Consent, และ Admin แต่ละหน้ามีการดึง/ส่งข้อมูลผ่าน API ชัดเจน
- **ส่งข้อมูลยังไง:** ผ่าน HTTP + Bearer Token (Firebase ID Token), ใช้ `authFetch`/`authFetchJson` มี retry สำหรับ GET เมื่อ 429/5xx
- **เก็บข้อมูลยังไง:** Firestore (items, users, exchanges, chatMessages, notifications, reports, announcements, support_tickets, ฯลฯ); รูปเก็บที่ Cloudinary เก็บเฉพาะ public_id ใน Firestore
- **ดึงข้อมูลยังไง:** Cursor-based pagination (lastId); ค้นหาด้วย searchKeywords + array-contains-any แล้ว refine ใน memory; ฝั่ง client ใช้ TanStack Query cache
- **แสดงผลยังไง:** Next.js + React + Tailwind + Radix/Shadcn; รูปจาก Cloudinary URL generator (f_auto, q_auto); i18n TH/EN

ถ้าต้องการเน้นสไลด์เฉพาะส่วน (เช่น แค่ Data Flow หรือแค่แต่ละหน้า) สามารถตัดย่อจากเอกสารนี้ไปใส่ในสไลด์ได้โดยตรง

---

## ขอบเขตของเอกสาร และสิ่งที่ไม่ได้ลงรายละเอียดทุกจุด

เอกสารนี้ **ครอบคลุม flow หลัก โครงสร้างระบบ และการทำงานของทุกหน้าหลัก** ในระดับที่ใช้ตอบคำถามตอนพรีเซนต์ได้ แต่ **ไม่ได้อธิบายทุกบรรทัดโค้ดหรือทุก API endpoint ย่อย** รายการด้านล่างคือสิ่งที่โค้ดมีแต่เอกสารอาจกล่าวถึงแบบสรุปหรือไม่เจาะลึก:

### ที่อาจต้องการเพิ่มถ้าต้องการให้ “ครบทุกอย่างที่โค้ดทำ”

| หัวข้อ | สถานะในเอกสาร | รายละเอียดในโค้ด |
|--------|----------------|-------------------|
| **แชท Real-time** | กล่าวถึงแบบสั้นๆ | หน้าแชทใช้ **Firestore `onSnapshot`** ผ่าน `lib/services/client-firestore.ts` สำหรับข้อความและ typing indicator (ไม่ใช่แค่โพล API) |
| **LINE** | กล่าวถึงแบบรวม | มีหลาย endpoint: webhook, link (GET/POST/PATCH/DELETE), notify-exchange, notify-chat, notify-item, notify-admin, notify-user-action, line-rich-menu; การเชื่อมบัญชี LINE ใช้รหัส 6 หลักและ `lineLinkCode` ใน Firestore |
| **API ย่อยของ Admin** | สรุปเป็นภาพรวม | มี route เพิ่มเช่น consistency, reindex-items, cleanup, cleanup-orphans, exchanges/cleanup-old-completed, users/[id]/delete, reports/[id]/notify-owner, log; แต่ละตัวทำหน้าที่เฉพาะจุด |
| **แชท (API)** | กล่าวถึงรวมในหน้าแชท | มี GET/POST `/api/chat/[exchangeId]/messages`, POST read (read receipt), PATCH/DELETE `messages/[messageId]` (แก้/ลบข้อความ) |
| **การยกเลิกการแลกเปลี่ยน** | กล่าวถึง state machine | มี POST `/api/exchanges/cancel` แยกจาก PATCH `/api/exchanges/[id]` |
| **ลบบัญชีผู้ใช้** | ไม่ได้ระบุชัด | มี DELETE `/api/users/me/delete` |
| **Admin ดูแจ้งเตือนของ user** | กล่าวใน Admin | GET/DELETE `/api/admin/users/[id]/notifications` |
| **Analytics / Health** | ไม่ได้ระบุ | GET `/api/analytics/vitals`, GET `/api/health`, GET `/api/public/stats` |
| **อัปโหลดรูปแบบ POST ตรง** | เน้น Signed Upload | มีทั้ง `/api/upload/sign` (ที่เอกสารเน้น) และ `/api/upload` (POST ตรงไป server ได้ถ้ามีใช้) |
| **Firestore Rules / Security** | กล่าวใน README | เอกสารนี้เน้น flow หลัก; รายละเอียด Security Rules อยู่ใน repo อื่น (และ README) |
| **Cooldown โพสต์** | กล่าวใน PostItemModal | มี rate-limit โพสต์ (cooldown) ฝั่ง client ใน `lib/rate-limit` + loadCooldownFromStorage |
| **Draft / บันทึกฉบับร่าง** | กล่าวใน collections | มี collection `drafts`; เอกสารไม่ได้อธิบาย flow การบันทึก/โหลดดราฟต์ |
| **Admin Reports ดึงรายละเอียด** | ไม่ได้ระบุ | หน้า admin/reports ใช้ `getDocById` จาก `client-firestore` เพื่อดึงรายละเอียดของ report target (item/exchange/user) |

### สรุปคำตอบคำถาม “ครบถ้วนละเอียด บอกทุกอย่างที่โค้ดทำงานเลยใช่ไหม”

- **ครบถ้วนสำหรับการพรีเซนต์:** ใช่ — ภาพรวมระบบ แต่ละหน้าหลัก การส่ง/เก็บ/ดึงข้อมูล และ tech stack ครอบคลุม
- **ละเอียดระดับ “ทุกอย่างที่โค้ดทำ”:** ตอนนี้มีเอกสารฉบับเต็ม 3 ไฟล์ด้านบน — [PRESENTATION-API-COMPLETE.md](PRESENTATION-API-COMPLETE.md) (ทุก API), [PRESENTATION-PAGES-COMPLETE.md](PRESENTATION-PAGES-COMPLETE.md) (ทุกหน้า), [PRESENTATION-LIB-FUNCTIONS.md](PRESENTATION-LIB-FUNCTIONS.md) (ทุกฟังก์ชันหลักใน lib) — ใช้ร่วมกับคู่มือหลักได้ครบทุกส่วน
