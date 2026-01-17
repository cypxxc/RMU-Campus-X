# RMU-Campus X

**ระบบแพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษา มหาวิทยาลัยราชภัฏมหาสารคาม**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?logo=next.js)](https://nextjs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3.6-f9f1e1?logo=bun)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12.5-orange?logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-69%20passed-success)]()

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
│  /api/admin/*     │  /api/exchanges/*   │  /api/line/*          │
│  /api/reports/*   │  /api/support/*     │  /api/upload/*        │
│  ────────────────────────────────────────────────────────────── │
│  • Rate Limiting Middleware (100 req/min)                       │
│  • Firebase Admin SDK Authentication                            │
│  • API Response Wrapper with Timeout                            │
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

```
User Action → React Component → API Route → Firebase/Service → Response
     │              │               │              │              │
     │              ↓               ↓              ↓              ↓
     │         Validation      Rate Limit     Firestore      JSON/Error
     │              │               │              │              │
     │              ↓               ↓              ↓              ↓
     └──────────► Toast ◄──────────┴──────────────┴──────────────┘
                Notification
```

---

## 🛠 เทคโนโลยีที่ใช้ (Technology Stack)

### Frontend

| เทคโนโลยี | เวอร์ชัน | การใช้งาน |
|-----------|----------|-----------|
| **Next.js** | 16.1.1 | Framework หลัก (App Router, RSC, Turbopack) |
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
| **Vitest** | 4.0.17 | Unit Testing (69 tests, via Bun) |
| **Playwright** | 1.57.0 | E2E Testing (64 tests, 4 browsers) |
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
│   │   ├── line/                     # LINE Integration
│   │   ├── reports/                  # Report APIs
│   │   ├── support/                  # Support APIs
│   │   └── upload/                   # Image Upload API
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
│   ├── filter-sidebar.tsx            # Category Filters
│   ├── item-card.tsx                 # Item Display Card
│   ├── item-card-skeleton.tsx        # Loading Skeleton
│   ├── post-item-modal.tsx           # Create Item Modal
│   └── ...                           # Other Components
│
├── lib/                              # Utility Libraries
│   ├── db/                           # Database Operations
│   │   ├── items.ts                  # Items CRUD
│   │   ├── exchanges.ts              # Exchanges CRUD
│   │   ├── users.ts                  # Users CRUD
│   │   ├── notifications.ts          # Notifications
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

- **สมัครสมาชิกด้วยอีเมล @rmu.ac.th** - จำกัดเฉพาะนักศึกษา
- **ยืนยันอีเมล (Email Verification)** - ป้องกันบัญชีปลอม
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

- **In-App Notifications** - แจ้งเตือนในระบบ
- **LINE Push Notifications** - แจ้งเตือนผ่าน LINE
- **Admin Alerts** - แจ้ง Admin เมื่อมีรายงานใหม่

### 6. ระบบผู้ดูแล (Admin Panel)

- **Dashboard สถิติ** - ภาพรวมระบบ
- **จัดการผู้ใช้** - Suspend/Unsuspend
- **จัดการสิ่งของ** - ลบสิ่งของไม่เหมาะสม
- **จัดการรายงาน** - ดำเนินการรายงานจากผู้ใช้
- **Activity Logs** - ประวัติการดำเนินการ

### 7. ความปลอดภัย (Security)

- **Rate Limiting** - 100 req/min สำหรับ API ทั่วไป
- **Image Validation** - ตรวจสอบประเภทไฟล์
- **Firebase Security Rules** - ป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต
- **Input Validation** - Zod Schema Validation

### 8. Progressive Web App (PWA)

- **Installable** - ติดตั้งเป็น App บนมือถือ/เดสก์ท็อป
- **Offline Support** - ใช้งานได้แม้ไม่มีอินเทอร์เน็ต (cached pages)
- **App Shortcuts** - ทางลัดไปยังหน้าหลักๆ
- **Background Sync** - อัพเดทข้อมูลเมื่อกลับมาออนไลน์

### 9. Performance Optimization

| การปรับปรุง | รายละเอียด |
|-------------|------------|
| **Pagination** | Admin pages ใช้ pagination แทน fetch all |
| **Lazy Loading** | Components ที่ไม่จำเป็นโหลดตอนหลัง |
| **Count Aggregations** | API stats ใช้ count() แทน fetch all docs |
| **Query Limits** | จำกัด query ไม่เกิน 200 items |
| **Batch Queries** | รวม queries เพื่อลด reads |
| **Image Caching** | Service Worker cache รูปจาก Cloudinary |

### 10. Testing & Quality Assurance

- **Unit Tests** - Vitest สำหรับทดสอบ functions หลัก
- **Security Tests** - ทดสอบ input validation & sanitization
- **Database Tests** - ทดสอบ Firestore operations
- **Coverage Reports** - ดู code coverage ด้วย `bun run test:coverage`

```bash
# Run tests
bun run test

# Run with coverage
bun run test:coverage
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

### ขั้นตอนการติดตั้ง

```bash
# 1. Clone repository
git clone https://github.com/cypxxc/5-1-2569.git
cd rmu-campus-x

# 2. ติดตั้ง dependencies
bun install

# 3. ตั้งค่า environment variables (ดูหัวข้อถัดไป)
cp .env.example .env

# 4. รันโหมด Development (พร้อม Turbopack)
bun dev

# 5. เปิด browser ไปที่ http://localhost:3000
```

### Scripts ที่มีให้ใช้งาน

| Script | คำอธิบาย |
|--------|----------|
| `bun dev` | รันโหมด Development (Turbopack) |
| `bun run build` | Build สำหรับ Production |
| `bun start` | รัน Production Server |
| `bun run lint` | ตรวจสอบ Code Quality |
| `bun run test` | รัน Unit Tests (Vitest) |
| `bun run test:e2e` | รัน E2E Tests (Playwright) |
| `bun run test:e2e:ui` | รัน E2E Tests พร้อม UI |
| `bun run check-all` | รัน Type-check, Tests และ Build ทั้งหมด |

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
```

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
bunx playwright install

# รันทุก test
bun run test:e2e

# รันพร้อม UI
bun run test:e2e:ui

# ดู test report
bunx playwright show-report
```

### Test Coverage

| ประเภท | ครอบคลุม |
|--------|----------|
| Unit Tests | API Wrapper, Utilities |
| E2E Tests | Dashboard, Navigation |

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

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/items` | ดึงรายการสิ่งของ (Admin) |
| DELETE | `/api/admin/items/[id]` | ลบสิ่งของ (Admin) |
| GET | `/api/admin/users` | ดึงรายการผู้ใช้ (Admin) |
| PATCH | `/api/admin/users/[id]` | อัปเดตสถานะผู้ใช้ (Admin) |
| GET | `/api/admin/reports` | ดึงรายการรายงาน (Admin) |
| PATCH | `/api/admin/reports/[id]` | อัปเดตสถานะรายงาน (Admin) |
| GET | `/api/exchanges` | ดึงรายการแลกเปลี่ยน |
| POST | `/api/exchanges` | สร้างคำขอแลกเปลี่ยน |
| PATCH | `/api/exchanges/[id]` | อัปเดตสถานะแลกเปลี่ยน |
| POST | `/api/upload` | อัปโหลดรูปภาพ |
| POST | `/api/line/link` | เชื่อมต่อ LINE Account |
| POST | `/api/line/webhook` | LINE Webhook |

### Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 100 requests | 1 minute |
| Upload | 10 requests | 1 minute |
| Authentication | 5 requests | 1 minute |

### Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

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
| **Search Engine** | `lib/search.ts` | Fuzzy search + relevance scoring |
| **Image Gallery** | `components/image-gallery.tsx` | Lightbox + zoom |
| **Database Backup** | `scripts/backup-firestore.ts` | Script สำรองข้อมูล |
| **Migrations** | `scripts/migrate.ts` | Database schema migrations |

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
