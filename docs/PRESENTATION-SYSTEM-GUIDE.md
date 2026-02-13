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
│  CLIENT (Browser / PWA)                                          │
│  Next.js 16 App Router │ React 19 │ TailwindCSS 4                 │
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

### 3.1 หน้า Landing (/) — หน้าแรกก่อนล็อกอิน

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | หน้าแนะนำแพลตฟอร์ม สำหรับผู้ใช้ที่ยังไม่ได้ล็อกอิน |
| **ทำงานยังไง** | เป็น **Server Component** โหลดข้อความจาก `getServerTranslator()` (i18n) แสดง Hero, ฟีเจอร์, ขั้นตอนการใช้งาน, ปุ่มไป Dashboard / Register |
| **ใช้งานยังไง** | ผู้ใช้คลิก "เริ่มต้นใช้งาน" ไป `/dashboard` หรือ "สมัครสมาชิก" ไป `/register` |
| **ส่ง/ดึงข้อมูล** | ไม่เรียก API ข้อมูล; ข้อความมาจาก `lib/i18n/messages` (server-side) |
| **แสดงผล** | ใช้ `LandingHero3D`, `LandingStats`, `ScrollReveal`, `Card`, `Badge`, `Button`; รองรับ TH/EN ผ่าน Language Switcher |

---

### 3.2 หน้า Dashboard (/dashboard) — หน้าหลักหลังล็อกอิน

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | หน้ารายการสิ่งของทั้งหมด พร้อมค้นหา กรองหมวดหมู่/สถานะ และแบ่งหน้า |
| **ทำงานยังไง** | Client Component ใช้ `useItems()` (hook ที่เรียก `getItems()` จาก `lib/firestore` → `/api/items`) ส่งพารามิเตอร์ categories, status, searchQuery, pageSize, lastId; ค้นหาจะ **debounce 500ms** ก่อนส่งไป API |
| **ใช้งานยังไง** | เลือกหมวดหมู่/สถานะใน FilterSidebar พิมพ์ค้นหา กดดูรายละเอียดใน Dialog หรือไป `/item/[id]`; กด "โพสต์สิ่งของ" เปิด PostItemModal |
| **ส่งข้อมูล** | GET `/api/items?categories=...&status=...&search=...&pageSize=12&lastId=...` ผ่าน `authFetchJson` (มี Bearer token) |
| **ดึงข้อมูล** | API อ่าน Firestore collection `items` ด้วย filter (category, status, postedBy) + pagination แบบ cursor (lastId) + ถ้ามี search ใช้ `searchKeywords` array-contains-any แล้ว refine ใน memory; คืน items พร้อม totalCount, hasMore, lastId |
| **เก็บข้อมูล** | ไม่ได้เขียนจากหน้านี้โดยตรง; การโพสต์ทำใน Modal → POST `/api/items` |
| **แสดงผล** | `ItemCard` แต่ละรายการ, `ItemCardSkeletonGrid` ตอนโหลด, `FilterSidebar`, `ItemDetailView` ใน Dialog (Radix Dialog), Pagination ปุ่มก่อนหน้า/ถัดไป; ใช้ TanStack Query (useQuery) cache 2 นาที, placeholderData ระหว่างเปลี่ยนหน้า |

---

### 3.3 หน้ารายละเอียดสิ่งของ (/item/[id])

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | หน้าแสดงรายละเอียดสิ่งของหนึ่งรายการ (รูป, ชื่อ, คำอธิบาย, หมวด, สถานะ, เจ้าของ, ปุ่มขอรับ/รายการโปรด) |
| **ทำงานยังไง** | Client Component ใช้ `getItemById(id)` จาก `lib/firestore` → GET `/api/items/[id]` โหลดครั้งเดียวเมื่อเข้าหน้า (มี cancelled check ป้องกัน setState หลัง unmount) |
| **ใช้งานยังไง** | ดูรายละเอียด กด "ขอรับสิ่งของ" เปิดฟอร์มส่งคำขอ กดหัวใจเพื่อเพิ่ม/ลบรายการโปรด คลิกชื่อเจ้าของไปโปรไฟล์สาธารณะ |
| **ส่งข้อมูล** | GET `/api/items/[id]`; การขอรับ → POST `/api/exchanges`; รายการโปรด → POST/DELETE `/api/favorites` |
| **ดึงข้อมูล** | API อ่าน Firestore `items/[id]` แปลงด้วย `parseItemFromFirestore` ส่งกลับ; ถ้าไม่พบคืน 404 |
| **แสดงผล** | `ItemDetailView` (รูปจาก Cloudinary `resolveImageUrl`), Badge สถานะ, ปุ่มจาก Radix/Shadcn |

