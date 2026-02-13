# รายการฟังก์ชันหลักใน Lib — สำหรับพรีเซนต์โครงงานจบ

เอกสารนีรรายการ **ฟังก์ชันที่ export จาก lib/** ที่ใช้ในระบบ (โฟกัส lib/db, lib/services, lib/api-client และไฟล์หลักอื่นๆ)

---

## 1. lib/api-client.ts (เรียก API จาก Client)

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `getAuthToken()` | ดึง Firebase ID Token ของ user ปัจจุบัน (cache 45 วินาที); คืน null ถ้าไม่มี user |
| `authFetch(url, options)` | ส่ง HTTP request พร้อม header `Authorization: Bearer <token>`; retry เฉพาะ GET/HEAD/OPTIONS เมื่อ 429/5xx/network error (สูงสุด 2 ครั้ง, exponential backoff + Retry-After); POST/PATCH/PUT/DELETE ไม่ retry |
| `authFetchJson(url, options)` | เรียก authFetch แล้ว parse JSON; คืน `{ success?, data?, error? }` |
| `isTransientNetworkError(error)` | ตรวจว่า error เป็น network ชั่วคราวหรือไม่ (ใช้ตัดสิน retry/fail-fast) |

---

## 2. lib/firestore.ts (Re-export จาก lib/db)

ไฟล์นี้ re-export จาก `lib/db/*` (ยกเว้น collections ที่ใช้ firebase-admin เฉพาะ server)

---

## 3. lib/db/items.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `createItem(itemData)` | สร้าง item; เรียก POST `/api/items` ผ่าน authFetchJson; คืน id |
| `getItems(filters?)` | List items; เรียก GET `/api/items` พร้อม query (pageSize, lastId, categories, status, searchQuery, postedBy, includeFavoriteStatus); คืน items, lastId, hasMore, totalCount |
| `getItemById(id)` | ดึงรายการเดียว; เรียก GET `/api/items/[id]` |
| `updateItem(id, data)` | แก้ไข item; เรียก PATCH `/api/items/[id]` |
| `deleteItem(id)` | ลบ item; เรียก DELETE `/api/items/[id]` |

---

## 4. lib/db/exchanges.ts (Client เรียกผ่าน API wrapper ใน lib/db/items คือ lib/db เรียก api-client)

หมายเหตุ: ฝั่ง client ใช้ฟังก์ชันใน lib/db ที่เรียก API; ฝั่ง API route ใช้ Firebase Admin โดยตรง

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `createExchange(itemId, message)` | สร้างคำขอแลกเปลี่ยน (ใช้ใน API route ฝั่ง server) |
| `getExchangesByUser(userId, options?)` | List การแลกเปลี่ยนของ user (server) |
| `getExchangeById(id)` | ดึง exchange ตาม id (server) |
| `updateExchange(id, data)` | อัปเดตฟิลด์ exchange (server) |
| `respondToExchange(exchangeId, action)` | เจ้าของตอบรับ/ปฏิเสธ (server) |
| `confirmExchange(exchangeId, role)` | ยืนยันส่งมอบ/รับของ (server) |
| `cancelExchange(exchangeId, cancelReason?, cancelledBy?)` | ยกเลิกการแลกเปลี่ยน (server) |
| `hideExchange(exchangeId)` | ซ่อนจากรายการของ user (server) |
| `deleteExchange(exchangeId)` | ลบ exchange (server) |

(Client เรียก GET/POST/PATCH ผ่าน authFetchJson ไปที่ /api/exchanges/* โดยตรง หรือผ่าน wrapper ใน components)

---

## 5. lib/db/notifications.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `createNotification(notificationData)` | สร้างแจ้งเตือนใน Firestore (server) |
| `getNotifications(userId, options?)` | List แจ้งเตือน (pagination, types, unreadOnly) (server) |
| `markNotificationAsRead(notificationId)` | มาร์กว่าอ่านแล้ว (server) |
| `markAllNotificationsAsRead(userId)` | อ่านทั้งหมด (server) |
| `deleteNotification(notificationId)` | ลบการแจ้งเตือน (server) |
| `deleteUserNotificationsByAdmin(userId)` | ลบแจ้งเตือนของ user (admin, server) |

Client เรียกผ่าน GET/PATCH/POST/DELETE `/api/notifications/*`

---

## 6. lib/db/favorites.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `checkIsFavorite(userId, itemId)` | ตรวจว่า item ถูกโปรดหรือไม่ (server) |
| `toggleFavorite(userId, itemId, itemTitle?, itemImage?)` | สลับสถานะโปรด (server) |
| `getFavoriteItems(userId)` | List สิ่งของที่โปรด (server) |

Client เรียก GET/POST/DELETE `/api/favorites/*`

---

## 7. lib/db/users.ts และไฟล์ย่อย

### users-profile.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `updateUserProfile(userId, data)` | แก้ไข displayName, photoURL, bio (server) |
| `acceptTerms(userId)` | มาร์คยอมรับข้อกำหนด (server) |
| `getUserProfile(userId)` | ดึงโปรไฟล์ (server) |
| `getUserPublicProfile(userId)` | ดึงโปรไฟล์สาธารณะ (server) |

### users-status.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `updateUserStatus(userId, status, options?)` | เปลี่ยนสถานะ user (ACTIVE/SUSPENDED/BANNED ฯลฯ) (server) |
| `issueWarning(userId, reason)` | ออกคำเตือน (server) |
| `deleteUserAndData(userId)` | ลบ user และข้อมูลที่เชื่อม (server) |

### users-warnings.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `getUserWarnings(userId)` | List คำเตือนของ user (server) |
| `getAllWarnings()` | List คำเตือนทั้งหมด (server) |
| `deleteUserWarningByAdmin(warningId)` | ลบคำเตือน (admin, server) |

### users-line.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `getUserLineSettings(userId)` | ดึงการตั้งค่า LINE (server) |
| `updateUserLineSettings(userId, settings)` | อัปเดตการตั้งค่าแจ้งเตือน LINE (server) |
| `linkLineAccount(userId, linkCode)` | เชื่อมบัญชี LINE ด้วยรหัส (server) |
| `unlinkLineAccount(userId)` | ยกเลิกการเชื่อม LINE (server) |

### users-auto-unsuspend.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `checkAndAutoUnsuspend(userId, existingUserData?)` | ตรวจและปลด suspend อัตโนมัติเมื่อครบกำหนด (server) |

Client เรียก GET/PATCH/POST/DELETE `/api/users/me`, `/api/users/[id]`, `/api/line/link`

---

## 8. lib/db/reviews.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `createReview(data)` | สร้างรีวิว และอัปเดต rating ของ user เป้าหมาย (server) |
| `getUserReviews(userId, limitCount)` | List รีวิวที่ user ได้รับ (server) |
| `checkExchangeReviewed(exchangeId, reviewerId)` | ตรวจว่าเคยรีวิวการแลกเปลี่ยนนี้แล้วหรือยัง (server) |

Client เรียก GET/POST `/api/reviews`

---

## 9. lib/db/reports.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `createReport(data)` | สร้างรายงาน (server) |
| `updateReportStatus(reportId, status, options?)` | อัปเดตสถานะรายงาน (server) |
| `getReportsByStatus(status?)` | List รายงานตามสถานะ (server) |
| `getReportStatistics()` | สถิติรายงาน (server) |
| `getReports(maxResults)` | List รายงาน (server) |

Client เรียก POST `/api/reports`; Admin เรียก GET/PATCH `/api/admin/reports/*`

---

## 10. lib/db/support.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `createSupportTicket(userId, data)` | สร้าง ticket (server) |
| `getSupportTickets(options?)` | List ticket (admin, server) |
| `getUserSupportTickets(userId)` | List ticket ของ user (server) |
| `userHasSupportTickets(userId)` | ตรวจว่ามี ticket หรือไม่ (server) |
| `updateTicketStatus(ticketId, status)` | เปลี่ยนสถานะ ticket (server) |
| `replyToTicket(ticketId, content, adminUid)` | แอดมินตอบกลับ (server) |
| `userReplyToTicket(ticketId, userId, content)` | ผู้ใช้ตอบกลับ (server) |

Client เรียก GET/POST `/api/support`, POST `/api/support/[ticketId]/messages`

---

## 11. lib/db/logs.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `createAdminLog(data)` | บันทึก admin log (server) |
| `getAdminLogs(options?)` | List admin logs (server) |
| `getAdminLogsByTarget(targetType, targetId)` | List logs ตาม target (server) |

---

## 12. lib/db/drafts.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `saveDraft(userId, type, data)` | บันทึก draft (server) |
| `getDraft(userId, type)` | ดึง draft (server) |
| `deleteDraft(draftId)` | ลบ draft (server) |
| `cleanupOldDrafts()` | ลบ draft เก่า (server) |

---

## 13. lib/db/items-helpers.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `generateKeywords(title, description)` | สร้าง searchKeywords (array คำ) จาก title/description |
| `buildSearchConstraints(searchQuery?)` | สร้าง query constraints สำหรับ Firestore (array-contains-any ฯลฯ) |
| `refineItemsBySearchTerms(items, searchTerms)` | กรอง items ให้ตรงทุก term (AND) ใน memory |

---

## 14. lib/db/collections.ts (Server only)

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `itemsCollection()` | Collection "items" พร้อม converter |
| `usersCollection()` | Collection "users" |
| `exchangesCollection()` | Collection "exchanges" |
| `chatMessagesCollection(exchangeId)` | Subcollection "chatMessages" ภายใต้ exchange |
| `reportsCollection()` | Collection "reports" |
| `announcementsCollection()` | Collection "announcements" |
| `notificationsCollection()` | Collection "notifications" |
| `userWarningsCollection()` | Collection "userWarnings" |
| `draftsCollection()` | Collection "drafts" |
| `supportTicketsCollection()` | Collection "support_tickets" |
| `supportMessagesCollection(ticketId)` | Subcollection "messages" ภายใต้ support_tickets |
| `adminLogsCollection()` | Collection "adminLogs" |
| `casesCollection()` | Collection "cases" |
| `adminsCollection()` | Collection "admins" (raw) |

---

## 15. lib/db/converters.ts

แปลง Firestore document เป็น TypeScript type (itemConverter, userConverter, exchangeConverter, chatMessageConverter, reportConverter, announcementConverter, appNotificationConverter, userWarningConverter, draftConverter, supportTicketConverter, supportMessageConverter, adminLogConverter, caseConverter)

---

## 16. lib/services/client-firestore.ts (Client-side Firestore)

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `checkIsAdmin(userEmail)` | ตรวจว่า email เป็น admin หรือไม่ (อ่านจาก admins collection) |
| `getDocById(collection, id)` | ดึง document ตาม id (ใช้ใน admin/reports เพื่อดึง target item/exchange/user) |
| `subscribeToExchange(exchangeId, onUpdate)` | Real-time ฟังการเปลี่ยนแปลง exchange (onSnapshot) |
| `subscribeToChatMessages(exchangeId, onUpdate)` | Real-time ฟังข้อความแชท (onSnapshot) |
| `setChatTyping(exchangeId, userId, isTyping)` | ตั้งค่า typing indicator |
| `subscribeToChatTyping(exchangeId, onUpdate)` | ฟัง typing indicator แบบ real-time |

---

## 17. lib/services/client-line-service.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `notifyUserStatusChange(userId, status)` | แจ้งผู้ใช้เมื่อสถานะบัญชีเปลี่ยน (เรียก API line) |
| `notifyUserWarning(userId, message)` | แจ้งคำเตือน (เรียก API line) |

---

## 18. lib/services/report-service.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `submitReport(params)` | ส่งรายงาน (สร้าง report doc, แจ้งแอดมิน, resolve target ถ้าต้องการ) ใช้ใน POST `/api/reports` |

---

## 19. lib/services/reports/create-report.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `createReport(params)` | สร้างรายงานใน Firestore และดำเนินการต่อ (แจ้งแอดมิน ฯลฯ) |

---

## 20. lib/services/reports/target-resolver.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `resolveReportTarget(reportType, targetId)` | ดึงข้อมูล target (item/exchange/user) สำหรับรายงาน |

---

## 21. lib/services/items/item-update.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `updateItemWithValidation(itemId, data, deps)` | อัปเดต item พร้อม validation และ side effects (ใช้ใน API PATCH) |

---

## 22. lib/services/items/item-deletion.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `deleteItemAsOwner(itemId, userId, deps)` | ลบ item (เจ้าของ); จัดการ favorites, exchanges ที่เกี่ยวข้อง |

---

## 23. lib/services/admin/user-cleanup.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `collectUserResources(userId)` | รวบรวม resources ที่เชื่อมกับ user (items, exchanges ฯลฯ) |
| `recalculateUserRating(targetUserId)` | คำนวณ rating ใหม่หลังลบรีวิว |
| `executeCleanup(userId, options)` | ลบข้อมูล user ตามที่กำหนด |
| `deleteUserAuth(userId)` | ลบบัญชี Firebase Auth |
| `deleteOrphanUserDocs()` | ลบ user docs ที่ไม่มีใน Auth (orphans) |

---

## 24. lib/services/admin/user-actions.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `updateUserStatusWithDeps(userId, status, deps)` | เปลี่ยนสถานะ user พร้อม dependencies (แจ้งเตือน ฯลฯ) |
| `issueWarningWithDeps(userId, reason, deps)` | ออกคำเตือนพร้อม dependencies |
| `updateUserStatus(userId, status)` | เปลี่ยนสถานะ user (wrapper) |
| `issueWarning(userId, reason)` | ออกคำเตือน (wrapper) |

---

## 25. lib/exchange-state-machine.ts

| ฟังก์ชัน / ค่า | รายละเอียด |
|----------------|-------------|
| `normalizeExchangePhaseStatus(status)` | แมป "accepted" → "in_progress" (legacy) |
| `VALID_TRANSITIONS` | สถานะที่เปลี่ยนได้จากแต่ละสถานะ (pending → in_progress/rejected/cancelled ฯลฯ) |
| `STATUS_LABELS`, `STATUS_DESCRIPTIONS` | ข้อความสองภาษา (TH/EN) สำหรับแต่ละสถานะ |
| `getConfirmButtonLabel(status, role)` | ข้อความปุ่มยืนยันส่งมอบ/รับของ |
| `getWaitingOtherConfirmationMessage(role)` | ข้อความรออีกฝ่ายยืนยัน |
| `isValidTransition(current, new)` | ตรวจว่าเปลี่ยนสถานะได้หรือไม่ |
| `isTerminalStatus(status)` | ตรวจว่าสถานะสุดท้ายหรือไม่ |
| `getNextStatuses(current)` | สถานะที่เป็นไปได้ถัดไป |
| `validateTransition(current, new)` | ตรวจ transition; คืน error string หรือ null |

---

## 26. lib/storage.ts (อัปโหลดรูป)

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `uploadToCloudinary(file, preset, token?)` | บีบอัดรูป (ถ้าควร); เรียก GET `/api/upload/sign` ได้ signature แล้ว POST ไฟล์ไป Cloudinary; คืน public_id |

---

## 27. lib/cloudinary-url.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `getCloudinaryUrl(publicId, options?)` | สร้าง URL รูปจาก public_id (f_auto, q_auto; รองรับ width/height/crop) |
| `resolveImageUrl(publicId, options?)` | Helper สำหรับแสดงรูป (ใช้ใน component) |

---

## 28. lib/api-validation.ts

| ฟังก์ชัน | รายละเอียด |
|----------|-------------|
| `withValidation(schema, handler, options?)` | ห่อ API handler; ตรวจ body/query กับ Zod schema; ตรวจ requireAuth, requireTermsAccepted; เรียก handler ด้วย data ที่ parse แล้วและ ValidationContext (userId, email) |

---

## 29. lib/line.ts (LINE Integration, Server)

ฟังก์ชันหลัก: ส่งข้อความ LINE, สร้าง Rich Menu, แจ้งแอดมิน, แจ้งการแลกเปลี่ยน/แชท, ส่งลิงก์เชื่อมบัญชี ฯลฯ (ใช้ใน API routes และ services)

---

## 30. lib/rate-limiter.ts / lib/upstash-rate-limiter.ts

ใช้สำหรับ Rate limiting ใน API (Upstash Redis); จำกัดจำนวน request ต่อช่วงเวลา

---

## 31. Hooks ที่เกี่ยวข้อง (hooks/)

| Hook | ไฟล์ | รายละเอียด |
|------|------|-------------|
| `useItems(options)` | use-items.ts | เรียก getItems จาก lib/firestore; ใช้ TanStack Query (queryKey ตาม filters + หน้า); คืน items, pagination, goToPage, refetch |
| `useAuth()` | (auth-provider) | คืน user, loading, isAdmin จาก AuthContext |
| `useI18n()` | (language-provider) | คืน tt(th, en), locale |
| `useAdminDashboardData()` | use-admin-dashboard | โหลด stats, items, reports, support, users สำหรับแดชบอร์ดแอดมิน |
| `useImageUpload(options)` | use-image-upload | จัดการอัปโหลดรูปหลายไฟล์ (maxImages, folder); เรียก uploadToCloudinary; คืน images, isUploading, handleFileChange, removeImage, clearImages, canAddMore |
| `useToast()` | use-toast | แสดง toast (Shadcn/sonner) |
| `useRefreshOnFocus()` | use-refresh-on-focus | refetch เมื่อ window ได้รับ focus (ถ้ามีใช้) |
| `useMobile()` | use-mobile | ตรวจว่าเป็น mobile หรือไม่ (responsive) |

---

สรุป: เอกสารนี้ครอบคลุม **ฟังก์ชันหลักที่ export จาก lib/db, lib/services, lib/api-client, lib/storage, lib/cloudinary-url, lib/exchange-state-machine, lib/api-validation** และ hooks ที่ใช้เรียกข้อมูล/API สำหรับใช้ตอบคำถามตอนพรีเซนต์ได้ครบทุกส่วนที่เกี่ยวกับ "ฟังก์ชันที่โค้ดใช้ทำงาน"
