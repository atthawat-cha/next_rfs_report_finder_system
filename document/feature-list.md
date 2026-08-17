# Feature List — RFS Report Finder System

> รวมฟีเจอร์ทั้งหมดของระบบ จัดกลุ่มตามโมดูล/บทบาทผู้ใช้ พร้อม priority (MoSCoW) และสถานะปัจจุบัน (✅ ทำงานได้จริง · ⚠️ มี UI/schema แต่ไม่สมบูรณ์/mock · ❌ ยังไม่มี) อ้างอิงจาก gap analysis ใน `document/new_requirement.md §3-4` แปลงเป็น checklist ที่ execute ได้ พร้อม mapping ไปยัง phase ใน [project-specification.md §6](./project-specification.md#6-development-methodology)
>
> ⚠️ **คอลัมน์ "สถานะ" ในไฟล์นี้ค้างอยู่** — แถวของ Phase 1/2/3a-3c ยังขึ้น ❌ ทั้งที่ ship ไปแล้ว ถ้าอยากรู้ว่า**ตอนนี้ถึงไหนแล้ว** ให้ดู [**00-progress.md**](./00-progress.md) แทน (อ้างอิง commit จริง) ไฟล์นี้ใช้ดูว่า *ระบบต้องมีฟีเจอร์อะไรบ้าง* + priority
>
> เอกสารที่เกี่ยวข้อง: [00-progress.md](./00-progress.md) · [system-design.md](01-system-design.md) · [workflow.md](./workflow.md) · [diagrams.md](./diagrams.md)

---

## 1. Authentication & Session (FR-1)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| Login ด้วย username/password ผ่าน DB (bcrypt) | Must | ✅ | — |
| Session ผ่าน JWT + httpOnly cookie (`auth-token`) | Must | ✅ | — |
| Logout เคลียร์ cookie | Must | ✅ | — |
| Middleware auth guard ที่ redirect ถูกต้องตาม pathname จริง | Must | ⚠️ (bug ใน `protectedPaths`) | 0 |
| Rate limiting การ login ผิด (ข้าม instance ได้) | Must | ⚠️ (in-memory → Redis) | 0 |
| ตั้งค่าวิธียืนยันตัวตนได้จากหน้า Settings (Local DB / External API / Email OTP) | Should | ❌ | 4 |
| Two-Factor Authentication (TOTP) | Could | ❌ (มีคอลัมน์ schema รอ logic) | 4 |
| Password policy / `password_changed_at` enforcement | Could | ❌ | 4 |

## 2. Authorization / RBAC (FR-2)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| สิทธิ์ระดับเมนู/ฟีเจอร์ (`role_permissions` → `permissions` → `menus`) | Must | ✅ | — |
| Role-based route guard (`requireRole`, `routeAcceptted`) | Must | ✅ | — |
| ปิดช่องโหว่ endpoint ที่ไม่มี auth guard (`/api/users/user`, `/update`) | Must | ❌ | 0 |
| สิทธิ์ระดับ "1 รายงาน" ต่อรายบุคคล (view/edit/delete/favorite/export/print) | Must | ❌ | 2 |
| สิทธิ์ระดับ "1 รายงาน" ต่อรายบทบาท | Must | ❌ | 2 |
| ผู้ใช้เห็นเฉพาะรายงานที่ตนมีสิทธิ์ในทุกหน้า list/search | Must | ❌ | 2 |
| Permission editor UI ต่อรายงาน (matrix ผู้ใช้/บทบาท × action) | Must | ❌ | 2 |
| Central ACL resolver (`lib/report-acl.ts`) ใช้ร่วมทุก endpoint | Must | ❌ | 2 |

## 3. Report Metadata Management — Admin (FR-3)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| สร้างรายงานใหม่พร้อม metadata (ชื่อ TH/EN, code, category, department, description, access level) | Must | ✅ | — |
| แก้ไขรายงานที่มีอยู่ | Must | ❌ (ไม่มีหน้า edit) | 2 |
| ลบรายงาน | Must | ⚠️ (ตรวจสอบ endpoint `[id]` route ให้ครบ) | 2 |
| กำหนดประเภทผลลัพธ์รายงาน (`output_type`): ใบพิมพ์ (`PRINT_FORM`) หรือ รายงานข้อมูล (`DATA_REPORT`) — กำหนดชุดไฟล์แนบที่ต้องอัปโหลด | Must | ❌ (คอลัมน์ใหม่) | 2 |
| อัปโหลดฟอร์มเปล่า (pdf) — สำหรับรายงานประเภทใบพิมพ์ | Must | ❌ | 2 |
| อัปโหลดฟอร์มตัวอย่างที่กรอกข้อมูลแล้ว (pdf) — สำหรับรายงานประเภทใบพิมพ์ | Must | ❌ | 2 |
| อัปโหลดไฟล์ตัวอย่างข้อมูล (excel) — สำหรับรายงานประเภทรายงานข้อมูล ใช้ทั้ง preview เป็นตารางและดาวน์โหลดตรง ๆ | Must | ❌ | 2 |
| **ไม่มี** การอัปโหลด/parse/render ไฟล์ `.jasper` หรือ source format ใด ๆ — ทุกไฟล์เป็นผลลัพธ์สำเร็จรูป | — | ✅ ตามออกแบบ (ตัดออกจาก scope แล้ว) | — |
| เพิ่ม/แก้/ลบ ตัวแปรของรายงาน (`report_variables`, ข้อมูลอ้างอิง) | Should | ❌ | 2 |
| เพิ่ม/แก้/ลบ คิวรี่ของรายงาน (`report_queries`, หลายชุด, ข้อมูลอ้างอิงเท่านั้น — แอปไม่ execute) | Should | ❌ | 2 |
| กำหนดคิวรี่หลัก (`is_main`) ได้ 1 รายการต่อรายงานเท่านั้น (บังคับด้วย DB constraint) | Must | ❌ | 2 |
| อัปโหลดไฟล์ผ่าน validation (MIME ตรงกับ `file_kind`/ขนาด/สแกนไวรัส) | Must | ⚠️ (ยังไม่มี AV scan) | 2/4 |
| แปลงรูปภาพเป็น WebP อัตโนมัติ (thumbnail) | Must | ✅ (`lib/imageConvert.ts`) | — |

## 4. Versioning (FR-4)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| เก็บ version ของไฟล์รายงานทุกครั้งที่แก้ (ไม่ overwrite) | Must | ⚠️ (มี schema `report_versions`, ไม่มี UI) | 3 |
| เก็บ version ของคิวรี่ทุกครั้งที่แก้ | Must | ❌ (ไม่มีตาราง) | 2/3 |
| หน้า UI ดูประวัติเวอร์ชัน (ไฟล์+คิวรี่) | Should | ❌ | 3 |
| Rollback ไปเวอร์ชันก่อนหน้า | Should | ❌ | 3 |
| เปรียบเทียบ diff ระหว่างเวอร์ชันคิวรี่ (SQL text diff) | Could | ❌ | 3+ |

## 5. Report Discovery & Search — User (FR-5)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| ค้นหาด้วยชื่อ/รหัส/คำอธิบาย/แท็ก (ไทย+อังกฤษ) | Must | ❌ (input เปล่า, handler ว่าง) | 1 |
| กรองผลลัพธ์ตาม category/department/tag/status | Must | ❌ | 1 |
| Pagination บนผลการค้นหา | Must | ❌ | 1 |
| Endpoint ค้นหาแบบ ACL-filtered สำหรับ non-admin | Must | ❌ | 1/2 |
| Preview ฟอร์ม (PDF) inline ในระบบ ก่อนดาวน์โหลด — รายงานประเภทใบพิมพ์ | Should | ❌ (แค่ browser-native `<iframe>`/`<embed>`, ไม่ต้องมี backend เพิ่ม) | 1 |
| Preview ตัวอย่างข้อมูลเป็นตาราง — รายงานประเภทรายงานข้อมูล (parse excel ด้วย `exceljs`) | Should | ❌ | 1/2 |
| ค้นหาแบบ fuzzy/typo-tolerant | Could | ❌ | 1+ (ประเมินความจำเป็นก่อน) |
| Card view / Table view toggle สำหรับผลการค้นหา | Should | ⚠️ (มี `reportCards.tsx` แล้วแต่ยังไม่ผูก search จริง) | 1 |

## 6. Favorites (FR-6)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| เพิ่มรายการโปรด | Must | ⚠️ (UI มี, endpoint ไม่มี) | 1 |
| ลบรายการโปรด | Must | ⚠️ | 1 |
| หน้า Favorites ดึงข้อมูลจริง (แทน `fakedata/fakeReportList.ts`) | Must | ❌ | 1 |
| ตรวจสิทธิ์ `can_favorite` ก่อนเพิ่มโปรด | Must | ❌ (รอ per-report ACL) | 2 |

## 7. Download / Export / Print (FR-7)

> ไม่มี rendering engine เกี่ยวข้องในโมดูลนี้เลย — ทุกไฟล์ที่ดาวน์โหลด/พิมพ์คือไฟล์ที่ admin อัปโหลดไว้ ระบบแค่ตรวจสิทธิ์แล้ว stream/แสดงไฟล์นั้นตรง ๆ (ดู `system-design.md §3.8`)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| ดาวน์โหลดฟอร์มเปล่า (pdf) — ตรวจสิทธิ์ + `is_downloadable` | Must | ❌ | 1 |
| ดาวน์โหลดฟอร์มตัวอย่างที่กรอกข้อมูลแล้ว (pdf) | Must | ❌ | 1 |
| ดาวน์โหลดไฟล์ Excel ตัวอย่างข้อมูล (สำหรับรายงานประเภทข้อมูล) | Must | ❌ | 1 |
| บันทึกทุกการดาวน์โหลดลงตาราง `downloads` | Must | ❌ (ตารางมี, ยังไม่มีจุดเขียน) | 1 |
| สั่งพิมพ์ฟอร์ม ผ่าน browser PDF viewer ในตัว (ไม่ต้องมี backend เพิ่ม) | Must | ❌ | 1 |
| สั่งพิมพ์ตารางข้อมูลตัวอย่างที่ preview อยู่ (client-side `window.print()` + `@media print`) | Should | ❌ | 1/2 |
| นับ `download_count`/`view_count` แบบ atomic increment | Should | ❌ (คอลัมน์มี, ไม่มีจุด update) | 1 |

## 8. Report Sharing (FR-8)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| แชร์รายงานให้ user รายบุคคล | Should | ❌ (schema มีเฉย ๆ) | 3 |
| แชร์รายงานให้ทั้งแผนก | Should | ❌ | 3 |
| สร้างลิงก์แชร์ (share token) พร้อมวันหมดอายุ | Should | ❌ | 3 |
| กำหนดสิทธิ์ download/edit บนการแชร์แต่ละครั้ง | Should | ❌ | 3 |
| Cleanup job ลบ/ปิดใช้งานลิงก์ที่หมดอายุอัตโนมัติ | Should | ❌ | 3 |

## 9. Notifications (FR-9)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| แจ้งเตือนรายงานใหม่ที่เกี่ยวข้อง | Should | ❌ (enum ครบใน schema) | 3 |
| แจ้งเตือนเมื่อถูกแชร์รายงาน | Should | ❌ | 3 |
| แจ้งเตือนเมื่อรายงานที่ติดตามถูกแก้ไข | Should | ❌ | 3 |
| แจ้งเตือนรายงาน/ลิงก์ใกล้หมดอายุ | Should | ❌ | 3 |
| แจ้งเตือนระบบ (พื้นที่จัดเก็บใกล้เต็ม, ปิดปรับปรุง) | Could | ❌ | 3/4 |
| กระดิ่งแจ้งเตือนใน UI (unread count, mark-as-read) | Should | ❌ | 3 |
| ส่งอีเมลสำหรับ notification severity สูง | Could | ❌ | 3/4 |

## 10. Activity Log / Audit Trail (FR-10)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| Helper กลาง `logActivity()` เรียกจากทุก mutation | Must | ✅ | 0 |
| บันทึก log สำหรับ login/login_failed/logout | Must | ✅ | 0 |
| บันทึก log สำหรับ CRUD รายงาน/ผู้ใช้/แผนก/บทบาท | Must | ✅ | 0 |
| หน้า audit log filter ตาม user/entity/วันที่ | Should | ✅ (`GET /api/activity-logs` + `user-management/activity` page, filter user/entity/date range) | 0/3 |
| Alert เมื่อพบ pattern ผิดปกติ (401/403/429 ถี่ผิดปกติ) | Could | ❌ | 4 |

## 11. Dashboard & Usage Analytics (FR-11)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| สรุปจำนวนรายงานทั้งหมด แยกตามสถานะ/หมวดหมู่/แผนก | Must | ✅ (`GET /api/dashboard/summary`) | 3 |
| รายงานที่ถูกดาวน์โหลด/เข้าชมมากสุด (top N) | Must | ✅ (`GET /api/dashboard/top-reports` — จัดอันดับด้วย `download_count`, ไม่ใช่ `view_count` ที่ยังไม่ถูก increment ที่ไหนเลย ดู `phase3-plan.md` 3d audit) | 3 |
| พื้นที่จัดเก็บที่ใช้ไป | Should | ✅ (sum `report_files.file_size` ทุกแถวรวม version เก่า) | 3 |
| กราฟแนวโน้มการใช้งานรายวัน/รายเดือน | Should | ⚠️ (รายวันเท่านั้น, `GET /api/dashboard/trends`, ยังไม่มี toggle รายเดือน) | 3 |
| Cache/precompute สถิติหนัก (ไม่คำนวณสดทุกครั้ง) | Should | ❌ | 3/4 |

## 12. User & Department Management (FR-12)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| CRUD ผู้ใช้ (list, form, table) | Must | ✅ | — |
| CRUD แผนก (รองรับโครงสร้างลำดับชั้น parent/child) | Must | ✅ | — |
| CRUD บทบาท + จัดการ permission ต่อบทบาท | Must | ✅ | — |
| Activity ของผู้ใช้แต่ละคน (ประวัติการกระทำ) | Should | ⚠️ | 0/3 |

## 13. System Settings (FR-13)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| หน้า Settings อ่าน/เขียนตาราง `settings` จริง | Should | ❌ | 3/4 |
| ตั้งค่าวิธี login (provider selection) | Should | ❌ | 4 |
| ตั้งค่า storage backend (local/MinIO/S3) | Should | ❌ | 4 |
| Persist ธีม (dark/light) ต่อผู้ใช้ฝั่ง server | Should | ⚠️ (มีฝั่ง client ผ่าน `next-themes` เท่านั้น) | 3 |
| จำกัดขนาดไฟล์อัปโหลดสูงสุดต่อ `file_kind` แบบตั้งค่าได้ | Could | ❌ | 4 |

## 14. Support Ticket (FR-14 — Optional, ต้องตัดสินใจ scope)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| ผู้ใช้แจ้งปัญหา/ขอรายงานใหม่ผ่านระบบ ticket | Could | ❌ (schema มีเฉย ๆ) | ตัดสินใจก่อน Phase 4 |
| Admin จัดการ ticket (assign, resolve, close) | Could | ❌ | ตัดสินใจก่อน Phase 4 |
| **หมายเหตุ**: ถ้าตัดสินใจไม่ทำต่อ ต้องลบตาราง `support_tickets` ออกจาก schema แทนการทิ้งไว้เฉย ๆ | — | — | — |

## 15. UI / UX Cross-Cutting Features

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| Dark/Light theme switch | Must | ✅ (`next-themes`) | — |
| Sidebar/Navbar responsive layout | Must | ✅ | — |
| Data table มาตรฐาน (`SharedDataTable`) พร้อม sort/pagination | Must | ✅ (client-side), ⚠️ (server-side pagination รอ Phase 0-1) | 0/1 |
| i18n ไทย/อังกฤษเป็นระบบ (`next-intl`) | Should | ❌ (ปนกันแบบ hardcode) | 2+ |
| Loading/skeleton state มาตรฐานทุกหน้า list | Should | ⚠️ (ไม่สม่ำเสมอ) | 1+ |
| Toast notification สำหรับผลลัพธ์ action (`react-hot-toast`) | Must | ✅ | — |

## 16. Security & Compliance Features

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| Password hashing (bcrypt) | Must | ✅ | — |
| httpOnly, Secure, SameSite cookie | Must | ✅/⚠️ (ตรวจ `Secure` flag ใน production) | 0 |
| Input validation ด้วย `zod` ทุก endpoint | Must | ✅ (ส่วนใหญ่), ⚠️ (ตรวจให้ครบทุก endpoint ใหม่) | ต่อเนื่อง |
| Security headers (CSP, HSTS, X-Content-Type-Options) | Must | ❌ | 4 |
| Antivirus scan ไฟล์อัปโหลด (ClamAV) | Should | ❌ | 4 |
| Dependency vulnerability scanning (CI) | Should | ❌ | 4 |
| Structured logging + error tracking (pino/Sentry) | Should | ❌ | 4 |
| Automated test suite (unit/integration/E2E) | Must | ❌ | 0-4 (เริ่มจาก `lib/report-acl.ts` ก่อน) |

---

## Summary Counts (ภาพรวมความคืบหน้า)

| สถานะ | จำนวน feature โดยประมาณ |
|---|---|
| ✅ ทำงานได้จริง | ~18 |
| ⚠️ มีบางส่วน/mock/schema เฉย ๆ | ~20 |
| ❌ ยังไม่มีเลย | ~55 |

> ตัวเลขเป็นการนับจากตารางด้านบนเพื่อภาพรวม ไม่ใช่ story-point estimation — ใช้สำหรับสื่อสารสัดส่วนงานที่เหลือ ไม่ใช่ใช้วางแผน timeline โดยตรง (การวางแผน timeline ต้องรอคำตอบคำถามเปิดใน `project-specification.md §8` ก่อน)
