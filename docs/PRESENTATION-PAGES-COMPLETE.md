# รายการหน้าทั้งหมด (ทุก Page) — สำหรับพรีเซนต์โครงงานจบ

เอกสารนีรรายการ **ทุกหน้า (route)** ในแอป พร้อมไฟล์ component, หน้าที่, API/Hooks ที่เรียก, และการแสดงผล

---

## โครงสร้าง Route (App Router)

- ไฟล์ `app/**/page.tsx` = หน้า (route ตามโฟลเดอร์)
- `(auth)` = route group ไม่รวมใน URL

---

## 1. หน้า Landing และ Auth (ไม่ต้องล็อกอิน)

### 1.1 `/` — หน้าแรก (Landing)

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/page.tsx` |
| **ประเภท** | Server Component (async) |
| **หน้าที่** | แนะนำแพลตฟอร์ม แสดง Hero, ฟีเจอร์, ขั้นตอนใช้งาน, สถิติ, ปุ่มเริ่มต้น/สมัคร |
| **ข้อมูล** | ข้อความจาก `getServerTranslator()` (i18n); ไม่เรียก API ข้อมูล |
| **Component หลัก** | `LandingHero3D`, `LandingStats`, `ScrollReveal`, `Card`, `Badge`, `Button`, `Logo`, `LanguageSwitcher`, `ModeToggle` |
| **ลิงก์** | `/dashboard`, `/register`, `/login`, `/guide` |

### 1.2 `/login` — เข้าสู่ระบบ

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/(auth)/login/page.tsx` |
| **หน้าที่** | ฟอร์มล็อกอินอีเมล/รหัสผ่าน ผ่าน Firebase Auth |
| **ข้อมูล** | Firebase Auth signInWithEmailAndPassword; หลังล็อกอิน redirect ไป dashboard หรือ /consent |
| **Component** | ฟอร์ม, ปุ่มลืมรหัส (ไป /forgot-password) |

### 1.3 `/register` — ลงทะเบียน

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/(auth)/register/page.tsx` |
| **หน้าที่** | ฟอร์มสมัครสมาชิก (อีเมล @rmu.ac.th, รหัสผ่าน); ส่งอีเมลยืนยัน |
| **ข้อมูล** | Firebase Auth createUserWithEmailAndPassword; ตรวจอีเมล RMU |

### 1.4 `/verify-email` — ยืนยันอีเมล

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/(auth)/verify-email/page.tsx` |
| **หน้าที่** | แสดงข้อความให้ผู้ใช้ไปกดลิงก์ในอีเมล; ปุ่มเปิด Gmail |
| **ข้อมูล** | ตรวจสถานะ emailVerified จาก Firebase Auth |

### 1.5 `/forgot-password` — ลืมรหัสผ่าน

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/(auth)/forgot-password/page.tsx` |
| **หน้าที่** | ฟอร์มกรอกอีเมล ส่งลิงก์รีเซ็ตรหัสผ่าน |
| **ข้อมูล** | Firebase Auth sendPasswordResetEmail |

### 1.6 `/consent` — ยอมรับข้อกำหนดและนโยบาย

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/(auth)/consent/page.tsx` |
| **หน้าที่** | แสดงข้อกำหนดการใช้และนโยบายความเป็นส่วนตัว; ปุ่มยอมรับ |
| **ข้อมูล** | POST `/api/users/me/accept-terms` หลังกดยอมรับ; ConsentGuard ส่งผู้ที่ยังไม่ยอมรับมาหน้านี้ |

---

## 2. หน้าหลักผู้ใช้ (ต้องล็อกอิน)

