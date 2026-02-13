# รายการ API ทั้งหมด (ทุก Endpoint) — สำหรับพรีเซนต์โครงงานจบ

เอกสารนีรรายการ **ทุก API route** ในระบบ พร้อม Method, Path, Auth, และหน้าที่โดยย่อ

---

## สรุปตารางทุก Endpoint

### Items

| Method | Path | Auth | หน้าที่ |
|--------|------|------|--------|
| GET | `/api/items` | Bearer | List สิ่งของ (filter: categories, status, search, pageSize, lastId, postedBy; คืน items, lastId, hasMore, totalCount) |
| POST | `/api/items` | Bearer + terms + canPost | สร้าง item (body: title, description, category, location, locationDetail?, imagePublicIds?, imageUrls?) |
| GET | `/api/items/[id]` | Bearer | ดึงรายการเดียว |
| PATCH | `/api/items/[id]` | Bearer, เจ้าของเท่านั้น | แก้ไข item (partial) |
| DELETE | `/api/items/[id]` | Bearer, เจ้าของเท่านั้น | ลบ item |

### Exchanges

| Method | Path | Auth | หน้าที่ |
|--------|------|------|--------|
| GET | `/api/exchanges` | Bearer | List การแลกเปลี่ยนของ user (ไม่รวมที่ซ่อนแล้ว) |
| POST | `/api/exchanges` | Bearer + terms | สร้างคำขอแลกเปลี่ยน (body: itemId, message) |
| POST | `/api/exchanges/respond` | Bearer + terms | เจ้าของตอบรับ/ปฏิเสธ (body: exchangeId, action: accept \| reject) |
| POST | `/api/exchanges/confirm` | Bearer + terms | ยืนยันส่งมอบ/รับของ (body: exchangeId, role: owner \| requester) |
| POST | `/api/exchanges/cancel` | Bearer | ยกเลิกการแลกเปลี่ยน (body: exchangeId) |
| GET | `/api/exchanges/[id]` | Bearer, participant | ดึงรายละเอียด exchange |
| PATCH | `/api/exchanges/[id]` | Bearer, participant | อัปเดตสถานะ (ตาม state machine) |
| DELETE | `/api/exchanges/[id]` | Bearer, participant | ลบ exchange (ใช้ในกรณีเฉพาะ) |
| POST | `/api/exchanges/[id]/hide` | Bearer, participant | ซ่อนจากรายการ "การแลกเปลี่ยนของฉัน" (อีกฝ่ายยังเห็น) |

### Chat (ข้อความการแลกเปลี่ยน)

| Method | Path | Auth | หน้าที่ |
|--------|------|------|--------|
| GET | `/api/chat/[exchangeId]/messages` | Bearer, participant | List ข้อความในแชท (pagination) |
| POST | `/api/chat/[exchangeId]/messages` | Bearer, participant | ส่งข้อความ (body: message, imageUrl?) |
| POST | `/api/chat/[exchangeId]/messages/read` | Bearer, participant | มาร์กว่าอ่านแล้ว (read receipt) |
| PATCH | `/api/chat/[exchangeId]/messages/[messageId]` | Bearer, sender | แก้ไขข้อความ |
| DELETE | `/api/chat/[exchangeId]/messages/[messageId]` | Bearer, sender | ลบข้อความ |

### Notifications

| Method | Path | Auth | หน้าที่ |
|--------|------|------|--------|
| GET | `/api/notifications` | Bearer | List แจ้งเตือน (query: pageSize, lastId, types?, unreadOnly?) |
| POST | `/api/notifications` | Bearer (หรือ system) | สร้าง notification (ใช้ฝั่ง server/แจ้งข้าม user) |
| PATCH | `/api/notifications/[id]` | Bearer | มาร์กว่าอ่านแล้ว |
| DELETE | `/api/notifications/[id]` | Bearer | ลบการแจ้งเตือน |
| POST | `/api/notifications/read-all` | Bearer | อ่านทั้งหมด |

### Favorites

| Method | Path | Auth | หน้าที่ |
|--------|------|------|--------|
| GET | `/api/favorites` | Bearer | List รายการโปรด (คืน items หรือ itemIds) |
| GET | `/api/favorites/check?itemId=xxx` | Bearer | ตรวจว่า item ถูกโปรดหรือไม่ |
| POST | `/api/favorites` | Bearer | เพิ่มรายการโปรด (body: itemId, itemTitle?, itemImage?) |
| DELETE | `/api/favorites/[itemId]` | Bearer | ลบรายการโปรด |

### Users

| Method | Path | Auth | หน้าที่ |
|--------|------|------|--------|
| GET | `/api/users/me` | Bearer | โปรไฟล์ผู้ใช้ล็อกอิน (คืน isAdmin, สร้าง user doc ถ้ายังไม่มี, auto-unsuspend) |
| PATCH | `/api/users/me` | Bearer | แก้ไขโปรไฟล์ (displayName, photoURL, bio) |
| POST | `/api/users/me/accept-terms` | Bearer | ยอมรับข้อกำหนดและนโยบาย |
| DELETE | `/api/users/me/delete` | Bearer | ลบบัญชีผู้ใช้ (และข้อมูลที่เชื่อม) |
| GET | `/api/users/[id]` | ไม่บังคับ | โปรไฟล์สาธารณะ (ไม่ต้อง auth) |