---

### 3.4 หน้าโปรไฟล์ของฉัน (/profile) และโปรไฟล์สาธารณะ (/profile/[uid])

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | /profile = ดู/แก้ไขโปรไฟล์ตัวเอง; /profile/[uid] = ดูโพสและรีวิวของ user อื่น (สาธารณะ) |
| **ทำงานยังไง** | โปรไฟล์ตัวเอง: เรียก GET `/api/users/me` (และ PATCH แก้ไข, POST accept-terms); โปรไฟล์สาธารณะ: GET `/api/users/[id]` ไม่ต้อง auth; รายการโพสใช้ `getItems({ postedBy: uid })` → GET `/api/items?postedBy=...`; รีวิวใช้ GET `/api/reviews?targetUserId=...` |
| **ใช้งานยังไง** | แก้ชื่อ/รูป/สาย LINE; ดูโพสและรีวิวของตัวเองหรือของคนอื่น |
| **ส่ง/ดึงข้อมูล** | ดูหัวข้อ API ด้านบน; รูปโปรไฟล์อัปโหลดผ่าน `/api/upload/sign` แล้วส่ง public_id ไป PATCH `/api/users/me` |
| **เก็บข้อมูล** | users collection; รูปใน Cloudinary |

---

### 3.5 หน้ารายการโปรด (/favorites)

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | แสดงสิ่งของที่ผู้ใช้เพิ่มเป็นรายการโปรด |
| **ทำงานยังไง** | เรียก GET `/api/favorites` ได้รายการ item ids แล้วโหลดรายละเอียด item (หรือ API คืน items พร้อม isFavorite); ลบรายการโปรด = DELETE `/api/favorites/[itemId]` |
| **ส่ง/ดึงข้อมูล** | GET `/api/favorites`; API อ่าน subcollection หรือ collection ที่เก็บ favorite ของ user แล้วดึง items ที่ตรงกับ ids |
| **เก็บข้อมูล** | เก็บความสัมพันธ์ user–item (เช่น favorites หรือ favorites subcollection ภายใต้ users) ใน Firestore |

---

### 3.6 หน้าคำขอแลกเปลี่ยนของฉัน (/my-exchanges)

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | รายการคำขอแลกเปลี่ยนที่ผู้ใช้เป็นเจ้าของหรือเป็นผู้ขอ |
| **ทำงานยังไง** | เรียก GET `/api/exchanges` ได้รายการ exchange; แต่ละรายการมีสถานะ (pending, in_progress, completed, cancelled, rejected) ตาม State Machine ใน `lib/exchange-state-machine.ts`; ยืนยัน/ปฏิเสธ ผ่าน POST `/api/exchanges/respond`; อัปเดตสถานะ (ยืนยันส่งมอบ/รับของ) ผ่าน PATCH `/api/exchanges/[id]`; ซ่อนจากรายการ = POST `/api/exchanges/[id]/hide` |
| **ใช้งานยังไง** | ดูสถานะ กดไปแชท กดยืนยัน/ปฏิเสธ หรือยืนยันส่งมอบ/รับของ |
| **ส่ง/ดึงข้อมูล** | GET `/api/exchanges`; POST respond; PATCH/POST hide; API อ่าน/เขียน collection `exchanges` ตรวจสอบสิทธิ์และ state transition |
| **เก็บข้อมูล** | Firestore `exchanges`; สถานะเปลี่ยนตาม `VALID_TRANSITIONS` (pending → in_progress/rejected/cancelled; in_progress → completed/cancelled) |

---