### 2.1 `/dashboard` — หน้าหลักหลังล็อกอิน

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/dashboard/page.tsx` |
| **ประเภท** | Client Component |
| **หน้าที่** | แสดงรายการสิ่งของ ค้นหา (debounce 500ms), กรองหมวดหมู่/สถานะ, แบ่งหน้า; เปิด modal รายละเอียดหรือโพสต์สิ่งของ |
| **Hooks/API** | `useItems()` → `getItems()` จาก `lib/firestore` → GET `/api/items`; `useAuth()`, `useI18n()` |
| **State** | categories, status, searchQuery, debouncedSearchQuery, selectedItem |
| **Component** | `FilterSidebar`, `ItemCard`, `ItemCardSkeletonGrid`, `ItemDetailView`, `Dialog`, ปุ่ม pagination, ช่องค้นหา |
| **หมายเหตุ** | ใช้ TanStack Query ใน useItems; placeholderData ระหว่างเปลี่ยนหน้า |

### 2.2 `/item/[id]` — รายละเอียดสิ่งของ

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/item/[id]/page.tsx` |
| **หน้าที่** | แสดงรายละเอียดสิ่งของหนึ่งรายการ; ปุ่มขอรับ, รายการโปรด; ลิงก์ไปโปรไฟล์เจ้าของ |
| **API** | `getItemById(id)` → GET `/api/items/[id]`; ขอรับ → POST `/api/exchanges`; โปรด → POST/DELETE `/api/favorites` |
| **Component** | `ItemDetailView`, `Button`, โหลดด้วย Loader2 |

### 2.3 `/profile` — โปรไฟล์ของฉัน

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/profile/page.tsx` |
| **หน้าที่** | ดู/แก้ไขโปรไฟล์ (displayName, รูป, bio), การตั้งค่า LINE, ยอมรับข้อกำหนด |
| **API** | GET/PATCH `/api/users/me`; POST `/api/users/me/accept-terms`; GET/PATCH `/api/line/link`; อัปโหลดรูปผ่าน `/api/upload/sign` + Cloudinary |

### 2.4 `/profile/[uid]` — โปรไฟล์สาธารณะ

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/profile/[uid]/page.tsx` |
| **หน้าที่** | แสดงโพสและรีวิวของ user อื่น; คลิกการ์ดเปิด modal รายละเอียดสิ่งของ |
| **API** | GET `/api/users/[id]`; `getItems({ postedBy: uid })`; GET `/api/reviews?targetUserId=uid` |

### 2.5 `/favorites` — รายการโปรด

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/favorites/page.tsx` |
| **หน้าที่** | แสดงสิ่งของที่เพิ่มเป็นรายการโปรด; ลบจากรายการโปรด |
| **API** | GET `/api/favorites`; DELETE `/api/favorites/[itemId]` |
| **Component** | Grid การ์ด, Empty state, Report modal (ถ้ามี) |

### 2.6 `/my-exchanges` — การแลกเปลี่ยนของฉัน

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/my-exchanges/page.tsx` |
| **หน้าที่** | รายการคำขอแลกเปลี่ยน (เป็นเจ้าของหรือผู้ขอ); ยืนยัน/ปฏิเสธ, ยืนยันส่งมอบ/รับของ, ซ่อนจากรายการ, ไปแชท |
| **API** | GET `/api/exchanges`; POST `/api/exchanges/respond`; POST `/api/exchanges/confirm`; PATCH `/api/exchanges/[id]`; POST `/api/exchanges/[id]/hide`; POST `/api/exchanges/cancel` |
| **Component** | `ExchangeStepIndicator`, `ExchangeActionDialogs`, การ์ดรายการ |

### 2.7 `/chat/[exchangeId]` — แชท

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/chat/[exchangeId]/page.tsx` |
| **หน้าที่** | สนทนาระหว่างเจ้าของกับผู้ขอรับ; Real-time ข้อความและ typing ผ่าน Firestore onSnapshot |
| **API / Logic** | GET `/api/exchanges/[id]`; GET/POST `/api/chat/[exchangeId]/messages`; `subscribeToExchange`, `subscribeToChatMessages`, `setChatTyping`, `subscribeToChatTyping` จาก `lib/services/client-firestore.ts` |
| **Component** | รายการข้อความ, ช่องพิมพ์, แสดงชื่ออีกฝ่าย (ลิงก์ไปโปรไฟล์) |

### 2.8 `/notifications` — แจ้งเตือน

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/notifications/page.tsx` |
| **หน้าที่** | รายการแจ้งเตือน; แท็บทั้งหมด/ยังไม่อ่าน/แยกตามประเภท; อ่านทั้งหมด, ลบ |
| **API** | GET `/api/notifications` (pagination); PATCH `/api/notifications/[id]`; POST `/api/notifications/read-all`; DELETE `/api/notifications/[id]` |
| **Component** | Tabs, Card รายการ, ปุ่มอ่านทั้งหมด/ลบ |

