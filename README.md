# RMU-Campus X

**ระบบแพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษา มหาวิทยาลัยราชภัฏมหาสารคาม**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.5-black?logo=next.js)](https://nextjs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3.6-f9f1e1?logo=bun)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12.5-orange?logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-130%20unit%20%7C%2084%20e2e-success)]()

---

## Project Notes

- Primary project documentation now lives in this `README.md` and `.env.example`.
- Client-side data flows should go through Next.js API routes via `lib/api-client` / `authFetchJson`, not direct Firestore writes from browser code.
- Shared security helpers remain in `lib/security.ts`, including `sanitizeText`, `sanitizeUrl`, `sanitizeFilename`, `generateSafeId`, and related validation helpers used by schemas and route handlers.

---

## 🌐 Multilingual Support (TH/EN)

- รองรับ 2 ภาษา: **ไทย (`th`)** และ **อังกฤษ (`en`)**
- ผู้ใช้สลับภาษาได้จาก **Language Switcher** บนหน้าเว็บ (client-side) พร้อมจำค่าภาษาใน cookie/localStorage
- ระบบเลือกภาษาเริ่มต้นจาก `rmu_locale` cookie และรองรับ server-side locale resolution
- ครอบคลุมหน้าใช้งานหลักทั้งฝั่ง User และ Admin รวมถึงเอกสารสำคัญ (Guide / Terms / Privacy / Guidelines)
- โครงสร้าง i18n หลัก:
  - `components/language-provider.tsx` — `useI18n()` hook (`tt()`, `locale`)
  - `components/language-switcher.tsx`
  - `lib/i18n/config.ts`
  - `lib/i18n/messages.ts`
  - `lib/i18n/translate.ts`
  - `lib/i18n/server.ts`
  - `lib/constants.ts` — label constants ใช้ `BilingualLabel` type (`{ th, en }`)
  - `lib/exchange-state-machine.ts` — exchange status labels เป็น bilingual

---

## 🏗 สถาปัตยกรรมระบบ (System Architecture)

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 16 (App Router)  │  React 19  │  TailwindCSS 4         │
│  ────────────────────────────────────────────────────────────── │
│  • Server Components (RSC)                                      │
│  • Client Components for Interactivity                          │
│  • Streaming & Suspense                                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API LAYER (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  /api/items/*     │  /api/users/me     │  /api/favorites/*     │
│  /api/exchanges/* │  /api/notifications│  /api/reviews         │
│  /api/admin/*     │  /api/announcements│  /api/reports         │
│  /api/support     │  /api/line/*       │  /api/upload/*, health│
│  ────────────────────────────────────────────────────────────── │
│  • Client เรียก API เป็นหลัก (lib/api-client, authFetchJson)   │
│  • Retry + Exponential Backoff (429/5xx/network), Retry-After  │
│  • Rate Limiting (Upstash Redis) + termsAccepted ใน API       │
│  • Firebase Admin SDK Authentication                            │
│  • Server-Side Validation & Type Safety                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Firebase          │  Cloudinary      │  LINE Messaging API     │
│  ─────────────────────────────────────────────────────────────  │
│  • Firestore DB    │  • Image CDN     │  • Push Notifications   │
│  • Authentication  │  • Signed Upload │  • Account Linking      │
│  • Admin SDK       │  • f_auto/q_auto │  • Rich Messages        │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

- **Retry policy details:** retry is limited to idempotent methods (`GET`, `HEAD`, `OPTIONS`); write methods (`POST`, `PATCH`, `PUT`, `DELETE`) are single-attempt to avoid duplicate mutations.

- **Client → API:** ฟีเจอร์หลักโหลดผ่าน API ทั้งหมด (dashboard, profile, admin, notifications, exchanges, reviews, reports, **support**) — เรียกผ่าน `lib/api-client` (`authFetch` / `authFetchJson`) มี retry + exponential backoff เมื่อได้ 429, 5xx หรือ network error และเคารพ header `Retry-After`
- **API → Firestore:** API Routes ใช้ Firebase Admin SDK อ่าน/เขียน Firestore และตรวจ auth, termsAccepted, สิทธิ์

```
User Action → Component → lib/db/* (authFetchJson) → API Route → Firestore/Service → { success, data }
     │              │                    │                    │
     │              ↓                    ↓                    ↓
     │         Validation           Rate Limit          termsAccepted / canPost
     └──────────► Toast ◄─────────────────────────────────────────────
```

### Clean Architecture Patterns

ระบบใช้หลัก **SOLID** และ **Clean Architecture**:

| Pattern | ตำแหน่ง | รายละเอียด |
|---------|---------|-------------|
| **Services** | `lib/services/` | Business logic with DIP |
| **Rate Limiting** | `lib/upstash-rate-limiter.ts` | Scalable Redis rate limiting |
| **Schemas** | `lib/schemas.ts` | Zod validation with Thai messages |

### Observability

| Tool | การใช้งาน |
|------|-----------|
| **Upstash Redis** | Scalable rate limiting (optional) |
| **Vercel Analytics** | Web analytics |

---

## 🛠 เทคโนโลยีที่ใช้ (Technology Stack)

### Frontend

| เทคโนโลยี | เวอร์ชัน | การใช้งาน |
|-----------|----------|-----------|
| **Next.js** | 16.1.5 | Framework หลัก (App Router, RSC, Turbopack) |
| **React** | 19.2.3 | UI Library |
| **Bun** | 1.3.6 | JavaScript Runtime & Package Manager |
| **TypeScript** | 5.x | Type Safety |
| **TailwindCSS** | 4.1.9 | Styling Framework |
| **Radix UI** | Latest | Accessible Components |
| **Framer Motion** | 12.x | Animations |

### Backend & Services

| เทคโนโลยี | เวอร์ชัน | การใช้งาน |
|-----------|----------|-----------|
| **Firebase** | 12.5.0 | Authentication & Database |
| **Firebase Admin** | 13.6.0 | Server-side Operations |
| **Cloudinary** | 2.8.0 | Image CDN & Optimization |
| **LINE Messaging API** | - | Notifications & Chat Integration |
| **Vercel** | - | Hosting & Deployment |

### Development & Testing

| เทคโนโลยี | เวอร์ชัน | การใช้งาน |
|-----------|----------|-----------|
| **Vitest** | 4.0.17 | Unit / integration testing |
| **Playwright** | 1.57.0 | End-to-end testing |
| **ESLint** | 9.39.2 | Code linting |
| **Zod** | 3.25.76 | Schema Validation |
| **GitHub Actions** | - | CI/CD Pipeline |

---

## 📁 โครงสร้างโครงงาน (Project Structure)

```
rmu-campus-x/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Authentication Pages
│   │   ├── login/                    # หน้าเข้าสู่ระบบ
│   │   ├── register/                 # หน้าลงทะเบียน
│   │   ├── consent/                  # หน้ายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว
│   │   └── verify-email/             # หน้ายืนยันอีเมล
│   │
│   ├── admin/                        # Admin Dashboard
│   │   ├── items/                    # จัดการสิ่งของ
│   │   ├── users/                    # จัดการผู้ใช้
│   │   ├── reports/                  # จัดการรายงาน
│   │   ├── support/                  # จัดการ Support Tickets
│   │   ├── announcements/            # จัดการประกาศ (แบนเนอร์)
│   │   ├── exchanges/                # จัดการการแลกเปลี่ยน
│   │   └── logs/                     # Activity Logs
│   │
│   ├── api/                          # API Routes
│   │   ├── admin/                    # Admin APIs (รวม announcements CRUD)
│   │   ├── announcements/            # ประกาศ (GET สำหรับแบนเนอร์)
│   │   ├── exchanges/                # Exchange APIs
│   │   ├── favorites/                # รายการโปรด (list, check, add, delete)
│   │   ├── items/                    # สิ่งของ (list, create, get, update, delete)
│   │   ├── line/                     # LINE Integration (webhook, notify-chat, notify-exchange, ...)
│   │   ├── notifications/            # แจ้งเตือน (list, mark read, read-all, delete)
│   │   ├── reports/                  # Report APIs
│   │   ├── reviews/                  # รีวิว (list, create — ต้อง terms)
│   │   ├── support/                  # Support (GET รายการคำร้องของฉัน, POST สร้าง ticket — ต้อง terms)
│   │   ├── support/[ticketId]/messages/ # Messages ของ ticket
│   │   ├── upload/                   # Image Upload (sign for direct Cloudinary)
│   │   ├── users/me/                 # โปรไฟล์ + accept-terms
│   │   ├── users/[id]/               # โปรไฟล์สาธารณะ (ไม่ต้อง auth)
│   │   └── health/                   # Health Check
│   │
│   ├── dashboard/                    # หน้า Dashboard หลัก
│   ├── announcements/                # หน้าประวัติประกาศ
│   ├── chat/[exchangeId]/            # หน้าแชท
│   ├── item/[id]/                    # หน้ารายละเอียดสิ่งของ
│   ├── my-exchanges/                 # หน้าการแลกเปลี่ยนของฉัน
│   ├── notifications/                # หน้าแจ้งเตือน
│   ├── profile/                      # หน้าโปรไฟล์
│   ├── report/                       # หน้ารายงานปัญหา
│   └── support/                      # หน้า Support
│
├── components/                       # React Components
│   ├── ui/                           # Base UI Components (Shadcn)
│   ├── auth-provider.tsx             # Authentication Context
│   ├── language-provider.tsx         # i18n Context + locale persistence
│   ├── language-switcher.tsx         # ปุ่มสลับภาษา TH/EN
│   ├── announcement-banner.tsx       # แถบประกาศใต้ Navbar (ปิดได้, เรียลไทม์)
│   ├── announcement-context.tsx      # Context สถานะประกาศ (ให้ Breadcrumb ปรับ top)
│   ├── consent-guard.tsx              # ส่งผู้ใช้ที่ยังไม่ยอมรับ terms ไป /consent
│   ├── breadcrumb-bar.tsx            # Breadcrumb แถบใต้ Navbar (ไม่ซ้อนกับประกาศ)
│   ├── filter-sidebar.tsx            # Category Filters
│   ├── item-card.tsx                 # Item Display Card
│   ├── item-card-skeleton.tsx        # Loading Skeleton
│   ├── post-item-modal.tsx           # Create Item Modal
│   ├── support-ticket-modal.tsx       # ส่งคำร้องขอความช่วยเหลือ (หัวข้อ + รายละเอียด)
│   ├── exchange/                     # Exchange-related components
│   │   ├── exchange-step-indicator.tsx  # Step-by-step progress (รอตอบรับ → เสร็จสิ้น)
│   │   └── exchange-action-dialogs.tsx  # Cancel / Delete dialogs
│   └── ...                           # Other Components
│
├── lib/                              # Utility Libraries
│   ├── api-client.ts                 # authFetch / authFetchJson (retry + backoff), getAuthToken
│   ├── i18n/                         # locale config, translations, server resolver
│   ├── breadcrumb-labels.ts          # Route labels สำหรับ breadcrumb
│   ├── constants.ts                  # bilingual label constants (BilingualLabel, CATEGORY_*, STATUS_*, REPORT_*)
│   ├── db/                           # Database / API wrappers
│   │   ├── items.ts                  # Items (เรียก /api/items)
│   │   ├── exchanges.ts              # Exchanges CRUD
│   │   ├── favorites.ts              # รายการโปรด (เรียก /api/favorites)
│   │   ├── users.ts, users-profile.ts # Users (เรียก /api/users/me, /api/users/[id])
│   │   ├── notifications.ts          # แจ้งเตือน (เรียก /api/notifications)
│   │   ├── reviews.ts                # รีวิว (เรียก /api/reviews)
│   │   ├── reports.ts                # Reports (เรียก /api/reports, /api/admin/reports)
│   │   ├── support.ts                # Support (client ใช้ GET/POST /api/support)
│   │   └── logs.ts                   # Activity Logs
│   │
│   ├── exchange-state-machine.ts     # Exchange status transitions, bilingual STATUS_LABELS/DESCRIPTIONS
│   ├── services/                     # Business Logic Services
│   │   ├── admin/                    # Admin Services
│   │   │   └── user-cleanup.ts       # User Deletion Logic
│   │   ├── client-line-service.ts    # Client-side LINE Notifications
│   │   ├── report-service.ts         # Report Submission Logic
│   │   └── logging/                  # Logging services and sinks
│   │
│   ├── firebase.ts                   # Firebase Client Config
│   ├── firebase-admin.ts             # Firebase Admin Config
│   ├── cloudinary.ts                 # Cloudinary Config (server)
│   ├── cloudinary-url.ts             # URL helpers (public_id → URL, f_auto/q_auto)
│   ├── line/                         # LINE API integration modules
│   ├── rate-limiter.ts               # API Rate Limiting
│   ├── image-utils.ts                # Image Compression
│   ├── storage.ts                    # uploadToCloudinary (Signed Upload → Cloudinary)
│   └── api-wrapper.ts                # API Response Wrapper
│
├── hooks/                            # Custom React Hooks
│   ├── use-account-status.ts         # Account status hook
│   ├── use-admin-guard.ts            # Admin access guard
│   ├── use-items.ts                  # Items data hook
│   ├── use-refresh-on-focus.ts       # Refresh data เมื่อกลับมาโฟกัสหน้า
│   └── use-toast.ts                  # Toast hook
│
├── types/                            # TypeScript Types
│   └── index.ts                      # Type Definitions
│
├── e2e/                              # End-to-End Tests
│   └── dashboard.spec.ts             # Dashboard Tests
│
├── proxy.ts                          # Edge proxy / request handling
├── playwright.config.ts              # Playwright Config
├── jest.config.js                    # Jest Config
├── next.config.mjs                   # Next.js Config
├── postcss.config.mjs                # PostCSS / Tailwind v4 config
└── package.json                      # Dependencies
```

---

## 🚀 Deployment (Vercel) & Environment Checklist

ก่อน deploy ขึ้น Production ควรตรวจสอบค่าต่อไปนี้ใน **Vercel → Project → Settings → Environment Variables**:

| ตัวแปร | บังคับ | การใช้งาน |
|--------|--------|-----------|
| `NEXT_PUBLIC_FIREBASE_*` | ✅ | Firebase Client (Auth, config) |
| `FIREBASE_ADMIN_*` | ✅ | Firebase Admin SDK (Server) |
| `LINE_CHANNEL_ACCESS_TOKEN` | ✅ | ส่งแจ้งเตือน LINE (ถ้าไม่ตั้ง จะไม่ส่ง LINE) |
| `LINE_CHANNEL_SECRET` | ✅ | ใช้กับ Webhook / ยืนยัน signature |
| `NEXT_PUBLIC_BASE_URL` | แนะนำ | ใช้ใน LINE/ลิงก์ (ควรเป็นโดเมนจริง เช่น `https://your-app.vercel.app`) |
| `CLOUDINARY_*` | ✅ | อัปโหลดรูปภาพ (Signed Upload) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | ✅ | แปลง public_id เป็น URL บน client |
| `UPSTASH_REDIS_REST_*` | แนะนำ | Rate limiting แบบกระจาย (Production) |

- **Project name ใน Vercel:** เปลี่ยนจากชื่อเก่าเป็น `rmu-campus-x` (หรือตามต้องการ) ได้ที่ Settings → General → Project Name เพื่อให้โดเมน `*.vercel.app` ตรงกับชื่อโปรเจกต์
- คัดลอกจาก `.env.example` ไปใส่ใน Vercel ให้ครบตาม environment (Production / Preview / Development) ตามความต้องการ

---

## ⭐ ฟีเจอร์หลัก (Key Features)

### 0. ระบบหลายภาษา (Multilingual: TH/EN)

- รองรับไทย/อังกฤษทั้งฝั่ง **User** และ **Admin** ด้วย `useI18n()` (`tt()`/`t()`)
- จำค่าภาษาของผู้ใช้ด้วย `rmu_locale` cookie + localStorage
- มี `Language Switcher` สำหรับสลับภาษาแบบทันที
- รองรับ locale-aware formatting (เช่น วันที่/เวลา `th-TH` และ `en-US`)
- ครอบคลุมหน้าเอกสารสำคัญ: `guide`, `terms`, `privacy`, `guidelines`

### 1. ระบบผู้ใช้งาน (User Management)

- **สมัครสมาชิกด้วยอีเมล @rmu.ac.th** - รองรับนักศึกษา (รหัส 12 หลัก) และอาจารย์ (อีเมลตัวอักษร)
- **ยืนยันอีเมล (Email Verification)** - ป้องกันบัญชีปลอม
- **ยอมรับข้อกำหนดและนโยบาย (Consent)** - หลังล็อกอินต้องยอมรับข้อกำหนดการใช้และนโยบายความเป็นส่วนตัวก่อนใช้งาน (หน้า `/consent`, `ConsentGuard`)
- **เชื่อมต่อ LINE Account** - รับแจ้งเตือนผ่าน LINE
- **ระบบ Role** - User / Admin

### 2. ระบบสิ่งของ (Item Management)

- **โพสต์สิ่งของ** - รองรับหลายรูปภาพ (สูงสุด 5 รูป)
- **Cloudinary Signed Upload** - อัปโหลดรูปตรงไป Cloudinary (client → /api/upload/sign → POST ตรงไป Cloudinary)
- **เก็บ public_id เท่านั้น** - บันทึก public_id ใน Firestore เพื่อให้ transform ได้ flexible
- **บีบอัดรูปอัตโนมัติ** - ลดขนาดไฟล์ 50-80% ก่อนอัปโหลด
- **หมวดหมู่** - อิเล็กทรอนิกส์, หนังสือ, เฟอร์นิเจอร์, เสื้อผ้า/เครื่องแต่งกาย, กีฬา/ของเล่น, อื่นๆ (กำหนดใน `lib/constants.ts`)
- **สถานะ** - พร้อมให้, รอดำเนินการ, เสร็จสิ้น
- **โปรไฟล์สาธารณะ** - หน้า `/profile/[uid]` แสดงโพสและรีวิว; คลิกที่ใดก็ได้บนการ์ดสิ่งของเพื่อเปิด modal รายละเอียด

### 3. ระบบประกาศ (Announcements)

- **แถบประกาศ (Announcement Banner)** - แสดงใต้ Navbar ความกว้างจำกัด (max-w-4xl) จัดกลาง
- **แสดงผลแบบเรียลไทม์** - โหลดซ้ำตาม `nextCheckInMs` จาก API (เมื่อถึงเวลาเริ่ม/หมดอายุ) ไม่ต้องรีเฟรชหน้า
- **ปิดประกาศได้** - ผู้ใช้กดปิดได้ (เก็บใน localStorage ต่อ id)
- **Admin จัดการประกาศ** - หน้า Admin → ประกาศ (CRUD), API `/api/admin/announcements` — กำหนดช่วงเวลาแสดง (startAt/endAt), เปิดแสดงทันที (isActive)
- **Breadcrumb ไม่ซ้อน** - ใช้ `AnnouncementContext` ให้แถบ breadcrumb ปรับ `top` ตามว่ามีประกาศแสดงหรือไม่ (top-28 เมื่อมีประกาศ, top-16 เมื่อไม่มี)

### 4. ระบบค้นหา (Search System)

- **Server-Side Search** - ค้นหาจากฐานข้อมูลโดยตรง
- **Multi-Category Filter** - เลือกหลายหมวดหมู่พร้อมกัน
- **Debounced Search** - ลด API calls
- **Pagination** - โหลดข้อมูลเป็นหน้า (lastId-based)
- **Breadcrumb Navigation** - แสดงเส้นทางจากประวัติการนำทาง (ใต้ Navbar)

### 5. ระบบแลกเปลี่ยน (Exchange System)

- **ขอรับสิ่งของ** - ส่งคำขอพร้อมข้อความ
- **ยืนยัน/ปฏิเสธ** - เจ้าของเลือกอนุมัติ (ได้ทั้งหน้ารายการและหน้าแชท)
- **ระบบแชท** - สนทนานัดรับของ ชื่อคู่สนทนากดไปดูโปรไฟล์สาธารณะได้
- **แชทผ่าน LINE Bot** - พิมพ์ "แชท" ใน LINE เลือกรายการ ส่งข้อความได้แม้อีกฝ่ายยังไม่เชื่อม LINE (ข้อความจะแสดงบนเว็บ)
- **ติดตามสถานะ** - Step-by-step: รอเจ้าของโพสต์ตอบรับ -> กำลังดำเนินการ -> เสร็จสิ้น (`ExchangeStepIndicator`)
- **ปุ่มยืนยันชัดเจน** - ในเฟส in_progress แสดงปุ่ม "ยืนยันส่งมอบ/รับของแล้ว" (legacy accepted จะถูก map เป็น in_progress)
- **รออีกฝ่ายยืนยัน** - แสดงข้อความเมื่อยืนยันฝ่ายเดียวแล้ว (รออีกฝ่ายกดยืนยัน)
- **ซ่อนจากรายการ** - ผู้ใช้สามารถซ่อนการแลกเปลี่ยนจากรายการของตนได้ (อีกฝ่ายยังเห็นอยู่)
- **แจ้งเตือนเมื่ออีกฝ่ายยืนยัน** - แจ้งให้อีกฝ่ายทราบเมื่อมีการกดยืนยันการแลกเปลี่ยน

### 6. ระบบแจ้งเตือน (Notification System)

- **In-App Notifications** - แจ้งเตือนในระบบ (list, mark read, mark all read, delete ผ่าน API)
- **อัปเดตทันที** - กด "อ่านทั้งหมด" แล้ว UI (dropdown รูประฆัง + หน้าแจ้งเตือน) อัปเดตทันที ไม่ต้องรอโพล
- **LINE Push Notifications** - แจ้งเตือนผ่าน LINE
- **Admin Alerts** - แจ้ง Admin เมื่อมีรายงานใหม่

### 7. ระบบผู้ดูแล (Admin Panel)

- **Dashboard สถิติ** - ภาพรวมระบบ (โหลดผ่าน `/api/admin/stats`, `/api/admin/items`, `/api/admin/reports`, `/api/admin/users`, `/api/admin/support`)
- **ตรวจสิทธิ์ Admin** - ใช้ `useAdminGuard()` hook (เรียก `/api/admin/verify` server-side) ไม่อ่าน Firestore โดยตรง
- **จัดการผู้ใช้** - Suspend/Unsuspend, คำเตือน, ลบผู้ใช้
- **จัดการสิ่งของ / รายงาน / Support / ประกาศ** - โหลดและจัดการผ่าน Admin API
- **จัดการประกาศ** - หน้า Admin → ประกาศ (สร้าง/แก้ไข/ลบ แบนเนอร์ประกาศ)
- **Activity Logs** - ประวัติการดำเนินการ

### 8. ความปลอดภัย (Security)

- **Distributed Rate Limiting** - Upstash Redis backing (100 req/min)
- **termsAccepted** - API ที่เกี่ยวกับการโพสต์/รายงาน/support/รีวิว/ตอบรับคำขอแลกเปลี่ยน ตรวจยอมรับข้อกำหนดแล้ว
- **Image Magic Byte Validation** - ตรวจสอบไฟล์จริง (JPEG, PNG, GIF, WebP)
- **API Validation Wrapper** - Server-side Zod validation ทุก request
- **Exchange State Machine** - ป้องกันสถานะเปลี่ยนผิดปกติ
- **Request ID Tracking** - Traceable requests for debugging
- **Firebase Security Rules** - Defenses in depth for DB & Storage

### 9. Progressive Web App (PWA) & Mobile

- **Installable** - ติดตั้งเป็น App บนมือถือ/เดสก์ท็อป
- **Offline Support** - ใช้งานได้แม้ไม่มีอินเทอร์เน็ต (cached pages)
- **App Shortcuts** - ทางลัดไปยังหน้าหลักๆ
- **Background Sync** - อัพเดทข้อมูลเมื่อกลับมาออนไลน์
- **Mobile-first** - Viewport `viewportFit: cover`, safe-area padding (notch/home indicator), touch targets ≥44px, input font-size 16px บนมือถือ (ลด iOS zoom), Help bot และ Dialog/Sheet ปรับขนาดตามจอ

### 10. Performance Optimization

| การปรับปรุง | รายละเอียด |
|-------------|------------|
| **Pagination** | Admin pages ใช้ pagination แทน fetch all |
| **Lazy Loading** | Components ที่ไม่จำเป็นโหลดตอนหลัง (Next.js Dynamic Imports) |
| **Count Aggregations** | API stats ใช้ count() แทน fetch all docs |
| **Query Limits** | จำกัด query ไม่เกิน 200 items |
| **Batch Queries** | รวม queries เพื่อลด reads |
| **Image Caching** | Service Worker cache รูปจาก Cloudinary |
| **Server Components** | `app/page.tsx` refactored to RSC for faster FCP |
| **Image Optimization** | ใช้ `sharp` สำหรับ Production Image Optimization |
| **Middleware Optimization** | Exclude static files จาก Edge Function เพื่อลด Latency |
| **Vercel Best Practices** | ปฏิบัติตามมาตรฐาน Vercel Labs (Core Web Vitals) |
| **Memory Leak Prevention** | ใช้ `mountedRef` / `cancelled` ใน async effects (dashboard, profile, chat, notifications, favorites, item detail) เพื่อไม่ให้ setState หลัง component unmount |
| **API Retry & Backoff** | Client (`lib/api-client`) retries idempotent methods only (`GET/HEAD/OPTIONS`, max 2 attempts) for 429/5xx using exponential backoff + `Retry-After`; write methods do not auto-retry to avoid duplicate mutations. |
| **Client Data via API Only** | Dashboard, โปรไฟล์, แจ้งเตือน, การแลกเปลี่ยน, รีวิว, รายงาน, **Support (รายการคำร้อง)**, Admin โหลดข้อมูลผ่าน API เท่านั้น (ไม่ใช้ Firestore SDK บน client) — ลดปัญหา Firestore permission และความสอดคล้องของ cache |

### 10.1 Network Resilience (Offline / Network Change)

- API polling checks `navigator.onLine` and skips requests while offline, reducing noisy `ERR_NETWORK_CHANGED` / `ERR_INTERNET_DISCONNECTED` bursts.
- `lib/api-client` uses fail-fast handling for transient network transport errors and a short recovery window before new requests.
- Firestore realtime listeners in `lib/services/client-firestore.ts` auto-unsubscribe on `offline` and auto-resubscribe on `online`.
- Firestore client log level is set to `error` to reduce verbose WebChannel transport logs during temporary connection switches.
- `/api/line/notify-chat` enforces participant-only access and only allows notifying the opposite party in the same exchange.

### 11. Testing & Quality Assurance

- **White-box Tests** - Vitest 130 tests (API validation, security, exchange state machine, db, reports, auth, rate-limit, item-deletion, utils)
- **Black-box Tests** - Playwright 84 scenarios (API security, dashboard, navigation, auth pages) — รัน 4 browsers; ชุด Basic Navigation / Landing / Auth Pages ข้ามบน WebKit เนื่องจาก Next.js hydration ใน Playwright
- **Firestore Rules Tests** - `npm run test:rules` (ต้องรัน Firebase Emulator)
- **Coverage** - `npm run test:coverage`
- **Latest local verification (February 11, 2026)** - White-box: `130 passed, 0 failed`; Black-box: `70 passed, 14 skipped, 0 failed`

```bash
# White-box tests (Vitest)
npm run test

# Black-box tests (Playwright: Chromium, Firefox, WebKit, Mobile Chrome)
npm run test:e2e

# Full QA (white-box + black-box)
npm run test
npm run test:e2e

# Type-check + unit test + build
npm run check-all
```

### 12. Monitoring & Error Tracking (`lib/monitoring.ts`)

- **Error Logging** - บันทึก errors แบบศูนย์กลาง
- **Performance Tracking** - จับเวลา operations
- **Log Levels** - debug, info, warn, error, fatal

```typescript
import { error, startTimer, captureException } from '@/lib/monitoring'

// Log error
error('Operation failed', new Error('Something went wrong'), { userId: '123' })

// Track performance
const endTimer = startTimer('fetchUsers')
// ... do work
endTimer() // logs duration
```

### 13. Security Utilities (`lib/security.ts`)

| Function | Description |
|----------|-------------|
| `sanitizeHtml()` | ป้องกัน XSS attacks |
| `sanitizeText()` | ลบ control characters |
| `isValidRMUEmail()` | ตรวจสอบ email RMU |
| `sanitizeUrl()` | ตรวจสอบ URL ปลอดภัย |
| `hasSuspiciousPatterns()` | ตรวจจับ SQL injection |
| `sanitizeFilename()` | ทำความสะอาดชื่อไฟล์ |

### 14. Accessibility (`lib/a11y.ts`)

- **Keyboard Navigation** - รองรับ Arrow keys, Tab, Enter
- **Focus Management** - Focus trap สำหรับ modals
- **Screen Reader** - Announce messages via `aria-live`
- **Reduced Motion** - ตรวจจับ user preferences

---


## 🚀 การติดตั้งและใช้งาน (Installation)

### ความต้องการระบบ (Prerequisites)

- **Bun** >= 1.0.0 ([ติดตั้ง Bun](https://bun.sh/docs/installation))
- **Git**
- **npm/pnpm/yarn** (optional alternative to Bun)

### ขั้นตอนการติดตั้ง

```bash
# 1. Clone repository
git clone https://github.com/cypxxc/RMU-Campus-X.git
cd RMU-Campus-X

# 2. ติดตั้ง dependencies (เลือกอย่างใดอย่างหนึ่ง)
bun install

# or
npm install

# 3. ตั้งค่า environment variables (ดูหัวข้อถัดไป)
cp .env.example .env

# 4. รันโหมด Development (พร้อม Turbopack)
bun dev

# 5. เปิด browser ไปที่ http://localhost:3000
```

### Scripts ที่มีให้ใช้งาน

| Script | คำอธิบาย |
|--------|----------|
| `npm run dev` / `bun dev` | รันโหมด Development (Turbopack) |
| `npm run build` / `bun run build` | Build สำหรับ Production |
| `npm run start` / `bun start` | รัน Production Server |
| `npm run lint` | ตรวจสอบ Code Quality (ESLint) |
| `npm run type-check` | ตรวจสอบ TypeScript |
| `npm run test` | รัน Unit Tests (Vitest) |
| `npm run test:coverage` | Unit tests พร้อม coverage |
| `npm run test:rules` | ทดสอบ Firestore rules (ต้องรัน Firebase Emulator) |
| `npm run test:e2e` | รัน E2E Tests (Playwright, 4 browsers) |
| `npm run test:e2e:ui` | รัน E2E Tests พร้อม UI |
| `npm run check-all` | Type-check + Unit test + Build |

---

## ⚙ การตั้งค่า Environment Variables

สร้างไฟล์ `.env` และกำหนดค่าต่อไปนี้:

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Service Account - Base64 encoded)
FIREBASE_SERVICE_ACCOUNT_KEY=base64_encoded_service_account_json

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
# Optional backward compatibility key (legacy code paths)
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# System Hardening (Production)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

```

### ยืนยันอีเมล (Email Verification)

- **ระยะเวลาลิงก์:** ลิงก์ยืนยันอีเมลใช้ได้ **3 วัน** (ค่าเริ่มต้นของ Firebase)
- **ยืนยันอัตโนมัติเมื่อกดลิงก์:** เมื่อผู้ใช้คลิกลิงก์จากอีเมล ระบบจะยืนยันให้อัตโนมัติแล้วนำไป Dashboard
- **ปุ่มเปิด Gmail:** ในหน้า `/verify-email` มีปุ่ม **เปิด Gmail** เพื่อเข้ากล่องจดหมายได้ทันที (`https://mail.google.com`)
- **ตั้งค่า Custom Action URL (แนะนำ):** เพื่อให้ลิงก์ในอีเมลเปิดมาที่แอปของคุณ — ไปที่ [Firebase Console](https://console.firebase.google.com/) → **Authentication** → **Templates** → แก้ไขเทมเพลตอีเมลที่ใช้ → **Customize action URL** กำหนดเป็น `https://your-domain.com/verify-email` (และเพิ่มโดเมนใน Authorized domains ถ้ายังไม่มี)

---

## 🧪 การทดสอบ (Testing)

### White-box Tests (Vitest)

```bash
# รันทุก test
npm run test

# รันพร้อม watch mode
npm run test:watch

# รันพร้อม coverage report
npm run test:coverage
```

### Black-box Tests (Playwright)

```bash
# ติดตั้ง browsers (ครั้งแรก)
npx playwright install

# รันทุก test (Chromium, Firefox, WebKit, Mobile Chrome)
npm run test:e2e

# รันพร้อม UI
npm run test:e2e:ui

# ดู test report หลังรัน
npx playwright show-report
```

**หมายเหตุ:** ชุด Basic Navigation, Landing Page Content และ Auth Pages จะถูก **skip บน WebKit** เนื่องจากปัญหา Next.js hydration ใน Playwright; เคสอื่นรันครบทั้ง 4 browsers

### Overall QA Run

```bash
# รันทดสอบรวมทั้ง White-box + Black-box
npm run test
npm run test:e2e
```

### QA Result Snapshot (2026-02-11)

- White-box: `npm run type-check` passed, `npm run test` passed (`15` files, `130` tests).
- Black-box: `npm run test:e2e -- --project=chromium` passed (`21/21` tests).
- Production build: `npm run build` passed.

### Defect Fixes Included

1. Fixed exchange ownership spoofing in `POST /api/exchanges` by resolving owner from item source-of-truth (`items.postedBy`) instead of trusting client payload.
2. Fixed announcement image compatibility by supporting legacy `imageUrl` fallback in public/admin announcement APIs and converter layer.
3. Reduced data exposure in public announcement endpoints by removing `createdByEmail` from public responses.
4. Improved support-ticket admin notification performance by replacing N+1 user lookups with batched `where("email", "in", ...)` queries and batched notification writes.
5. Unified deployment base URL usage to prefer `NEXT_PUBLIC_APP_URL` (with `NEXT_PUBLIC_BASE_URL` compatibility fallback) across key notification/auth routes.

### Test Coverage

| ประเภท | ครอบคลุม |
|--------|----------|
| Unit Tests (Vitest) | API validation, security, exchange state machine, db, reports, auth, rate-limit, item-deletion, utils |
| E2E Tests (Playwright) | API security (401, error structure), Dashboard redirect, Navigation, Landing, Auth pages |
| Firestore Rules | `__tests__/rules/` (รันกับ Emulator) |

---

## 📦 การ Deploy

### Vercel (Recommended)

1. เชื่อมต่อ GitHub Repository กับ Vercel
2. ตั้งค่า Environment Variables ใน Vercel Dashboard
3. Deploy อัตโนมัติเมื่อ push ไป main branch

### Manual Build

```bash
# Build production
bun run build

# Start production server
bun start
```

---

## 📖 API Documentation

> 📄 **รายละเอียด API:** [docs/API.md](docs/API.md)  
> หน้า Swagger UI `/api-docs` แสดงเอกสาร API แล้ว

**ฟีเจอร์ที่เปิดใช้งานแล้ว:** หน้าเกี่ยวกับเรา (/about), API Docs (/api-docs), Help Bot (แชทบอท FAQ), Admin Data ในเมนูแอดมิน, Onboarding สำหรับผู้ใช้ใหม่ · หน้า Contact ถูกลบแล้ว · Cron cleanup ถูกลบออกจาก Vercel แล้ว

### API Endpoints (สรุป)

| กลุ่ม | Method | Endpoint | คำอธิบาย |
|-------|--------|----------|----------|
| **Announcements** | GET | `/api/announcements` | list ประกาศสำหรับแบนเนอร์ + nextCheckInMs (ไม่ต้อง auth) |
| | GET | `/api/announcements/history` | ประวัติประกาศย้อนหลังสำหรับหน้า Announcements |
| **Items** | GET | `/api/items` | list (filter, search, pagination) |
| | POST | `/api/items` | สร้าง item (ต้อง auth + terms + canPost) |
| | GET | `/api/items/[id]` | ดึงรายการเดียว |
| | PATCH / DELETE | `/api/items/[id]` | แก้ไข/ลบ (เจ้าของเท่านั้น) |
| **Users** | GET | `/api/users/me` | โปรไฟล์ผู้ใช้ที่ล็อกอิน (คืน isAdmin, สร้าง user doc ถ้ายังไม่มี, auto-unsuspend ฝั่ง server) |
| | PATCH | `/api/users/me` | แก้ไขโปรไฟล์ |
| | POST | `/api/users/me/accept-terms` | ยอมรับข้อกำหนดและนโยบาย |
| | GET | `/api/users/[id]` | โปรไฟล์สาธารณะ (ไม่ต้อง auth) |
| **Favorites** | GET | `/api/favorites` | list รายการโปรด |
| | GET | `/api/favorites/check?itemId=` | ตรวจว่า item ถูกโปรดหรือไม่ |
| | POST | `/api/favorites` | เพิ่มรายการโปรด |
| | DELETE | `/api/favorites/[itemId]` | ลบรายการโปรด |
| **Notifications** | GET | `/api/notifications` | list แจ้งเตือน (pagination) |
| | POST | `/api/notifications` | สร้าง notification (system/cross-user) |
| | PATCH | `/api/notifications/[id]` | mark as read |
| | POST | `/api/notifications/read-all` | mark all as read |
| | DELETE | `/api/notifications/[id]` | ลบการแจ้งเตือน |
| **Reviews** | GET | `/api/reviews?targetUserId=&limit=` | list รีวิวที่ user ได้รับ (กรองผู้รีวิวที่ถูกลบแล้ว) |
| | POST | `/api/reviews` | สร้างรีวิว (ต้อง auth + terms; ตรวจผู้ร่วมแลกเปลี่ยน, อัปเดต rating) |
| **Exchanges** | GET | `/api/exchanges` | list การแลกเปลี่ยน (ไม่รวมที่ผู้ใช้ซ่อนแล้ว) |
| | POST | `/api/exchanges` | สร้างคำขอแลกเปลี่ยน (ต้อง terms) |
| | POST | `/api/exchanges/respond` | ตอบรับ/ปฏิเสธ (ต้อง auth + terms) |
| | PATCH | `/api/exchanges/[id]` | อัปเดตสถานะการแลกเปลี่ยน |
| | POST | `/api/exchanges/[id]/hide` | ซ่อนรายการจากหน้าการแลกเปลี่ยนของฉัน |
| **Support** | GET | `/api/support` | รายการคำร้องของฉัน (ต้อง auth) |
| | POST | `/api/support` | สร้าง ticket (ต้อง auth + terms) |
| | GET / POST | `/api/support/[ticketId]/messages` | อ่าน/ส่งข้อความในคำร้อง |
| **Reports** | POST | `/api/reports` | สร้างรายงาน (ต้อง terms) |
| **Admin Announcements** | GET/POST | `/api/admin/announcements` | list / สร้างประกาศ |
| | GET/PATCH/DELETE | `/api/admin/announcements/[id]` | ดึง / แก้ไข / ลบประกาศ |
| **Admin Support** | POST | `/api/admin/support/[ticketId]/reply` | ตอบกลับคำร้องจากฝั่งแอดมิน |
| | PATCH | `/api/admin/support/[ticketId]/status` | เปลี่ยนสถานะ ticket |
| **Admin User Notifications** | GET | `/api/admin/users/[id]/notifications` | ดึงรายการแจ้งเตือนของผู้ใช้ |
| **Admin / LINE / Upload** | - | `/api/admin/*`, `/api/line/*`, `/api/upload`, `/api/upload/sign` | ดู docs/API.md |

### Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 100 requests | 1 minute |
| Upload | 10 requests | 1 minute |
| Authentication | 5 requests | 1 minute |

เมื่อเกินกำหนด (429) API จะส่ง header `Retry-After` และ client จะ retry อัตโนมัติด้วย exponential backoff (ดู `lib/api-client.ts`)
- Retry อัตโนมัติจะเกิดกับ idempotent requests (`GET/HEAD/OPTIONS`) เท่านั้น; write requests ไม่ retry เพื่อป้องกัน duplicate action.
- เมื่อ browser offline หรือเกิด transient network error client จะ fail-fast และรอ network กลับมาก่อน request รอบถัดไป.

### Response Format

- **สำเร็จ:** `{ success: true, data: T }` (จาก `successResponse()`)
- **ผิดพลาด:** `{ error: string }` พร้อม HTTP status 4xx/5xx

---

## 🔒 การรักษาความปลอดภัย (Security)

### Authentication

- Firebase Authentication พร้อม Email Verification
- JWT Token Validation ฝั่ง Server
- Session Management ด้วย Firebase

### Authorization

- Role-based Access Control (User/Admin)
- Firestore Security Rules
- API Route Protection

### Data Protection

- Input Validation ด้วย Zod
- XSS Prevention
- CSRF Protection (SameSite Cookies)
- Rate Limiting

### Image Upload Security

- **Signed Upload** - Client รับ signature จาก `/api/upload/sign` แล้ว POST ตรงไป Cloudinary
- File Type Validation (magic bytes)
- Max File Size: 10MB
- Cloudinary CDN (f_auto, q_auto)

---

## 👨‍💻 ผู้พัฒนา (Contributors)

พัฒนาโดยนักศึกษา **มหาวิทยาลัยราชภัฏมหาสารคาม**

| ชื่อ | รหัสนักศึกษา | หน้าที่ |
|------|-------------|---------|
| [Chayaphon] | [653120100120] | Full-Stack Developer |

---

## 📊 ระบบ Monitoring & DevOps

### CI/CD Pipeline (GitHub Actions)
- ✅ TypeScript check อัตโนมัติ
- ✅ Unit tests (Vitest)
- ✅ E2E tests (Playwright)
- ✅ Security scan
- ✅ Auto-deploy to Vercel

### ระบบใหม่ที่เพิ่มเข้ามา
| ระบบ | ไฟล์ | รายละเอียด |
|------|------|------------|
| **Error Tracking** | `lib/error-tracker.ts` | Error logging system |
| **Login Protection** | `lib/login-tracker.ts` | ป้องกัน brute force attack |
| **Session Management** | `lib/session-manager.ts` | จัดการ sessions หลายอุปกรณ์ |
| **Caching** | `lib/cache.ts` | In-memory cache with TTL |
| **Feature Flags** | `lib/feature-flags.ts` | เปิด/ปิด features ได้ |
| **Searching** | `lib/search.ts` | Fuzzy search + scoring |
| **Backups** | `.github/workflows/backup.yml` | Automated daily Firestore backups |
| **Restore** | `scripts/restore-firestore.ts` | Restore data from backup |
| **Validation** | `lib/api-validation.ts` | Centralized API validation + requireTermsAccepted |
| **State Machine** | `lib/exchange-state-machine.ts` | Exchange status transitions, bilingual STATUS_LABELS/DESCRIPTIONS, getConfirmButtonLabel, getWaitingOtherConfirmationMessage |
| **API Client** | `lib/api-client.ts` | authFetch / authFetchJson (idempotent retry policy, exponential backoff + Retry-After, transient network fail-fast), getAuthToken |
| **Health Check** | `/api/health` | System status monitoring |
| **App Check** | `lib/app-check.ts` | Firebase App Check (bot protection) |
| **Announcement Context** | `components/announcement-context.tsx` | สถานะแถบประกาศ (ให้ Breadcrumb ปรับ top-16/top-28) |
| **System Analysis** | `docs/SYSTEM-ANALYSIS.md` | รายงานวิเคราะห์ระบบและจุดที่แก้แล้ว |

---

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/) - The React Framework
- [Firebase](https://firebase.google.com/) - Backend as a Service
- [Shadcn/ui](https://ui.shadcn.com/) - UI Components
- [Vercel](https://vercel.com/) - Hosting Platform
- [LINE Developers](https://developers.line.biz/) - Messaging API

---

<p align="center">
  Made with ❤️ at <strong>Rajabhat Maha Sarakham University</strong>
</p>