### 3.7 หน้าแชท (/chat/[exchangeId])

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | หน้าสนทนาระหว่างเจ้าของสิ่งของกับผู้ขอรับ ภายในหนึ่งการแลกเปลี่ยน |
| **ทำงานยังไง** | โหลด exchange และข้อความจาก GET `/api/exchanges/[id]` และ messages ของ exchange; ส่งข้อความ POST ไป API messages; มี Real-time ได้จาก Firestore listener ใน `lib/services/client-firestore.ts` (ถ้าใช้) หรือโพลจาก API |
| **ใช้งานยังไง** | พิมพ์ข้อความส่ง; แนบรูป (อัปโหลด Cloudinary แล้วส่ง URL ในข้อความ); กดชื่ออีกฝ่ายไปโปรไฟล์สาธารณะ |
| **ส่ง/ดึงข้อมูล** | ข้อความเก็บใน subcollection `exchanges/[exchangeId]/chatMessages`; API อ่าน/เขียนผ่าน route ที่เกี่ยวกับ exchanges และ messages |
| **เก็บข้อมูล** | Firestore `exchanges` + subcollection `chatMessages` (senderId, message, createdAt, imageUrl ถ้ามี) |

---

### 3.8 หน้าแจ้งเตือน (/notifications)

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | รายการแจ้งเตือนในแอป (การแลกเปลี่ยน, แชท, ซัพพอร์ต, รายงาน, คำเตือน, ระบบ) |
| **ทำงานยังไง** | เรียก GET `/api/notifications` แบบแบ่งหน้า (pagination); PATCH `/api/notifications/[id]` = อ่านแล้ว; POST `/api/notifications/read-all` = อ่านทั้งหมด; DELETE ลบรายการ |
| **ใช้งานยังไง** | เลือกแท็บทั้งหมด/ยังไม่อ่าน/แยกตามประเภท; กดเข้าลิงก์ที่แนบมา; อ่านทั้งหมด / ลบ |
| **ส่ง/ดึงข้อมูล** | GET with pageSize, lastId, types, unreadOnly; API อ่าน collection `notifications` กรองตาม userId และพารามิเตอร์ |
| **เก็บข้อมูล** | Firestore `notifications` (userId, type, readAt, payload ลิงก์/ข้อความ) |

---

### 3.9 หน้า Support (/support)

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | หน้ารายการคำร้องขอความช่วยเหลือของฉัน และช่องตอบกลับกับแอดมิน |
| **ทำงานยังไง** | GET `/api/support` = รายการ ticket; POST `/api/support` = สร้าง ticket (หัวข้อ + รายละเอียด); GET/POST `/api/support/[ticketId]/messages` = อ่าน/ส่งข้อความใน ticket |
| **ใช้งานยังไง** | เปิด SupportTicketModal ส่งคำร้อง; เลือก ticket เพื่อดูข้อความและตอบกลับ |
| **ส่ง/ดึงข้อมูล** | ดู API ด้านบน; เก็บใน `support_tickets` และ subcollection `messages` |
| **เก็บข้อมูล** | Firestore `support_tickets` + `support_tickets/[id]/messages` |

---

### 3.10 หน้ารายงานปัญหา (/report)

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | ฟอร์มส่งรายงานปัญหา (รายงานสิ่งของ/การแลกเปลี่ยน/ผู้ใช้) |
| **ทำงานยังไง** | เลือกประเภทและเหตุผล กรอกรายละเอียด (และแนบรูปถ้ามี); POST `/api/reports` ผ่าน `report-service` ฝั่ง server; ต้อง termsAccepted |
| **ส่ง/ดึงข้อมูล** | POST only; API ตรวจ terms + สร้าง document ใน `reports` และอาจสร้างแจ้งเตือนให้แอดมิน |
| **เก็บข้อมูล** | Firestore `reports` (reportType, reasonCode, description, reporterId, targetId, evidenceUrls ฯลฯ) |

---

### 3.11 หน้าประกาศ (/announcements)

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | ประวัติประกาศย้อนหลัง (แบนเนอร์ที่แสดงใต้ Navbar มาจาก API อื่น) |
| **ทำงานยังไง** | GET `/api/announcements/history` ไม่ต้อง auth; แสดงรายการประกาศที่เคย/กำลังแสดง |
| **ดึงข้อมูล** | API อ่าน `announcements` กรองตามเวลา/สถานะ คืนรายการที่เหมาะสม |

---

