# Checklist: ลูกเล่นเสริมความสวยงาม (UI Trends)

ตรวจตามหลัก 3 ข้อ — Micro-interactions, Glassmorphism, Dark Mode

---

## 1. Micro-interactions (ลูกเล่นเล็กๆ ให้เว็บ "มีชีวิต" โต้ตอบผู้ใช้)

### สถานะปัจจุบัน ✅

| จุด | สถานะ | รายละเอียด |
|-----|--------|------------|
| ปุ่มกด (tap/click) | ✅ | ปุ่มมี `active:scale-[0.98]` และ `transition-transform` ให้รู้สึกกดได้ |
| ปุ่ม hover | ✅ | ปุ่มมี hover สี (hover:bg-primary/90 ฯลฯ); ปุ่ม Theme มี icon หมุน (dark:rotate) |
| การ์ด hover | ✅ | การ์ด Features หน้า Landing มี hover:-translate-y-1, hover:shadow-soft-lg, hover:border-primary/20 |
| รูปการ์ด hover | ✅ | รูปใน ItemCard มี group-hover:scale-105 |
| โหลดข้อมูล | ✅ | ใช้ Skeleton (dashboard/loading.tsx) และ Loader2 หมุนใน loading.tsx; ปุ่ม "โหลดเพิ่ม" มี Loader2 ตอน loading |
| โฟกัส (accessibility) | ✅ | ปุ่มมี focus-visible:ring สำหรับคีย์บอร์ด |

### การเพิ่มที่ทำแล้ว

- **Button (components/ui/button.tsx)**: เพิ่ม `transition-transform duration-200 ease-out` และ `active:scale-[0.98]` ให้ทุกปุ่มมี feedback ตอนกด
- **แถบโหลดด้านบน (TopLoadingBar)**: แสดงแถบสั้นๆ สี primary ที่ด้านบนเมื่อเปลี่ยน route (คลิกเมนู) ให้รู้สึกว่า "กำลังโหลด"

---

## 2. Glassmorphism (เอฟเฟกต์กระจกฝ้า โปร่งใส มีมิติ)

### สถานะปัจจุบัน ✅

| จุด | สถานะ | รายละเอียด |
|-----|--------|------------|
| Navbar | ✅ | ใช้ class `glass` = `bg-background/80 backdrop-blur-md` |
| Landing header | ✅ | `backdrop-blur-md bg-background/90` |
| การ์ด Features (Landing) | ✅ | `bg-background/90 backdrop-blur rounded-2xl` |
| Stats (Landing) | ✅ | `bg-background/60 backdrop-blur` |
| Dialog / Modal | ✅ | overlay `bg-black/50 backdrop-blur-sm`; ปุ่มปิด `bg-background/80 backdrop-blur-sm` |
| Dropdown (Theme) | ✅ | `bg-background/95 backdrop-blur-md` |
| Favorite button, Notification | ✅ | `bg-background/80 backdrop-blur` ฯลฯ |

### คลาสใน globals.css

- **`.glass`**: `bg-background/80 backdrop-blur-md` — ใช้กับ navbar
- **`.glass-card`** (เพิ่มใหม่): `bg-background/70 backdrop-blur-lg border border-border/60` — ใช้กับการ์ดที่ต้องการเอฟเฟกต์กระจกฝ้าเข้มขึ้น

---

## 3. Dark Mode (โหมดมืด ลดอาการล้าสายตา ดูพรีเมียม)

### สถานะปัจจุบัน ✅

| จุด | สถานะ | รายละเอียด |
|-----|--------|------------|
| ตัวเลือกสลับโหมด | ✅ | มี ModeToggle (Light / Dark / System) ใน Navbar และหน้า Landing |
| ThemeProvider | ✅ | ใช้ next-themes ใน layout เก็บค่าตาม system/light/dark |
| สีโหมดมืด (CSS) | ✅ | ใช้ `@custom-variant dark` และ `.dark { ... }` ใน globals.css กำหนดสีพื้นหลัง/ข้อความ/primary ฯลฯ |
| คอมโพเนนต์รองรับ dark | ✅ | ปุ่ม, การ์ด, Badge, Alert, หน้า terms/privacy/guidelines ใช้ `dark:bg-*`, `dark:text-*`, `dark:border-*` |
| Shadow โหมดมืด | ✅ | `.dark .shadow-soft`, `.dark .shadow-soft-lg` ปรับให้ไม่ดำเกินไป |

### การใช้งาน

- ผู้ใช้สลับโหมดได้จากไอคอน Sun/Moon ที่ Navbar หรือหน้าแรก
- เลือกได้ 3 แบบ: **Light**, **Dark**, **System** (ตามการตั้งค่าอุปกรณ์)

---

## สรุป

- **Micro-interactions**: มีการกดปุ่ม (scale), hover การ์ด/รูป, Skeleton/Loader ตอนโหลด, และแถบโหลดด้านบนเมื่อเปลี่ยนหน้า
- **Glassmorphism**: ใช้ backdrop-blur และพื้นหลังโปร่งใสใน navbar, header, การ์ด, dialog และมี utility `.glass` / `.glass-card`
- **Dark Mode**: มีตัวสลับโหมดและสีครบทั้งระบบ

ไฟล์นี้ใช้เป็นแนวทางตรวจและปรับ UI ต่อได้