### 2.9 `/support` — ซัพพอร์ต

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/support/page.tsx` |
| **หน้าที่** | รายการคำร้องของฉัน; เปิด modal สร้างคำร้อง; เลือก ticket อ่านข้อความและตอบกลับ |
| **API** | GET `/api/support`; POST `/api/support`; POST `/api/support/[ticketId]/messages` |
| **Component** | `SupportTicketModal`, Card ticket, Dialog ข้อความ |

### 2.10 `/report` — รายงานปัญหา

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/report/page.tsx` |
| **หน้าที่** | ฟอร์มส่งรายงาน (ประเภท: สิ่งของ/การแลกเปลี่ยน/ผู้ใช้; เหตุผล; รายละเอียด; แนบรูป) |
| **API** | POST `/api/reports` (ผ่าน report-service) |
| **Component** | ฟอร์ม, Select ประเภท/เหตุผล, ช่องอัปโหลดรูป |

### 2.11 `/announcements` — ประวัติประกาศ

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/announcements/page.tsx` |
| **หน้าที่** | แสดงประวัติประกาศย้อนหลัง |
| **API** | GET `/api/announcements/history` |

---

## 3. หน้าเอกสาร (ไม่ต้องล็อกอิน / ใช้ i18n)

### 3.1 `/guide` — คู่มือการใช้งาน

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/guide/page.tsx` |
| **หน้าที่** | แสดงเนื้อหาคู่มือ (TH/EN จาก i18n) |

### 3.2 `/terms` — ข้อกำหนดการใช้

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/terms/page.tsx` |
| **หน้าที่** | ข้อกำหนดการใช้บริการ |

### 3.3 `/privacy` — นโยบายความเป็นส่วนตัว

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/privacy/page.tsx` |
| **หน้าที่** | นโยบายความเป็นส่วนตัว |

### 3.4 `/guidelines` — แนวทางชุมชน

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/guidelines/page.tsx` |
| **หน้าที่** | แนวทางสำหรับผู้ใช้ |

### 3.5 `/about` — เกี่ยวกับเรา

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/about/page.tsx` |
| **หน้าที่** | หน้าเกี่ยวกับแอป/ทีม (อาจปิดแสดงในเมนู) |

### 3.6 `/api-docs` — เอกสาร API (Swagger)

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/api-docs/page.tsx` |
| **หน้าที่** | แสดง Swagger UI สำหรับ API (อาจปิดใช้งานชั่วคราว) |

---

## 4. หน้า Admin (ต้องเป็น Admin)

### 4.1 `/admin` — แดชบอร์ดแอดมิน

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/admin/page.tsx` |
| **หน้าที่** | สรุปสถิติและลิงก์ไปหน้าจัดการ (items, users, reports, support, announcements, exchanges, logs) |
| **Hooks/API** | `useAdminDashboardData()` → GET `/api/admin/stats`, `/api/admin/items`, `/api/admin/reports`, `/api/admin/support` ฯลฯ; `useAdminGuard()` → GET `/api/admin/verify` |
| **Component** | `DashboardOverview` (lazy), แท็บ/การ์ดสถิติ |

### 4.2 `/admin/items` — จัดการสิ่งของ

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/admin/items/page.tsx` |
| **หน้าที่** | List แก้ไข ลบ สิ่งของ (pagination) |
| **API** | GET `/api/admin/items`; GET/PATCH/DELETE `/api/admin/items/[id]` |

### 4.3 `/admin/users` — จัดการผู้ใช้

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/admin/users/page.tsx` |
| **หน้าที่** | List ผู้ใช้; เปลี่ยนสถานะ (suspend/unsuspend/ban), ออกคำเตือน, ลบ |
| **API** | GET `/api/admin/users`; GET/PATCH `/api/admin/users/[id]`; POST status/warning; DELETE user |

