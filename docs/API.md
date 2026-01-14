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

## Endpoints

### Items

#### Get Items
```http
GET /api/items
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `status` | string | Filter by status (available, pending, completed) |
| `search` | string | Search query |
| `limit` | number | Items per page (default: 20) |
| `cursor` | string | Pagination cursor |

**Response:**
```json
{
  "items": [...],
  "hasMore": true,
  "nextCursor": "abc123"
}
```

#### Get Item by ID
```http
GET /api/items/[id]
```

#### Delete Item
```http
DELETE /api/items/[id]/delete
```
*Requires authentication*

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
*Requires authentication*

**Body:**
```json
{
  "revieweeId": "string",
  "exchangeId": "string",
  "rating": 1-5,
  "comment": "string"
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
  "lineUserId": "string"
}
```

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

*Last updated: 2026-01-14*
