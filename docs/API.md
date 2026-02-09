# API Documentation

## Overview

RMU-Campus X API เป็น RESTful API ที่ใช้สำหรับจัดการข้อมูลในระบบแลกเปลี่ยนสิ่งของ

**Base URL:** `https://rmu-campus-x.vercel.app/api`

## Authentication

API ใช้ Firebase Authentication โดยส่ง token ใน header:

```http
Authorization: Bearer <firebase_id_token>
```

## Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 100 requests | 1 minute |
| Auth endpoints | 20 requests | 1 minute |
| Upload | 10 requests | 1 minute |

---

## API Coverage (ครบทั้งระบบ)

| Method | Endpoint | คำอธิบาย | Auth |
|--------|----------|----------|------|
| **Items** | | | |
| GET | `/api/items` | list items (filter, search, pagination) | ✅ |
| POST | `/api/items` | สร้าง item | ✅ + terms |
| GET | `/api/items/[id]` | ดึงรายการเดียว | ✅ |
| PATCH | `/api/items/[id]` | แก้ไข (เจ้าของเท่านั้น) | ✅ |
| DELETE | `/api/items/[id]` | ลบ (เจ้าของเท่านั้น) | ✅ |
| **Exchanges** | | | |
| POST | `/api/exchanges` | สร้างคำขอแลกเปลี่ยน | ✅ + terms |
| POST | `/api/exchanges/respond` | ตอบรับ/ปฏิเสธ | ✅ + terms |
| POST | `/api/exchanges/cancel` | ยกเลิก | ✅ |
| GET | `/api/exchanges/[id]` | ดึงรายละเอียด (participant เท่านั้น) | ✅ |
| PATCH | `/api/exchanges/[id]` | อัปเดตสถานะ (participant + state machine) | ✅ |
| **Notifications** | | | |
| GET | `/api/notifications` | list การแจ้งเตือนของผู้ใช้ | ✅ |
| POST | `/api/notifications` | สร้าง notification (system/cross-user) | ✅ |
| PATCH | `/api/notifications/[id]` | mark as read | ✅ |
| **Favorites** | | | |
| GET | `/api/favorites` | list รายการโปรด | ✅ |
| POST | `/api/favorites` | add รายการโปรด (body: itemId, itemTitle?, itemImage?) | ✅ |
| DELETE | `/api/favorites/[itemId]` | ลบรายการโปรด | ✅ |
| **Users** | | | |
| GET | `/api/users/me` | ดึงโปรไฟล์ผู้ใช้ | ✅ |
| PATCH | `/api/users/me` | แก้ไขโปรไฟล์ (displayName, photoURL, bio) | ✅ |
| POST | `/api/users/me/accept-terms` | ยอมรับข้อกำหนดและนโยบาย | ✅ |
| DELETE | `/api/users/me/delete` | ลบบัญชี | ✅ |
| **Reviews** | | | |
| GET | `/api/reviews?targetUserId=xxx` | list รีวิวที่ user ได้รับ | ✅ |
| POST | `/api/reviews` | สร้างรีวิว | ✅ + terms |
| **Reports** | | | |
| POST | `/api/reports` | สร้างรายงาน | ✅ + terms |
| **Support** | | | |
| GET | `/api/support` | รายการคำร้องของฉัน | ✅ |
| POST | `/api/support` | สร้าง ticket | ✅ + terms |
| **Admin, LINE, Upload, Health** | (ดูรายละเอียดในเอกสารด้านล่าง) | | |

---

## Endpoints

### Items

#### Get Items (list)
```http
GET /api/items
```
*Requires authentication.* Query: `categories`, `status`, `search`, `pageSize`, `lastId`. Response: `{ success, items, lastId, hasMore }`.

#### Create Item
```http
POST /api/items
```
*Requires auth + terms + canPost.* Body: title, description, category, location, locationDetail?, imageUrls?.

#### Get Item by ID
```http
GET /api/items/[id]
```
*Requires authentication.*

#### Update Item
```http
PATCH /api/items/[id]
```
*Requires authentication – เจ้าของเท่านั้น.* Body: partial (title, description, category, location, locationDetail).

#### Delete Item
```http
DELETE /api/items/[id]
```
*Requires authentication – เจ้าของเท่านั้น.*

---

### Exchanges

#### Get User Exchanges
```http
GET /api/exchanges
```
*Requires authentication*

#### Create Exchange Request
```http
POST /api/exchanges
```

**Body:**
```json
{
  "itemId": "string",
  "message": "string"
}
```

#### Respond to Exchange
```http
POST /api/exchanges/respond
```
*Requires auth + terms accepted.*

**Body:**
```json
{
  "exchangeId": "string",
  "action": "accept" | "reject"
}
```

#### Cancel Exchange
```http
POST /api/exchanges/cancel
```

**Body:**
```json
{
  "exchangeId": "string"
}
```

---

### Notifications

#### Get Notifications
```http
GET /api/notifications
```
*Requires authentication*

**Response:**
```json
{
  "notifications": [
    {
      "id": "string",
      "type": "exchange_request" | "message" | "system",
      "title": "string",
      "body": "string",
      "read": false,
      "createdAt": "2026-01-14T00:00:00Z"
    }
  ]
}
```

---

### Reports

#### Create Report
```http
POST /api/reports
```
*Requires authentication*