### Reviews

| Method | Path | Auth | หน้าที่ |
|--------|------|------|--------|
| GET | `/api/reviews?targetUserId=xxx&limit=` | ไม่บังคับ | List รีวิวที่ user ได้รับ (กรองผู้รีวิวที่ถูกลบแล้ว) |
| POST | `/api/reviews` | Bearer + terms | สร้างรีวิว (ตรวจผู้ร่วมแลกเปลี่ยน, อัปเดต rating) |

### Reports

| Method | Path | Auth | หน้าที่ |
|--------|------|------|--------|
| POST | `/api/reports` | Bearer + terms | สร้างรายงาน (body: reportType, targetId, reasonCode, description, evidenceUrls?) |

### Support

| Method | Path | Auth | หน้าที่ |
|--------|------|------|--------|
| GET | `/api/support` | Bearer | รายการคำร้องของฉัน (query: summary=hasTickets ได้แค่ hasTickets) |
| POST | `/api/support` | Bearer + terms | สร้าง ticket (body: subject, category, description) |
| POST | `/api/support/[ticketId]/messages` | Bearer, เจ้าของ ticket | ส่งข้อความในคำร้อง (body: message) |
| DELETE | `/api/support/[ticketId]` | Bearer, เจ้าของ ticket | ลบ/ซ่อน ticket (ถ้ามีใช้) |

### Announcements

| Method | Path | Auth | หน้าที่ |
|--------|------|------|--------|
| GET | `/api/announcements` | ไม่บังคับ | List ประกาศสำหรับแบนเนอร์ (isActive, ในช่วง startAt–endAt) + nextCheckInMs |
| GET | `/api/announcements/history` | ไม่บังคับ | ประวัติประกาศย้อนหลัง (สำหรับหน้า /announcements) |

### Upload

| Method | Path | Auth | หน้าที่ |
|--------|------|------|--------|
| POST | `/api/upload/sign` | Bearer (แนะนำ) | ขอ signature สำหรับ Signed Upload ไป Cloudinary (body: preset: item \| avatar \| announcement) |
| POST | `/api/upload` | Bearer | อัปโหลดรูปผ่าน server (multipart; ถ้ามีใช้) |

### LINE

| Method | Path | Auth | หน้าที่ |
|--------|------|------|--------|
| POST | `/api/line/webhook` | LINE signature | Webhook รับข้อความจาก LINE (คำสั่ง: เชื่อมบัญชี, แชท, สถานะ, ออก, ยกเลิกการเชื่อมต่อ, คู่มือ ฯลฯ) |
| POST | `/api/line/link` | Bearer | เชื่อมบัญชี LINE ด้วยรหัส 6 หลัก (body: userId, linkCode) |
| GET | `/api/line/link?userId=xxx` | Bearer | ดึงสถานะการเชื่อม LINE และการตั้งค่า |
| PATCH | `/api/line/link` | Bearer | อัปเดตการตั้งค่าแจ้งเตือน LINE (body: userId?, settings) |
| DELETE | `/api/line/link` | Bearer | ยกเลิกการเชื่อม LINE (body: userId?) |
| POST | `/api/line/notify-exchange` | Server | แจ้ง LINE เมื่อมีการตอบรับ/ปฏิเสธการแลกเปลี่ยน |
| POST | `/api/line/notify-chat` | Bearer/Server | แจ้งอีกฝ่ายเมื่อมีข้อความแชทใหม่ (participant เท่านั้น) |
| POST | `/api/line/notify-item` | Server | แจ้งเมื่อมีคนขอรับสิ่งของ |
| POST | `/api/line/notify-admin` | Server | แจ้งแอดมินเมื่อมีรายงานใหม่ ฯลฯ |
| POST | `/api/line/notify-user-action` | Server | แจ้งผู้ใช้ตาม action (ถ้ามีใช้) |
| GET | `/api/admin/line-rich-menu` | Admin | ดึง Rich Menu ปัจจุบัน |
| PATCH | `/api/admin/line-rich-menu` | Admin | อัปเดต Rich Menu |
| POST | `/api/admin/line-rich-menu` | Admin | สร้าง Rich Menu |
| DELETE | `/api/admin/line-rich-menu` | Admin | ลบ Rich Menu |
| POST | `/api/admin/line-test` | Admin | ทดสอบส่งข้อความ LINE |

### Health & Public

| Method | Path | Auth | หน้าที่ |
|--------|------|------|--------|
| GET | `/api/health` | ไม่บังคับ | Health check (Firestore, env, memory; คืน status, checks) |
| GET | `/api/public/stats` | ไม่บังคับ | สถิติสาธารณะ (ถ้ามีใช้สำหรับ landing) |
| GET | `/api/analytics/vitals` | ไม่บังคับ | รับ Core Web Vitals (ถ้ามีใช้) |

