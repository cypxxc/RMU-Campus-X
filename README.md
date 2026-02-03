# RMU-Campus X

**ระบบแพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษา มหาวิทยาลัยราชภัฏมหาสารคาม**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.5-black?logo=next.js)](https://nextjs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3.6-f9f1e1?logo=bun)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12.5-orange?logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-119%20unit%20%7C%2070%20E2E-success)]()
[![Sentry](https://img.shields.io/badge/Sentry-Enabled-362D59?logo=sentry)](https://sentry.io)

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
│  /api/admin/*     │  /api/reports      │  /api/support          │
│  /api/line/*      │  /api/upload       │  /api/health           │
│  ────────────────────────────────────────────────────────────── │
│  • Client เรียก API เป็นหลัก (lib/api-client, authFetchJson)   │
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
│  • Authentication  │  • Compression   │  • Account Linking      │
│  • Admin SDK       │  • Auto WebP     │  • Rich Messages        │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

- **Client → API:** ฟีเจอร์หลัก (items, users, favorites, notifications, reviews) เรียกผ่าน `lib/api-client` (`authFetchJson`) ไปที่ API Routes
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
| **Sentry** | Error tracking & Performance monitoring |
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
| **Three.js** | 0.182.0 | 3D Background Effects |

### Backend & Services

| เทคโนโลยี | เวอร์ชัน | การใช้งาน |
|-----------|----------|-----------|
| **Firebase** | 12.5.0 | Authentication & Database |
| **Firebase Admin** | 13.6.0 | Server-side Operations |
| **Cloudinary** | 2.8.0 | Image CDN & Optimization |
| **LINE Messaging API** | - | Notifications & Chat Integration |
| **Google Gemini AI** | 1.5 Flash | AI Chatbot (Sharky) |
| **Vercel** | - | Hosting & Deployment |

### Development & Testing

| เทคโนโลยี | เวอร์ชัน | การใช้งาน |
|-----------|----------|-----------|
| **Vitest** | 4.0.17 | Unit Testing (119 tests) |
| **Playwright** | 1.57.0 | E2E Testing (84 tests, 4 browsers; WebKit บางชุด skip) |
| **ESLint** | 8.57.1 | Code Linting |
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
│   │   └── logs/                     # Activity Logs
│   │
│   ├── api/                          # API Routes
│   │   ├── admin/                    # Admin APIs
│   │   ├── exchanges/                # Exchange APIs
│   │   ├── favorites/                # รายการโปรด (list, check, add, delete)
│   │   ├── items/                    # สิ่งของ (list, create, get, update, delete)
│   │   ├── line/                     # LINE Integration
│   │   ├── notifications/            # แจ้งเตือน (list, mark read, read-all, delete)
│   │   ├── reports/                  # Report APIs
│   │   ├── reviews/                  # รีวิว (list, create)
│   │   ├── support/                  # Support APIs
│   │   ├── upload/                   # Image Upload API
│   │   ├── users/me/                 # โปรไฟล์ + accept-terms
│   │   ├── users/[id]/               # โปรไฟล์สาธารณะ (ไม่ต้อง auth)
│   │   └── health/                   # Health Check
│   │
│   ├── dashboard/                    # หน้า Dashboard หลัก
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
│   ├── consent-guard.tsx             # ส่งผู้ใช้ที่ยังไม่ยอมรับ terms ไป /consent
│   ├── filter-sidebar.tsx            # Category Filters
│   ├── item-card.tsx                 # Item Display Card
│   ├── item-card-skeleton.tsx        # Loading Skeleton
│   ├── post-item-modal.tsx           # Create Item Modal
│   └── ...                           # Other Components
│
├── lib/                              # Utility Libraries
│   ├── api-client.ts                 # authFetchJson / getAuthToken (เรียก API จาก client)
│   ├── db/                           # Database / API wrappers
│   │   ├── items.ts                  # Items (เรียก /api/items)
│   │   ├── exchanges.ts              # Exchanges CRUD
│   │   ├── favorites.ts              # รายการโปรด (เรียก /api/favorites)
│   │   ├── users.ts, users-profile.ts # Users (เรียก /api/users/me, /api/users/[id])
│   │   ├── notifications.ts          # แจ้งเตือน (เรียก /api/notifications)
│   │   ├── reviews.ts                # รีวิว (เรียก /api/reviews)
│   │   ├── reports.ts                # Reports
│   │   └── logs.ts                   # Activity Logs
│   │
│   ├── services/                     # Business Logic Services
│   │   ├── admin/                    # Admin Services
│   │   │   └── user-cleanup.ts       # User Deletion Logic
│   │   ├── client-line-service.ts    # Client-side LINE Notifications
│   │   ├── report-service.ts         # Report Submission Logic
│   │   └── logger.ts                 # Logger Service
│   │
│   ├── firebase.ts                   # Firebase Client Config
│   ├── firebase-admin.ts             # Firebase Admin Config
│   ├── cloudinary.ts                 # Cloudinary Config
│   ├── line.ts                       # LINE API Integration
│   ├── rate-limiter.ts               # API Rate Limiting
│   ├── image-utils.ts                # Image Compression
│   ├── storage.ts                    # Upload Utilities
│   └── api-wrapper.ts                # API Response Wrapper
│
├── hooks/                            # Custom React Hooks
│   ├── use-auth.ts                   # Authentication Hook
│   └── use-mobile.ts                 # Responsive Hook
│
├── types/                            # TypeScript Types
│   └── index.ts                      # Type Definitions
│
├── e2e/                              # End-to-End Tests
│   └── dashboard.spec.ts             # Dashboard Tests
│
├── middleware.ts                     # Next.js Middleware (Rate Limiting)
├── playwright.config.ts              # Playwright Config
├── jest.config.js                    # Jest Config
├── next.config.mjs                   # Next.js Config
├── tailwind.config.ts                # Tailwind Config
└── package.json                      # Dependencies
```

---

## ⭐ ฟีเจอร์หลัก (Key Features)

### 1. ระบบผู้ใช้งาน (User Management)

- **สมัครสมาชิกด้วยอีเมล @rmu.ac.th** - รองรับนักศึกษา (รหัส 12 หลัก) และอาจารย์/บุคลากร (อีเมลตัวอักษร)
- **ยืนยันอีเมล (Email Verification)** - ป้องกันบัญชีปลอม
- **ยอมรับข้อกำหนดและนโยบาย (Consent)** - หลังล็อกอินต้องยอมรับข้อกำหนดการใช้และนโยบายความเป็นส่วนตัวก่อนใช้งาน (หน้า `/consent`, `ConsentGuard`)
- **เชื่อมต่อ LINE Account** - รับแจ้งเตือนผ่าน LINE
- **ระบบ Role** - User / Admin

### 2. ระบบสิ่งของ (Item Management)

- **โพสต์สิ่งของ** - รองรับหลายรูปภาพ (สูงสุด 5 รูป)
- **บีบอัดรูปอัตโนมัติ** - ลดขนาดไฟล์ 50-80%
- **หมวดหมู่** - อิเล็กทรอนิกส์, หนังสือ, เฟอร์นิเจอร์, เสื้อผ้า, กีฬา, อื่นๆ
- **สถานะ** - พร้อมให้, รอดำเนินการ, เสร็จสิ้น

### 3. ระบบค้นหา (Search System)

- **Server-Side Search** - ค้นหาจากฐานข้อมูลโดยตรง
- **Multi-Category Filter** - เลือกหลายหมวดหมู่พร้อมกัน
- **Debounced Search** - ลด API calls
- **Infinite Scroll** - โหลดข้อมูลเพิ่มอัตโนมัติ

### 4. ระบบแลกเปลี่ยน (Exchange System)

- **ขอรับสิ่งของ** - ส่งคำขอพร้อมข้อความ
- **ยืนยัน/ปฏิเสธ** - เจ้าของเลือกอนุมัติ
- **ระบบแชท** - สนทนานัดรับของ
- **ติดตามสถานะ** - Pending → Accepted → Completed

### 5. ระบบแจ้งเตือน (Notification System)

- **In-App Notifications** - แจ้งเตือนในระบบ (list, mark read, mark all read, delete ผ่าน API)
- **LINE Push Notifications** - แจ้งเตือนผ่าน LINE
- **Admin Alerts** - แจ้ง Admin เมื่อมีรายงานใหม่

### 6. ระบบผู้ดูแล (Admin Panel)

- **Dashboard สถิติ** - ภาพรวมระบบ
- **จัดการผู้ใช้** - Suspend/Unsuspend
- **จัดการสิ่งของ** - ลบสิ่งของไม่เหมาะสม
- **จัดการรายงาน** - ดำเนินการรายงานจากผู้ใช้
- **Activity Logs** - ประวัติการดำเนินการ

### 7. ความปลอดภัย (Security)

- **Distributed Rate Limiting** - Upstash Redis backing (100 req/min)
- **termsAccepted** - API ที่เกี่ยวกับการโพสต์/รายงาน/support ตรวจยอมรับข้อกำหนดแล้ว
- **Image Magic Byte Validation** - ตรวจสอบไฟล์จริง (JPEG, PNG, GIF, WebP)
- **API Validation Wrapper** - Server-side Zod validation ทุก request
- **Exchange State Machine** - ป้องกันสถานะเปลี่ยนผิดปกติ
- **Request ID Tracking** - Traceable requests for debugging
- **Firebase Security Rules** - Defenses in depth for DB & Storage

### 8. Progressive Web App (PWA)

- **Installable** - ติดตั้งเป็น App บนมือถือ/เดสก์ท็อป
- **Offline Support** - ใช้งานได้แม้ไม่มีอินเทอร์เน็ต (cached pages)
- **App Shortcuts** - ทางลัดไปยังหน้าหลักๆ
- **Background Sync** - อัพเดทข้อมูลเมื่อกลับมาออนไลน์

### 9. Performance Optimization

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

### 10. Testing & Quality Assurance

- **Unit Tests** - Vitest ~119 tests (API validation, security, exchange state machine, db, reports, auth, rate-limit, item-deletion, utils)
- **E2E Tests** - Playwright 84 tests (API security, dashboard, navigation, auth pages) — รัน 4 browsers; ชุด Basic Navigation / Landing / Auth Pages ข้ามบน WebKit เนื่องจาก Next.js hydration ใน Playwright
- **Firestore Rules Tests** - `npm run test:rules` (ต้องรัน Firebase Emulator)
- **Coverage** - `npm run test:coverage`

```bash
# Unit tests
npm run test

# E2E tests (Chromium, Firefox, WebKit, Mobile Chrome)
npm run test:e2e

# Type-check + unit test + build
npm run check-all
```

### 11. Monitoring & Error Tracking (`lib/monitoring.ts`)

- **Error Logging** - บันทึก errors แบบศูนย์กลาง
- **Performance Tracking** - จับเวลา operations
- **Log Levels** - debug, info, warn, error, fatal
- **Exception Capturing** - รองรับ Sentry integration

```typescript
import { error, startTimer, captureException } from '@/lib/monitoring'

// Log error
error('Operation failed', new Error('Something went wrong'), { userId: '123' })

// Track performance
const endTimer = startTimer('fetchUsers')
// ... do work
endTimer() // logs duration
```

### 12. Security Utilities (`lib/security.ts`)

| Function | Description |
|----------|-------------|
| `sanitizeHtml()` | ป้องกัน XSS attacks |
| `sanitizeText()` | ลบ control characters |
| `isValidRMUEmail()` | ตรวจสอบ email RMU |
| `sanitizeUrl()` | ตรวจสอบ URL ปลอดภัย |
| `hasSuspiciousPatterns()` | ตรวจจับ SQL injection |
| `sanitizeFilename()` | ทำความสะอาดชื่อไฟล์ |

### 13. Accessibility (`lib/a11y.ts`)

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

# 2. ติดตั้ง dependencies
bun install

# 2b. npm/pnpm/yarn alternative
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

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# Application
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# System Hardening (Production)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

```

### ยืนยันอีเมล (Email Verification)

- **ระยะเวลาลิงก์:** ลิงก์ยืนยันอีเมลใช้ได้ **3 วัน** (ค่าเริ่มต้นของ Firebase)
- **ยืนยันอัตโนมัติเมื่อกดลิงก์:** เมื่อผู้ใช้คลิกลิงก์จากอีเมล ระบบจะยืนยันให้อัตโนมัติแล้วนำไป Dashboard
- **ตั้งค่า Custom Action URL (แนะนำ):** เพื่อให้ลิงก์ในอีเมลเปิดมาที่แอปของคุณ — ไปที่ [Firebase Console](https://console.firebase.google.com/) → **Authentication** → **Templates** → แก้ไขเทมเพลตอีเมลที่ใช้ → **Customize action URL** กำหนดเป็น `https://your-domain.com/verify-email` (และเพิ่มโดเมนใน Authorized domains ถ้ายังไม่มี)

---

## 🧪 การทดสอบ (Testing)

### Unit Tests (Vitest)

```bash
# รันทุก test
bun run test

# รันพร้อม watch mode
bun run test:watch

# รันพร้อม coverage report
bun run test:coverage
```

### E2E Tests (Playwright)

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
> (หน้า Swagger UI `/api-docs` ปิดใช้งานชั่วคราว)

**ฟีเจอร์ที่ปิดใช้งานชั่วคราว:** หน้าเกี่ยวกับเรา (/about), API Docs (/api-docs), Help Bot (แชทบอท) · หน้า Contact ถูกลบแล้ว · Cron cleanup ถูกลบออกจาก Vercel แล้ว

### API Endpoints (สรุป)

| กลุ่ม | Method | Endpoint | คำอธิบาย |
|-------|--------|----------|----------|
| **Items** | GET | `/api/items` | list (filter, search, pagination) |
| | POST | `/api/items` | สร้าง item (ต้อง auth + terms + canPost) |
| | GET | `/api/items/[id]` | ดึงรายการเดียว |
| | PATCH / DELETE | `/api/items/[id]` | แก้ไข/ลบ (เจ้าของเท่านั้น) |
| **Users** | GET | `/api/users/me` | โปรไฟล์ผู้ใช้ที่ล็อกอิน |
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
| **Reviews** | GET | `/api/reviews?targetUserId=` | list รีวิวที่ user ได้รับ |
| | POST | `/api/reviews` | สร้างรีวิว |
| **Exchanges** | GET | `/api/exchanges` | list การแลกเปลี่ยน |
| | POST | `/api/exchanges` | สร้างคำขอแลกเปลี่ยน (ต้อง terms) |
| | POST | `/api/exchanges/respond` | ตอบรับ/ปฏิเสธ |
| | PATCH | `/api/exchanges/[id]` | อัปเดตสถานะ |
| **Reports / Support** | POST | `/api/reports`, `/api/support` | สร้างรายงาน / ticket (ต้อง terms) |
| **Admin / LINE / Upload** | - | `/api/admin/*`, `/api/line/*`, `/api/upload` | ดู docs/API.md |

### Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 100 requests | 1 minute |
| Upload | 10 requests | 1 minute |
| Authentication | 5 requests | 1 minute |

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

- File Type Validation
- Max File Size: 10MB
- Server-side Processing
- Cloudinary CDN

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
| **Error Tracking** | `lib/error-tracker.ts` | Sentry-ready error logging |
| **Login Protection** | `lib/login-tracker.ts` | ป้องกัน brute force attack |
| **Session Management** | `lib/session-manager.ts` | จัดการ sessions หลายอุปกรณ์ |
| **Caching** | `lib/cache.ts` | In-memory cache with TTL |
| **Feature Flags** | `lib/feature-flags.ts` | เปิด/ปิด features ได้ |
| **Searching** | `lib/search.ts` | Fuzzy search + scoring |
| **Backups** | `.github/workflows/backup.yml` | Automated daily Firestore backups |
| **Restore** | `scripts/restore-firestore.ts` | Restore data from backup |
| **Validation** | `lib/api-validation.ts` | Centralized API validation + requireTermsAccepted |
| **State Machine** | `lib/exchange-state-machine.ts` | Exchange status transitions |
| **API Client** | `lib/api-client.ts` | authFetchJson / getAuthToken สำหรับเรียก API จาก client |
| **Health Check** | `/api/health` | System status monitoring |
| **App Check** | `lib/app-check.ts` | Firebase App Check (bot protection) |
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
