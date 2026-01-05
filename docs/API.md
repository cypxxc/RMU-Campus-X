# RMU Exchange - API Documentation

## Overview

เอกสารนี้อธิบาย API functions ทั้งหมดที่ใช้ใน RMU Exchange system

---

## Authentication (`lib/auth.ts`)

### `validateRMUEmail(email: string): boolean`
ตรวจสอบว่า email เป็น format ที่ถูกต้องของ RMU

| Parameter | Type | Description |
|-----------|------|-------------|
| email | string | อีเมลที่ต้องการตรวจสอบ |

**Returns:** `boolean` - true ถ้า email เป็น 12 หลัก + @rmu.ac.th

**Example:**
```typescript
validateRMUEmail('123456789012@rmu.ac.th') // true
validateRMUEmail('test@gmail.com') // false
```

---

### `registerUser(email: string, password: string): Promise<User>`
สมัครสมาชิกใหม่

| Parameter | Type | Description |
|-----------|------|-------------|
| email | string | อีเมล @rmu.ac.th |
| password | string | รหัสผ่าน |

**Returns:** Firebase User object

**Throws:** Error ถ้า email ไม่ใช่ @rmu.ac.th

---

### `loginUser(email: string, password: string): Promise<User>`
เข้าสู่ระบบ

**Throws:** Error ถ้ายังไม่ยืนยันอีเมล

---

### `signOut(): Promise<void>`
ออกจากระบบ

---

## Items (`lib/firestore.ts`)

### `createItem(itemData): Promise<string>`
สร้างรายการสิ่งของใหม่

| Parameter | Type | Description |
|-----------|------|-------------|
| itemData | Omit<Item, 'id' \| 'postedAt' \| 'updatedAt'> | ข้อมูลสิ่งของ |

**Returns:** Document ID ของ item ที่สร้าง

---

### `getItems(filters?): Promise<{ items, lastDoc, hasMore }>`
ดึงรายการสิ่งของพร้อม pagination

| Parameter | Type | Description |
|-----------|------|-------------|
| filters.category | ItemCategory | กรองตามหมวดหมู่ |
| filters.status | ItemStatus | กรองตามสถานะ |
| filters.pageSize | number | จำนวนต่อหน้า (default: 20) |
| filters.lastDoc | DocumentSnapshot | cursor สำหรับ pagination |

**Returns:**
```typescript
{
  items: Item[],
  lastDoc: DocumentSnapshot | null,
  hasMore: boolean
}
```

---

### `getItemById(id: string): Promise<Item | null>`
ดึงข้อมูลสิ่งของตาม ID

**Returns:** Item object หรือ null ถ้าไม่พบ

---

### `updateItem(id: string, data: Partial<Item>): Promise<void>`
อัปเดตข้อมูลสิ่งของ

---

### `deleteItem(id: string): Promise<void>`
ลบสิ่งของ

---

## Exchanges (`lib/firestore.ts`)

### `createExchange(exchangeData): Promise<string>`
สร้างคำขอแลกเปลี่ยน

---

### `getExchangesByUser(userId: string): Promise<Exchange[]>`
ดึงรายการแลกเปลี่ยนของผู้ใช้

---

### `updateExchange(id: string, data: Partial<Exchange>): Promise<void>`
อัปเดตสถานะการแลกเปลี่ยน

---

### `cancelExchange(exchangeId, itemId, userId, reason?): Promise<void>`
ยกเลิกการแลกเปลี่ยน

---

## Reports (`lib/firestore.ts`)

### `createReport(reportData): Promise<string>`
สร้างรายงานปัญหา

---

### `getReports(): Promise<Report[]>`
ดึงรายการรายงานทั้งหมด (admin only)

---

### `updateReportStatus(reportId, status, adminId, adminEmail, note?): Promise<void>`
อัปเดตสถานะรายงาน (admin only)

---

## Notifications (`lib/firestore.ts`)

### `createNotification(data): Promise<string>`
สร้างการแจ้งเตือน

---

### `getNotifications(userId: string): Promise<AppNotification[]>`
ดึงการแจ้งเตือนของผู้ใช้

---

### `markNotificationAsRead(notificationId: string): Promise<void>`
ทำเครื่องหมายว่าอ่านแล้ว

---

### `markAllNotificationsAsRead(userId: string): Promise<void>`
ทำเครื่องหมายว่าอ่านทั้งหมด

---

## Support Tickets (`lib/firestore.ts`)

### `createSupportTicket(ticketData): Promise<string>`
สร้าง support ticket

---

### `getSupportTickets(status?): Promise<SupportTicket[]>`
ดึง tickets ทั้งหมด (admin only)

---

### `replyToTicket(ticketId, reply, adminId, adminEmail): Promise<void>`
ตอบกลับ ticket (admin only)

---

## User Management (`lib/firestore.ts`)

### `updateUserStatus(userId, status, adminId, adminEmail, reason?, suspendDays?): Promise<void>`
อัปเดตสถานะผู้ใช้ (admin only)

| Status | Description |
|--------|-------------|
| ACTIVE | ใช้งานปกติ |
| WARNING | ได้รับคำเตือน |
| SUSPENDED | ถูกระงับชั่วคราว |
| BANNED | ถูกแบนถาวร |

---

### `issueWarning(userId, userEmail, reason, adminId, adminEmail): Promise<void>`
ออกคำเตือนให้ผู้ใช้ (admin only)

---

## Rate Limiting (`lib/rate-limit.ts`)

### `isOnCooldown(action: string, userId: string): boolean`
ตรวจสอบว่าอยู่ใน cooldown หรือไม่

| Action | Cooldown |
|--------|----------|
| createItem | 60 วินาที |
| createSupportTicket | 5 นาที |
| createExchange | 30 วินาที |
| createReport | 2 นาที |

---

### `recordAction(action: string, userId: string): void`
บันทึกการกระทำ (เริ่ม cooldown)

---

### `formatCooldownTime(ms: number): string`
แปลง milliseconds เป็นข้อความภาษาไทย

---

## Types (`types/index.ts`)

### ItemCategory
```typescript
type ItemCategory = 'electronics' | 'books' | 'furniture' | 'clothing' | 'sports' | 'other'
```

### ItemStatus
```typescript
type ItemStatus = 'available' | 'pending' | 'completed'
```

### ExchangeStatus
```typescript
type ExchangeStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected'
```

### UserStatus
```typescript
type UserStatus = 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'BANNED'
```