### 4.4 `/admin/reports` — จัดการรายงาน

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/admin/reports/page.tsx` |
| **หน้าที่** | List รายงาน; ดูรายละเอียด (ใช้ getDocById จาก client-firestore สำหรับ target); อัปเดตสถานะ; แจ้งเจ้าของรายงาน |
| **API** | GET `/api/admin/reports`; GET/PATCH `/api/admin/reports/[id]`; POST notify-owner |

### 4.5 `/admin/support` — จัดการคำร้อง

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/admin/support/page.tsx` |
| **หน้าที่** | List ticket; ตอบกลับ; เปลี่ยนสถานะ |
| **API** | GET `/api/admin/support`; POST `/api/admin/support/[ticketId]/reply`; PATCH status |

### 4.6 `/admin/announcements` — จัดการประกาศ

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/admin/announcements/page.tsx` |
| **หน้าที่** | CRUD แบนเนอร์ประกาศ (ช่วงเวลา, isActive, รูป) |
| **API** | GET/POST `/api/admin/announcements`; GET/PATCH/DELETE `/api/admin/announcements/[id]` |

### 4.7 `/admin/exchanges` — จัดการการแลกเปลี่ยน

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/admin/exchanges/page.tsx` |
| **หน้าที่** | List การแลกเปลี่ยน; ลบ (admin) |
| **API** | GET `/api/admin/exchanges`; DELETE `/api/admin/exchanges/[id]` |

### 4.8 `/admin/logs` — Activity Logs

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/admin/logs/page.tsx` |
| **หน้าที่** | แสดงประวัติการดำเนินการของแอดมิน |
| **API** | ดึงจาก adminLogs (ผ่าน API หรือ lib/db/logs) |

### 4.9 `/admin/data` — ข้อมูลระบบ (Admin Data)

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/admin/data/page.tsx` |
| **หน้าที่** | หน้าข้อมูล/สถิติเพิ่มเติม (อาจไม่แสดงในเมนู) |

### 4.10 `/admin/line-test` — ทดสอบ LINE

| รายการ | รายละเอียด |
|--------|-------------|
| **ไฟล์** | `app/admin/line-test/page.tsx` |
| **หน้าที่** | ทดสอบส่งข้อความ LINE |
| **API** | POST `/api/admin/line-test` |

---

## 5. Components ร่วมที่ใช้หลายหน้า

- **Navbar / Layout:** มีแถบประกาศ (`AnnouncementBanner`), Breadcrumb (`BreadcrumbBar`), Language Switcher, โหมดสว่าง/มืด
- **ConsentGuard:** ส่งผู้ที่ยังไม่ยอมรับข้อกำหนดไป `/consent`
- **AuthProvider:** ให้ `user`, `loading`, `isAdmin` ผ่าน `useAuth()`
- **LanguageProvider:** ให้ `tt()`, `locale` ผ่าน `useI18n()`
- **PostItemModal:** ฟอร์มโพสต์สิ่งของ (อัปโหลดรูปผ่าน sign + Cloudinary, cooldown โพสต์)
- **SupportTicketModal:** ฟอร์มสร้างคำร้องซัพพอร์ต
- **ItemDetailView:** แสดงรายละเอียดสิ่งของ (ใช้ใน Dashboard dialog และ /item/[id])
- **FilterSidebar:** กรองหมวดหมู่และสถานะ (Dashboard)
- **ItemCard / ItemCardSkeletonGrid:** การ์ดสิ่งของและ skeleton โหลด

---

## สรุปจำนวนหน้า

| กลุ่ม | จำนวน |
|--------|--------|
| Landing + Auth | 6 (/, login, register, verify-email, forgot-password, consent) |
| หน้าหลักผู้ใช้ | 11 (dashboard, item/[id], profile, profile/[uid], favorites, my-exchanges, chat/[exchangeId], notifications, support, report, announcements) |
| หน้าเอกสาร | 6 (guide, terms, privacy, guidelines, about, api-docs) |
| Admin | 10 (admin, items, users, reports, support, announcements, exchanges, logs, data, line-test) |
| **รวม** | **33 หน้า (page.tsx)** |
