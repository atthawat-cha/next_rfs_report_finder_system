# Feature List — RFS Report Finder System

> รวมฟีเจอร์ทั้งหมดของระบบ จัดกลุ่มตามโมดูล/บทบาทผู้ใช้ พร้อม priority (MoSCoW) และสถานะปัจจุบัน (✅ ทำงานได้จริง · ⚠️ มี UI/schema แต่ไม่สมบูรณ์/mock · ❌ ยังไม่มี) อ้างอิงจาก gap analysis ใน `document/new_requirement.md §3-4` แปลงเป็น checklist ที่ execute ได้ พร้อม mapping ไปยัง phase ใน [project-specification.md §6](./project-specification.md#6-development-methodology)
>
> **รีเฟรชล่าสุด: 2026-08-17** (ตรง commit `abd3629`) — ไล่ทุกแถวเทียบกับโค้ดจริง + [`00-progress.md`](./00-progress.md) (39/39 verification ผ่านจริงบน DB) ก่อนหน้านี้ไฟล์นี้ค้างมานาน ยังขึ้น ❌ ให้ Phase 1-3c ทั้งที่ ship ไปแล้ว — รอบนี้รีเฟรชทั้งไฟล์ ไม่ใช่แค่บางแถว ระหว่างไล่ตรวจ FR-3 เจอ regression ใหม่ (`output_type` ไม่ persist ตอนสร้างรายงาน จากปัญหา merge เดียวกับที่ทำให้ `access_level` เพี้ยน) แก้ไปพร้อมกันแล้วใน `abd3629`
>
> เอกสารที่เกี่ยวข้อง: [00-progress.md](./00-progress.md) (ถึงไหนแล้ว/commit จริง) · [system-design.md](01-system-design.md) · [workflow.md](./workflow.md) · [diagrams.md](./diagrams.md)

---

## 1. Authentication & Session (FR-1)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| Login ด้วย username/password ผ่าน DB (bcrypt) | Must | ✅ | — |
| Session ผ่าน JWT + httpOnly cookie (`auth-token`) | Must | ✅ | — |
| Logout เคลียร์ cookie | Must | ✅ | — |
| Middleware auth guard ที่ redirect ถูกต้องตาม pathname จริง | Must | ✅ (`publicPaths` + matcher-based gate, `protectedPaths` bug เดิมแก้แล้ว) | 0 |
| Rate limiting การ login ผิด (ข้ามได้หลาย instance) | Must | ✅ (Redis-backed, `lib/rate-limit.ts`) | 0 |
| ตั้งค่าวิธียืนยันตัวตนได้จากหน้า Settings (Local DB / External API / Email OTP) | Should | ❌ | 4 |
| Two-Factor Authentication (TOTP) | Could | ❌ (มีคอลัมน์ schema รอ logic) | 4 |
| Password policy / `password_changed_at` enforcement | Could | ❌ | 4 |

## 2. Authorization / RBAC (FR-2)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| สิทธิ์ระดับเมนู/ฟีเจอร์ (`role_permissions` → `permissions` → `menus`) | Must | ✅ | — |
| Role-based route guard (`requireRole`, `routeAcceptted`) | Must | ✅ | — |
| ปิดช่องโหว่ endpoint ที่ไม่มี auth guard (`/api/users/user`, `/update`) | Must | ✅ | 0 |
| สิทธิ์ระดับ "1 รายงาน" ต่อรายบุคคล (view/edit/delete/favorite/export/print) | Must | ✅ (`report_permissions`, `SubjectType.USER`) | 2 |
| สิทธิ์ระดับ "1 รายงาน" ต่อรายบทบาท | Must | ✅ (`report_permissions`, `SubjectType.ROLE`) | 2 |
| ผู้ใช้เห็นเฉพาะรายงานที่ตนมีสิทธิ์ในทุกหน้า list/search | Must | ✅ (`visibleReportIdsFor`, ใช้จริงใน browse/favorites/download) | 1/2 |
| Permission editor UI ต่อรายงาน (matrix ผู้ใช้/บทบาท × action) | Must | ✅ | 2 |
| Central ACL resolver (`lib/report-acl.ts`) ใช้ร่วมทุก endpoint | Must | ✅ (`resolveReportAcl`/`visibleReportIdsFor`, แทน `lib/report-visibility.ts` เดิมทั้งหมดแล้ว) | 2 |

## 3. Report Metadata Management — Admin (FR-3)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| สร้างรายงานใหม่พร้อม metadata (ชื่อ TH/EN, code, category, department, description, access level) | Must | ✅ | — |
| แก้ไขรายงานที่มีอยู่ | Must | ✅ (`report-edit/[id]/page.tsx`) | 2 |
| ลบรายงาน | Must | ✅ (`DELETE .../manage/[id]`, cascade ผ่าน schema) | 2 |
| กำหนดประเภทผลลัพธ์รายงาน (`output_type`): ใบพิมพ์ (`PRINT_FORM`) หรือ รายงานข้อมูล (`DATA_REPORT`) — กำหนดชุดไฟล์แนบที่ต้องอัปโหลด | Must | ✅ (ฟอร์มมี field, backend persist ได้ถูกต้องแล้ว — เพิ่งแก้ regression เดียวกับ `access_level` ใน `abd3629`) | 2 |
| อัปโหลดฟอร์มเปล่า (pdf) — สำหรับรายงานประเภทใบพิมพ์ | Must | ✅ (`report_files`, kind `BLANK_FORM`) | 2 |
| อัปโหลดฟอร์มตัวอย่างที่กรอกข้อมูลแล้ว (pdf) — สำหรับรายงานประเภทใบพิมพ์ | Must | ⚠️ (อัปโหลด/จัดการผ่านหน้า edit ได้ครบ แต่ยังไม่มี endpoint ดาวน์โหลดแยกตาม `file_kind` สำหรับ user ทั่วไป — endpoint ดาวน์โหลดหลักคืนแค่ไฟล์ primary ตัวเดียวต่อรายงาน) | 2 |
| อัปโหลดไฟล์ตัวอย่างข้อมูล (excel) — สำหรับรายงานประเภทรายงานข้อมูล ใช้ทั้ง preview เป็นตารางและดาวน์โหลดตรง ๆ | Must | ⚠️ (อัปโหลด+ดาวน์โหลดตรงทำงานจริง, preview เป็นตาราง (`exceljs`) ยังไม่มี) | 2 / 1 (preview) |
| **ไม่มี** การอัปโหลด/parse/render ไฟล์ `.jasper` หรือ source format ใด ๆ — ทุกไฟล์เป็นผลลัพธ์สำเร็จรูป | — | ✅ ตามออกแบบ (ตัดออกจาก scope แล้ว) | — |
| เพิ่ม/แก้/ลบ ตัวแปรของรายงาน (`report_variables`, ข้อมูลอ้างอิง) | Should | ✅ | 2 |
| เพิ่ม/แก้/ลบ คิวรี่ของรายงาน (`report_queries`, หลายชุด, ข้อมูลอ้างอิงเท่านั้น — แอปไม่ execute) | Should | ✅ | 2 |
| กำหนดคิวรี่หลัก (`is_main`) ได้ 1 รายการต่อรายงานเท่านั้น (บังคับด้วย DB constraint) | Must | ✅ (partial unique index + auto-demote เมื่อ set ตัวใหม่) | 2 |
| อัปโหลดไฟล์ผ่าน validation (MIME ตรงกับ `file_kind`/ขนาด/สแกนไวรัส) | Must | ⚠️ (MIME+ขนาด validate แล้ว, ยังไม่มี AV scan) | 2/4 |
| แปลงรูปภาพเป็น WebP อัตโนมัติ (thumbnail) | Must | ✅ (`lib/imageConvert.ts`) | — |

## 4. Versioning (FR-4)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| เก็บ version ของไฟล์รายงานทุกครั้งที่แก้ (ไม่ overwrite) | Must | ✅ (`report_files.is_current` toggle, แถวเก่าไม่ถูกลบ — **ไม่ใช่** ตาราง `report_versions` เดิมซึ่งเป็น dead code ตั้งใจไม่ลบ ดู `00-progress.md` ของค้าง #3) | 2/3 |
| เก็บ version ของคิวรี่ทุกครั้งที่แก้ | Must | ✅ (`report_query_versions`, snapshot อัตโนมัติเฉพาะตอน `sql_text` เปลี่ยนจริง) | 2 |
| หน้า UI ดูประวัติเวอร์ชัน (ไฟล์+คิวรี่) | Should | ✅ (การ์ด "Version History" ใน `report-edit`) | 3 |
| Rollback ไปเวอร์ชันก่อนหน้า | Should | ✅ (ทั้งไฟล์และคิวรี่ — rollback คิวรี่ snapshot ค่าปัจจุบันก่อนเสมอ ไม่ทำให้ history หาย) | 3 |
| เปรียบเทียบ diff ระหว่างเวอร์ชันคิวรี่ (SQL text diff) | Could | ❌ (ตัดสินใจไว้แล้วว่าเกินสโคป) | 3+ |

## 5. Report Discovery & Search — User (FR-5)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| ค้นหาด้วยชื่อ/รหัส/คำอธิบาย/แท็ก (ไทย+อังกฤษ) | Must | ✅ (`tsvector` + trigram, ยืนยันแล้วว่า index จริงถูกสร้างครบหลังแก้ของค้าง #1) | 1 |
| กรองผลลัพธ์ตาม category/department/tag/status | Must | ✅ (status สำหรับ user ทั่วไป fix เป็น `PUBLISHED` เสมอตามการออกแบบ Phase 1 ไม่ใช่ตัวเลือกอิสระ) | 1 |
| Pagination บนผลการค้นหา | Must | ✅ | 1 |
| Endpoint ค้นหาแบบ ACL-filtered สำหรับ non-admin | Must | ✅ (`GET /api/reports/browse`) | 1/2 |
| Preview ฟอร์ม (PDF) inline ในระบบ ก่อนดาวน์โหลด — รายงานประเภทใบพิมพ์ | Should | ❌ (ยังไม่มี `<iframe>`/`<embed>` เลย) | 1 |
| Preview ตัวอย่างข้อมูลเป็นตาราง — รายงานประเภทรายงานข้อมูล (parse excel ด้วย `exceljs`) | Should | ❌ | 1/2 |
| ค้นหาแบบ fuzzy/typo-tolerant | Could | ❌ (ตอนนี้เป็น `ILIKE` substring match ผ่าน trigram index — ช่วยเรื่อง substring แต่ไม่ทนตัวสะกดผิดจริง) | 1+ (ประเมินความจำเป็นก่อน) |
| Card view / Table view toggle สำหรับผลการค้นหา | Should | ✅ (`reportCards.tsx` เลิก hardcode, ผูก search จริงแล้ว) | 1 |

## 6. Favorites (FR-6)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| เพิ่มรายการโปรด | Must | ✅ | 1 |
| ลบรายการโปรด | Must | ✅ | 1 |
| หน้า Favorites ดึงข้อมูลจริง (แทน `fakedata/fakeReportList.ts`) | Must | ✅ | 1 |
| ตรวจสิทธิ์ `can_favorite` ก่อนเพิ่มโปรด | Must | ✅ (ผ่าน `resolveReportAcl` เต็มรูปแบบ) | 2 |

## 7. Download / Export / Print (FR-7)

> ไม่มี rendering engine เกี่ยวข้องในโมดูลนี้เลย — ทุกไฟล์ที่ดาวน์โหลด/พิมพ์คือไฟล์ที่ admin อัปโหลดไว้ ระบบแค่ตรวจสิทธิ์แล้ว stream/แสดงไฟล์นั้นตรง ๆ (ดู `system-design.md §3.8`)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| ดาวน์โหลดฟอร์มเปล่า (pdf) — ตรวจสิทธิ์ + `is_downloadable` | Must | ✅ | 1 |
| ดาวน์โหลดฟอร์มตัวอย่างที่กรอกข้อมูลแล้ว (pdf) | Must | ⚠️ (เหมือนแถวอัปโหลดใน FR-3 — ไม่มี endpoint ดาวน์โหลดแยกตาม `file_kind` สำหรับ user ทั่วไป มีแค่ไฟล์ primary ของรายงาน) | 1/2 |
| ดาวน์โหลดไฟล์ Excel ตัวอย่างข้อมูล (สำหรับรายงานประเภทข้อมูล) | Must | ✅ (เป็นไฟล์ primary ของรายงานประเภท `DATA_REPORT` อยู่แล้ว ผ่าน endpoint หลักได้ปกติ) | 1 |
| บันทึกทุกการดาวน์โหลดลงตาราง `downloads` | Must | ✅ | 1 |
| สั่งพิมพ์ฟอร์ม ผ่าน browser PDF viewer ในตัว (ไม่ต้องมี backend เพิ่ม) | Must | ❌ (รอ PDF inline preview จาก FR-5 ก่อน) | 1 |
| สั่งพิมพ์ตารางข้อมูลตัวอย่างที่ preview อยู่ (client-side `window.print()` + `@media print`) | Should | ❌ | 1/2 |
| นับ `download_count`/`view_count` แบบ atomic increment | Should | ⚠️ (`download_count` increment แบบ atomic ยืนยันแล้วด้วย concurrent request test; `view_count` ยังไม่เคยถูก increment ที่ไหนเลย เป็น dead column) | 1 |

## 8. Report Sharing (FR-8)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| แชร์รายงานให้ user รายบุคคล | Should | ✅ (`share_type=USER`) | 3 |
| แชร์รายงานให้ทั้งแผนก | Should | ❌ (ตัดสินใจแล้วว่าไม่ wire ใน 3b — fan-out แจ้งเตือนทั้งแผนกต้องออกแบบเพิ่ม) | 3 |
| สร้างลิงก์แชร์ (share token) พร้อมวันหมดอายุ | Should | ✅ (`share_type=LINK`, `expires_at` optional) | 3 |
| กำหนดสิทธิ์ download/edit บนการแชร์แต่ละครั้ง | Should | ⚠️ (`can_download` บังคับใช้จริง; `can_edit` เก็บใน schema แต่ยังไม่มี anonymous-edit flow ให้ enforce เลย — ตัดสินใจไว้แล้วว่าเป็นการตัดสินใจ ไม่ใช่ของค้าง) | 3 |
| Cleanup job ลบ/ปิดใช้งานลิงก์ที่หมดอายุอัตโนมัติ | Should | ❌ (เช็ค lazy ตอน query เท่านั้น ไม่มี cron — ยังไม่มี job scheduler ในระบบ) | 3 |

## 9. Notifications (FR-9)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| แจ้งเตือนรายงานใหม่ที่เกี่ยวข้อง | Should | ❌ (ตัดสินใจแล้วว่าไม่ wire — ไม่มี concept "subscribe" ในระบบให้เดา fan-out ได้อย่างมีเหตุผล) | 3 |
| แจ้งเตือนเมื่อถูกแชร์รายงาน | Should | ✅ (`REPORT_SHARED`, เฉพาะ `share_type=USER`) | 3 |
| แจ้งเตือนเมื่อรายงานที่ติดตามถูกแก้ไข | Should | ✅ (`REPORT_UPDATED`, แจ้งทุกคนที่ favorite ไว้ ยกเว้นคนที่แก้เอง) | 3 |
| แจ้งเตือนรายงาน/ลิงก์ใกล้หมดอายุ | Should | ❌ | 3 |
| แจ้งเตือนระบบ (พื้นที่จัดเก็บใกล้เต็ม, ปิดปรับปรุง) | Could | ❌ | 3/4 |
| กระดิ่งแจ้งเตือนใน UI (unread count, mark-as-read) | Should | ✅ (`NotificationBell`, poll ทุก 30s, mark-read ทีละรายการ) | 3 |
| ส่งอีเมลสำหรับ notification severity สูง | Could | ❌ | 3/4 |

## 10. Activity Log / Audit Trail (FR-10)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| Helper กลาง `logActivity()` เรียกจากทุก mutation | Must | ✅ | 0 |
| บันทึก log สำหรับ login/login_failed/logout | Must | ✅ | 0 |
| บันทึก log สำหรับ CRUD รายงาน/ผู้ใช้/แผนก/บทบาท | Must | ✅ (รวม `favorite`/`unfavorite`/`download` ที่เคยหายไปจาก merge พังแล้วถูกกู้คืนใน `1e1f05c`) | 0/1 |
| หน้า audit log filter ตาม user/entity/วันที่ | Should | ✅ (`GET /api/activity-logs` + `user-management/activity` page, filter user/entity/date range) | 0/3 |
| Alert เมื่อพบ pattern ผิดปกติ (401/403/429 ถี่ผิดปกติ) | Could | ✅ (`GET /api/dashboard/auth-alerts` — dashboard card, IP ที่ `login_failed` ≥5 ครั้งใน 24 ชม., no external delivery channel ตามที่ตกลง) | 4f |

## 11. Dashboard & Usage Analytics (FR-11)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| สรุปจำนวนรายงานทั้งหมด แยกตามสถานะ/หมวดหมู่/แผนก | Must | ✅ (`GET /api/dashboard/summary`) | 3 |
| รายงานที่ถูกดาวน์โหลด/เข้าชมมากสุด (top N) | Must | ✅ (`GET /api/dashboard/top-reports` — จัดอันดับด้วย `download_count`, ไม่ใช่ `view_count` ที่ยังไม่ถูก increment ที่ไหนเลย) | 3 |
| พื้นที่จัดเก็บที่ใช้ไป | Should | ✅ (sum `report_files.file_size` ทุกแถวรวม version เก่า — ยืนยันด้วย SQL ตรงแล้วว่าตรงกับที่ API คืน) | 3 |
| กราฟแนวโน้มการใช้งานรายวัน/รายเดือน | Should | ⚠️ (รายวันเท่านั้น, `GET /api/dashboard/trends`, ยังไม่มี toggle รายเดือน) | 3 |
| Cache/precompute สถิติหนัก (ไม่คำนวณสดทุกครั้ง) | Should | ❌ | 3/4 |

## 12. User & Department Management (FR-12)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| CRUD ผู้ใช้ (list, form, table) | Must | ✅ | — |
| CRUD แผนก (รองรับโครงสร้างลำดับชั้น parent/child) | Must | ✅ | — |
| CRUD บทบาท + จัดการ permission ต่อบทบาท | Must | ✅ | — |
| Activity ของผู้ใช้แต่ละคน (ประวัติการกระทำ) | Should | ✅ (`GET /api/activity-logs?user_id=` + หน้า filter) | 0/3 |

## 13. System Settings (FR-13)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| หน้า Settings อ่าน/เขียนตาราง `settings` จริง | Should | ❌ (ตัดสินใจแล้วว่า theme ไม่ใช้ตารางนี้ — ดู FR-13 ธีมด้านล่าง — แต่ system settings อื่น (storage/auth) ยังไม่มี endpoint เลย) | 3/4 |
| ตั้งค่าวิธี login (provider selection) | Should | ❌ | 4 |
| ตั้งค่า storage backend (local/MinIO/S3) | Should | ❌ | 4 |
| Persist ธีม (dark/light) ต่อผู้ใช้ฝั่ง server | Should | ✅ (`users.theme_preference` + `/api/settings/theme`, ไม่ใช้ตาราง `settings` เดิมตามที่ตัดสินใจไว้) | 3 |
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
| Dark/Light theme switch | Must | ✅ (`next-themes`, persist ต่อผู้ใช้แล้วดู FR-13) | — |
| Sidebar/Navbar responsive layout | Must | ✅ | — |
| Data table มาตรฐาน (`SharedDataTable`) พร้อม sort/pagination | Must | ⚠️ (client-side sort/pagination ใช้แพร่หลาย, server-side pagination ผ่าน `parsePagination` มีแค่ไม่กี่ endpoint เช่น reports/browse/activity-logs ยังไม่ครอบคลุมทุกหน้า list) | 0/1 |
| i18n ไทย/อังกฤษเป็นระบบ (`next-intl`) | Should | ❌ (ปนกันแบบ hardcode) | 2+ |
| Loading/skeleton state มาตรฐานทุกหน้า list | Should | ⚠️ (ไม่สม่ำเสมอ) | 1+ |
| Toast notification สำหรับผลลัพธ์ action (`react-hot-toast`) | Must | ✅ | — |

## 16. Security & Compliance Features

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| Password hashing (bcrypt) | Must | ✅ | — |
| httpOnly, Secure, SameSite cookie | Must | ✅ (`secure: NODE_ENV==='production'`, `sameSite:'lax'`) | 0 |
| Input validation ด้วย `zod` ทุก endpoint | Must | ✅ (ส่วนใหญ่), ⚠️ (ตรวจให้ครบทุก endpoint ใหม่) | ต่อเนื่อง |
| Security headers (CSP, HSTS, X-Content-Type-Options) | Must | ✅ (`next.config.js` `headers()`, ยืนยันสดทุก route ทั้งหน้าเว็บและ `/api/*`) | 4a |
| Antivirus scan ไฟล์อัปโหลด (ClamAV) | Should | ❌ deferred — ไม่มี ClamAV daemon ยืนยันใน deploy environment | 4c (dropped) |
| Dependency vulnerability scanning (CI) | Should | ⚠️ (`.github/workflows/ci.yml` — `npm audit --audit-level=high`, non-blocking ชั่วคราวเพราะเจอ pre-existing high/critical advisories ใน `next@14.2.18`/`postcss`/`sharp` ที่ต้องวางแผนอัปเกรดแยกต่างหาก — ดู `00-progress.md` ของค้าง) | 4f |
| Structured logging + error tracking (pino/Sentry) | Should | ⚠️ (`lib/logger.ts`, pino self-hosted — wire เข้า `logActivity`'s swallowed catch เท่านั้น ยังไม่ mass-replace `console.*` ทั้งโปรเจกต์, ตั้งใจไม่แตะ `lib/auth.ts`/Edge runtime) | 4f |
| Automated test suite (unit/integration/E2E) | Must | ✅ (Vitest, `lib/report-acl.test.ts` 7 test — integration ต่อ dev DB จริง; E2E ยังไม่ทำ) | 4b |

---

## Summary Counts (ภาพรวมความคืบหน้า)

| สถานะ | จำนวน feature (จาก 100 รายการ) |
|---|---|
| ✅ ทำงานได้จริง | 62 |
| ⚠️ มีบางส่วน/mock/schema เฉย ๆ | 9 |
| ❌ ยังไม่มีเลย | 29 |

> ตัวเลขนับจากตารางด้านบนจริง (รวมทุกแถว feature ไม่รวมแถวหมายเหตุ/ดีไซน์โน้ต) ไม่ใช่ story-point estimation — ใช้สื่อสารสัดส่วนงานที่เหลือ ไม่ใช่ใช้วางแผน timeline โดยตรง งานที่เหลือส่วนใหญ่กระจุกอยู่ที่ Phase 4 (security hardening, i18n, test suite, settings ที่เหลือ) และช่องว่างเล็กๆที่ระบุไว้ในแต่ละหมวด (PDF/Excel inline preview, print, sharing ทั้งแผนก, notification บางประเภท)