### 3.12 แถบประกาศ (Announcement Banner) — Component ใต้ Navbar

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | แถบประกาศแบบเรียลไทม์ แสดงใต้ Navbar (ความกว้างจำกัด max-w-4xl จัดกลาง) |
| **ทำงานยังไง** | Client เรียก GET `/api/announcements` (ไม่ต้อง auth) ได้รายการประกาศ + `nextCheckInMs`; เมื่อถึงเวลาโหลดซ้ำอัตโนมัติ; ปิดประกาศได้ เก็บ id ที่ปิดใน localStorage (`announcements_dismissed`) |
| **ใช้งานยังไง** | อ่านประกาศ กดปิดได้; Breadcrumb ปรับตำแหน่ง (top) ตามว่ามีประกาศหรือไม่ ผ่าน `AnnouncementContext` |
| **ดึงข้อมูล** | GET `/api/announcements`; API คืน announcements ที่ isActive และอยู่ในช่วง startAt–endAt |
| **เก็บข้อมูล** | Firestore `announcements`; สถานะปิดแค่ฝั่ง client (localStorage) |

---

### 3.13 หน้าเข้าสู่ระบบ (/login), ลงทะเบียน (/register), ยืนยันอีเมล (/verify-email), ยอมรับข้อกำหนด (/consent), ลืมรหัส (/forgot-password)

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | หน้าสำหรับ Authentication และ Consent |
| **ทำงานยังไง** | ใช้ Firebase Auth (อีเมล/รหัสผ่าน); ลงทะเบียนตรวจอีเมล @rmu.ac.th; หลังล็อกอินถ้ายังไม่ยอมรับข้อกำหนด ConsentGuard ส่งไป `/consent`; ยอมรับแล้วเรียก POST `/api/users/me/accept-terms` |
| **ส่ง/ดึงข้อมูล** | Firebase Auth บน client; ฝั่ง API ใช้ Firebase Admin `verifyIdToken`; ข้อมูล user เก็บใน Firestore `users` (สร้าง/อัปเดตเมื่อ GET `/api/users/me`) |
| **เก็บข้อมูล** | Firebase Auth (accounts); Firestore `users` (displayName, termsAccepted, termsAcceptedAt, status, LINE ฯลฯ) |

---

### 3.14 หน้า Admin (/admin, /admin/items, /admin/users, /admin/reports, /admin/support, /admin/announcements, /admin/exchanges, /admin/logs)

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | แดชบอร์ดและหน้าจัดการสำหรับผู้ดูแลระบบ |
| **ทำงานยังไง** | ใช้ `useAdminGuard()` ตรวจสิทธิ์ (เรียก `/api/admin/verify`); โหลดข้อมูลผ่าน `/api/admin/stats`, `/api/admin/items`, `/api/admin/users`, `/api/admin/reports`, `/api/admin/support` ฯลฯ แบบแบ่งหน้า; จัดการผู้ใช้ (suspend/unsuspend, คำเตือน, ลบ), จัดการสิ่งของ/รายงาน/support/ประกาศ/การแลกเปลี่ยน; ดู Activity Logs |
| **ใช้งานยังไง** | เลือกเมนูไปแต่ละส่วน; กรอง/แบ่งหน้า; กดดำเนินการ (อนุมัติ, ปฏิเสธ, ตอบ ticket ฯลฯ) |
| **ส่ง/ดึงข้อมูล** | ทุกอย่างผ่าน Admin API; API ตรวจ isAdmin จาก Firestore แล้วอ่าน/เขียน collections ที่เกี่ยวข้อง |
| **เก็บข้อมูล** | ใช้ collections เดียวกับฝั่ง user บวก `adminLogs`, `userWarnings`, `cases` ฯลฯ ตามที่ออกแบบ |

---

### 3.15 หน้าเอกสาร (Guide, Terms, Privacy, Guidelines) — /guide, /terms, /privacy, /guidelines

| รายการ | รายละเอียด |
|--------|-------------|
| **คืออะไร** | หน้าเนื้อหาเอกสาร นโยบาย และแนวทางใช้งาน |
| **ทำงานยังไง** | Server/Client โหลดข้อความจาก i18n (TH/EN); ไม่เรียก API ข้อมูลธุรกิจ |
| **แสดงผล** | Markdown หรือข้อความจาก `lib/i18n/messages` |

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

- **localStorage:** ภาษาที่เลือก (`rmu_locale`), รายการ id ประกาศที่ปิดแล้ว (`announcements_dismissed`), cooldown โพสต์ (ถ้ามี)
- **Cookie:** ใช้ร่วมกับ locale (ตามที่กำหนดใน i18n)

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