**Body:**
```json
{
  "targetType": "item" | "user",
  "targetId": "string",
  "reason": "string",
  "description": "string"
}
```

---

### Support

#### Create Support Ticket
```http
POST /api/support
```
*Requires authentication*

**Body:**
```json
{
  "subject": "string",
  "message": "string",
  "category": "general" | "bug" | "feature" | "account"
}
```

---

### Reviews

#### Get Reviews
```http
GET /api/reviews?userId=xxx
```

#### Create Review
```http
POST /api/reviews
```
*Requires auth + terms accepted.*

**Body:**
```json
{
  "exchangeId": "string",
  "targetUserId": "string",
  "rating": 1-5,
  "itemTitle": "string",
  "comment": "string (optional)",
  "reviewerName": "string (optional)",
  "reviewerAvatar": "string URL (optional)"
}
```

---

### Upload

#### Upload Image
```http
POST /api/upload
```
*Requires authentication*

**Body:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `file` | File | Image file (max 5MB) |
| `folder` | string | Upload folder (items, profiles) |

**Response:**
```json
{
  "url": "https://res.cloudinary.com/...",
  "publicId": "string"
}
```

---

### LINE Integration

#### Link LINE Account
```http
POST /api/line/link
```
*Requires authentication*

**Body:**
```json
{
  "userId": "firebase_uid",
  "linkCode": "123456"
}
```

#### Get/Update/Unlink LINE Link State
```http
GET /api/line/link?userId=<firebase_uid>
PATCH /api/line/link
DELETE /api/line/link
```
*Requires authentication (owner only).*

`PATCH` body:
```json
{
  "userId": "firebase_uid",
  "settings": {
    "enabled": true,
    "exchangeRequest": true,
    "exchangeStatus": true,
    "exchangeComplete": true
  }
}
```

`DELETE` body (optional):
```json
{
  "userId": "firebase_uid"
}
```
Unlink via web now clears LINE connection and removes the user rich menu automatically.

#### LINE Bot Text Commands (via `/api/line/webhook`)

| Command | Purpose |
|---------|---------|
| `เชื่อมบัญชี`, `link` | ขอรหัส 6 หลักสำหรับเชื่อมบัญชีบนหน้าโปรไฟล์ |
| `<email>@rmu.ac.th` | เชื่อมบัญชีแบบพิมพ์อีเมลตรง |
| `สถานะ`, `status` | ตรวจสอบสถานะการเชื่อมต่อ LINE |
| `แชท`, `chat` | เรียกรายการการแลกเปลี่ยนที่ยังแชทได้ |
| `1..N` | เลือกรายการแชทหลังพิมพ์ `แชท` |
| `ออก`, `exit` | ออกจากโหมดแชท |
| `ยกเลิกการเชื่อมต่อ`, `unlink` | ตัดการเชื่อม LINE |
| `คู่มือ`, `help` | ดูคู่มือแบบย่อ |
| `โน้ต`, `note` | ดูคู่มือแบบละเอียด (ข้อความสำหรับเก็บเป็นโน้ต) |

---

## Admin Endpoints

*Requires admin authentication*

### Users

#### Get All Users
```http
GET /api/admin/users
```

#### Update User Status
```http
PATCH /api/admin/users/[id]/status
```

**Body:**
```json
{
  "status": "ACTIVE" | "SUSPENDED" | "BANNED",
  "reason": "string"
}
```

#### Issue Warning
```http
POST /api/admin/users/[id]/warning
```

**Body:**
```json
{
  "reason": "string",
  "severity": "low" | "medium" | "high"
}
```

### Items

#### Get All Items (Admin)
```http
GET /api/admin/items
```

#### Delete Item (Admin)
```http
DELETE /api/admin/items/[id]
```

### Reports

#### Get Reports
```http
GET /api/admin/reports
```

#### Update Report
```http
PATCH /api/admin/reports/[id]
```

**Body:**
```json
{
  "status": "pending" | "reviewed" | "resolved" | "dismissed",
  "resolution": "string"
}
```

### Stats

#### Get Dashboard Stats
```http
GET /api/admin/stats
```

**Response:**
```json
{
  "totalUsers": 100,
  "totalItems": 500,
  "totalExchanges": 200,
  "pendingReports": 5
}
```

### LINE Rich Menu

#### Manage Rich Menus (Admin)
```http
GET /api/admin/line-rich-menu
PATCH /api/admin/line-rich-menu
POST /api/admin/line-rich-menu
DELETE /api/admin/line-rich-menu?lineUserId=<line_user_id>
```
*Requires admin authentication.*

`GET` returns:
- configured default rich menu id from env (`LINE_RICH_MENU_DEFAULT_ID`)
- current default rich menu id on LINE
- list of available rich menus

`PATCH` actions:
- `set-default` + `richMenuId`
- `set-configured-default`
- `clear-default`

`POST` actions:
- `apply-default` + `lineUserId`
- `link` + `lineUserId` + `richMenuId`
- `unlink` + `lineUserId`

---

## Error Responses

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

| HTTP Code | Description |
|-----------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## Webhooks

### LINE Webhook
```http
POST /api/line/webhook
```

Used for receiving LINE messages and events.

---

## Best Practices

1. Always include `Authorization` header for protected endpoints
2. Handle rate limit errors (429) with exponential backoff
3. Use pagination for large datasets
4. Validate input on client side before sending

---

*Last updated: 2026-02-09*