---

## Admin API (ต้องเป็น Admin)

### Admin – ตรวจสิทธิ์และสถิติ

| Method | Path | หน้าที่ |
|--------|------|--------|
| GET | `/api/admin/verify` | ตรวจว่า user ปัจจุบันเป็น Admin หรือไม่ |
| GET | `/api/admin/stats` | สถิติแดชบอร์ด (จำนวน users, items, reports, exchanges; ใช้ count aggregation) |

### Admin – Users

| Method | Path | หน้าที่ |
|--------|------|--------|
| GET | `/api/admin/users` | List ผู้ใช้ (pagination) |
| GET | `/api/admin/users/[id]` | ดึงรายละเอียด user |
| PATCH | `/api/admin/users/[id]` | แก้ไข user (displayName ฯลฯ) |
| POST | `/api/admin/users/[id]/status` | เปลี่ยนสถานะ (suspend/unsuspend/ban ฯลฯ) |
| POST | `/api/admin/users/[id]/warning` | ออกคำเตือน |
| DELETE | `/api/admin/users/[id]/warnings/[warningId]` | ลบคำเตือน |
| GET | `/api/admin/users/[id]/notifications` | List แจ้งเตือนของ user |
| DELETE | `/api/admin/users/[id]/notifications` | ลบแจ้งเตือนของ user (หรือลบทั้งหมด) |
| DELETE | `/api/admin/users/[id]` | ลบ user (และข้อมูลที่เชื่อม) |
| POST | `/api/admin/users/[id]/delete` | ลบ user (alias หรือ flow อื่น) |
| POST | `/api/admin/users/cleanup-orphans` | ลบ user docs ที่ไม่มี Auth (orphans) |

### Admin – Items

| Method | Path | หน้าที่ |
|--------|------|--------|
| GET | `/api/admin/items` | List สิ่งของทั้งหมด (pagination/filter) |
| GET | `/api/admin/items/[id]` | ดึงรายการเดียว |
| PATCH | `/api/admin/items/[id]` | แก้ไข (admin override) |
| DELETE | `/api/admin/items/[id]` | ลบ (admin override) |

### Admin – Reports

| Method | Path | หน้าที่ |
|--------|------|--------|
| GET | `/api/admin/reports` | List รายงาน (filter สถานะ) |
| GET | `/api/admin/reports/[id]` | ดึงรายละเอียดรายงาน |
| PATCH | `/api/admin/reports/[id]` | อัปเดตสถานะรายงาน |
| POST | `/api/admin/reports/[id]/notify-owner` | แจ้งเจ้าของรายงาน (เช่น ขอข้อมูลเพิ่ม) |

### Admin – Support

| Method | Path | หน้าที่ |
|--------|------|--------|
| GET | `/api/admin/support` | List ticket ทั้งหมด (pagination) |
| POST | `/api/admin/support/[ticketId]/reply` | ตอบกลับคำร้อง (admin) |
| PATCH | `/api/admin/support/[ticketId]/status` | เปลี่ยนสถานะ ticket |

### Admin – Announcements

| Method | Path | หน้าที่ |
|--------|------|--------|
| GET | `/api/admin/announcements` | List ประกาศ |
| POST | `/api/admin/announcements` | สร้างประกาศ |
| GET | `/api/admin/announcements/[id]` | ดึงรายการเดียว (ถ้ามี) |
| PATCH | `/api/admin/announcements/[id]` | แก้ไขประกาศ |
| DELETE | `/api/admin/announcements/[id]` | ลบประกาศ |

### Admin – Exchanges

| Method | Path | หน้าที่ |
|--------|------|--------|
| GET | `/api/admin/exchanges` | List การแลกเปลี่ยนทั้งหมด |
| DELETE | `/api/admin/exchanges/[id]` | ลบ exchange (admin) |
| POST | `/api/admin/exchanges/cleanup-old-completed` | ลบ/จัดเก็บการแลกเปลี่ยนที่ completed มานาน |

### Admin – Logs & Maintenance

| Method | Path | หน้าที่ |
|--------|------|--------|
| POST | `/api/admin/log` | บันทึก admin log (action, target, metadata) |
| POST | `/api/admin/consistency` | ตรวจ/แก้ความสอดคล้องข้อมูล (ถ้ามีใช้) |
| POST | `/api/admin/reindex-items` | สร้าง/อัปเดต searchKeywords ของ items |
| POST | `/api/admin/cleanup` | งาน cleanup ทั่วไป (drafts เก่า ฯลฯ) |

---

## รูปแบบ Response ทั่วไป

- **สำเร็จ:** `{ success: true, data: T }` หรือ `{ success: true, ...fields }`
- **ผิดพลาด:** `{ error: string, code?: string }` พร้อม HTTP status 4xx/5xx

## Rate Limiting

- ทั่วไป: 100 req/min (Upstash Redis)
- Upload: 10 req/min
- Auth: 5 req/min (หรือตามที่กำหนดใน middleware)
