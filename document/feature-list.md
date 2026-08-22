# Feature List — RFS Report Finder System

> รวมฟีเจอร์ทั้งหมดของระบบ จัดกลุ่มตามโมดูล/บทบาทผู้ใช้ พร้อม priority (MoSCoW) และสถานะปัจจุบัน (✅ ทำงานได้จริง · ⚠️ มี UI/schema แต่ไม่สมบูรณ์/mock · ❌ ยังไม่มี) อ้างอิงจาก gap analysis ใน `document/new_requirement.md §3-4` แปลงเป็น checklist ที่ execute ได้ พร้อม mapping ไปยัง phase ใน [project-specification.md §6](./project-specification.md#6-development-methodology)
>
> **รีเฟรชล่าสุด: 2026-08-19** (ระหว่าง Phase 5f) — ไล่ทุกแถวเทียบกับโค้ดจริง + [`00-progress.md`](./00-progress.md) อีกรอบ ก่อนหน้านี้ (2026-08-17, `abd3629`) ค้างมาแล้วครั้งหนึ่ง รอบนี้พบว่าค้างซ้ำแบบเดิม — 2FA/TOTP, password policy, PDF inline preview, Excel-as-table preview, client-side print, การตั้งค่า `settings` table จริง ยังขึ้น ❌/⚠️ ทั้งที่ Phase 4c/4d/4e/5e ship ไปแล้ว รอบนี้รีเฟรชทั้งไฟล์ครบทุกแถวอีกครั้งตาม precedent เดิม ไม่ใช่แค่บางแถว
>
> **บทเรียนซ้ำ**: ไฟล์นี้ค้างเป็นรอบที่ 2 แล้วในรอบ ~2 วัน (17 → 19 ส.ค.) เพราะ workflow ปัจจุบันไม่มีการบังคับให้ sync ไฟล์นี้ทุก sub-phase (แค่ "ควร" ทำตาม Definition of Done) — ถ้าเกิดขึ้นรอบที่ 3 ควรพิจารณาย้าย mapping ไปเป็นอัตโนมัติมากขึ้น (เช่น derive จาก `00-progress.md` โดยตรง) แทนการไล่มืออีกครั้ง
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
| ตั้งค่าวิธียืนยันตัวตนได้จากหน้า Settings (Local DB / External API / Email OTP) | Should | ❌ (ตัดสินใจตัดออกจากสโคปแล้ว — aspirational, ไม่ทำ) | 4d (dropped) |
| Two-Factor Authentication (TOTP) | Could | ✅ (`lib/two-factor.ts`, TOTP+backup codes, ยืนยันสด full login-flow end-to-end ซ้ำ 2 ครั้งแล้วทั้ง 4d และ 5f) | 4d |
| Password policy / `password_changed_at` enforcement | Could | ✅ (`lib/password-policy.ts`, 8 ตัว+ตัวอักษร+ตัวเลข, ใช้ทั้ง create/update user) | 4d |

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
| อัปโหลดฟอร์มตัวอย่างที่กรอกข้อมูลแล้ว (pdf) — สำหรับรายงานประเภทใบพิมพ์ | Must | ✅ (`GET .../files/[fileId]/download` แยกตาม `file_kind` ชิปตั้งแต่ 4c, ต่อเข้าหน้า report-detail ใน 5a) | 2/4c/5a |
| อัปโหลดไฟล์ตัวอย่างข้อมูล (excel) — สำหรับรายงานประเภทรายงานข้อมูล ใช้ทั้ง preview เป็นตารางและดาวน์โหลดตรง ๆ | Must | ✅ (preview เป็นตาราง `exceljs` ชิปใน 4c, `components/shared/reportFilePreview.tsx` แยกใช้ร่วมทั้ง dialog และหน้า report-detail ตั้งแต่ 5a) | 2/4c/5a |
| **ไม่มี** การอัปโหลด/parse/render ไฟล์ `.jasper` หรือ source format ใด ๆ — ทุกไฟล์เป็นผลลัพธ์สำเร็จรูป | — | ✅ ตามออกแบบ (ตัดออกจาก scope แล้ว) | — |
| เพิ่ม/แก้/ลบ ตัวแปรของรายงาน (`report_variables`, ข้อมูลอ้างอิง) | Should | ✅ | 2 |
| เพิ่ม/แก้/ลบ คิวรี่ของรายงาน (`report_queries`, หลายชุด, ข้อมูลอ้างอิงเท่านั้น — แอปไม่ execute) | Should | ✅ (แสดงเป็น syntax-highlighted code block ผ่าน `SqlBlock` ตั้งแต่ 5a แทน `<pre>` ธรรมดา) | 2/5a |
| กำหนดคิวรี่หลัก (`is_main`) ได้ 1 รายการต่อรายงานเท่านั้น (บังคับด้วย DB constraint) | Must | ✅ (partial unique index + auto-demote เมื่อ set ตัวใหม่) | 2 |
| อัปโหลดไฟล์ผ่าน validation (MIME ตรงกับ `file_kind`/ขนาด/สแกนไวรัส) | Must | ⚠️ (MIME+ขนาด validate แล้ว, ขนาดสูงสุดตั้งค่าได้ผ่าน UI ตั้งแต่ 5e; ยังไม่มี AV scan — deferred, ไม่มี ClamAV daemon ยืนยันใน deploy environment) | 2/4c/5e |
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
| Preview ฟอร์ม (PDF) inline ในระบบ ก่อนดาวน์โหลด — รายงานประเภทใบพิมพ์ | Should | ✅ (`<embed>` ผ่าน `ReportFilePreview`, ใช้ทั้ง dialog เดิมและหน้า report-detail ใหม่) | 4c/5a |
| Preview ตัวอย่างข้อมูลเป็นตาราง — รายงานประเภทรายงานข้อมูล (parse excel ด้วย `exceljs`) | Should | ✅ | 4c/5a |
| ค้นหาแบบ fuzzy/typo-tolerant | Could | ✅ (`pg_trgm` `similarity()` เพิ่มเข้า `reports/browse`'s WHERE พร้อม rank-aware pagination — ยืนยันแล้วว่าจับคำสะกดผิดสลับตัวอักษรได้จริง เช่น "RTP-003" เจอ "RPT-003") | 1/7d |
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
| ดาวน์โหลดฟอร์มตัวอย่างที่กรอกข้อมูลแล้ว (pdf) | Must | ✅ (`GET .../files/[fileId]/download` แยกตาม `file_kind` ตั้งแต่ 4c, ผ่าน `lib/storage-path.ts` resolver ที่ยังใช้งานได้ถูกต้องหลัง `UPLOAD_BASE_PATH` ตั้งค่าได้ใน 5e) | 1/2/4c/5e |
| ดาวน์โหลดไฟล์ Excel ตัวอย่างข้อมูล (สำหรับรายงานประเภทข้อมูล) | Must | ✅ (เป็นไฟล์ primary ของรายงานประเภท `DATA_REPORT` อยู่แล้ว ผ่าน endpoint หลักได้ปกติ) | 1 |
| บันทึกทุกการดาวน์โหลดลงตาราง `downloads` | Must | ✅ | 1 |
| สั่งพิมพ์ฟอร์ม ผ่าน browser PDF viewer ในตัว (ไม่ต้องมี backend เพิ่ม) | Must | ✅ (`window.print()` scope ด้วย `.report-print-area`, ทั้งใน dialog เดิมและหน้า report-detail) | 4c/5a |
| สั่งพิมพ์ตารางข้อมูลตัวอย่างที่ preview อยู่ (client-side `window.print()` + `@media print`) | Should | ✅ (กลไกเดียวกับแถวบน ครอบคลุมทั้ง PDF และตาราง excel) | 4c/5a |
| นับ `download_count`/`view_count` แบบ atomic increment | Should | ✅ (`download_count` ยืนยันด้วย concurrent request test มาตั้งแต่ 1; `view_count` เริ่ม increment จริงครั้งแรกใน 4c ผ่าน `GET /api/reports/[id]`, มี `useRef` guard กัน double-count จาก React StrictMode ใน 5a) | 1/4c/5a |

## 8. Report Sharing (FR-8)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| แชร์รายงานให้ user รายบุคคล | Should | ✅ (`share_type=USER`) | 3 |
| แชร์รายงานให้ทั้งแผนก | Should | ✅ (`share_type=DEPARTMENT` มีอยู่แล้วตั้งแต่ 3b, เพิ่ม fan-out แจ้งเตือนให้ทุกคนในแผนกยกเว้นผู้แชร์เอง) | 4e |
| สร้างลิงก์แชร์ (share token) พร้อมวันหมดอายุ | Should | ✅ (`share_type=LINK`, `expires_at` optional) | 3 |
| กำหนดสิทธิ์ download/edit บนการแชร์แต่ละครั้ง | Should | ⚠️ (`can_download` บังคับใช้จริง; `can_edit` เก็บใน schema แต่ยังไม่มี anonymous-edit flow ให้ enforce เลย — ตัดสินใจไว้แล้วว่าเป็นการตัดสินใจ ไม่ใช่ของค้าง) | 3 |
| Cleanup job ลบ/ปิดใช้งานลิงก์ที่หมดอายุอัตโนมัติ | Should | ✅ (`check-expired-shares` job ใหม่ รันทุกวัน 03:00 ลบ `report_shares` ที่หมดอายุแล้วจริง — ยืนยันสดแล้วว่า token ที่ถูกลบเปลี่ยนจาก 410→404 จริง, token ที่ยังไม่หมดอายุไม่โดนลบผิดตัว) | 3/7a/8b |

## 9. Notifications (FR-9)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| แจ้งเตือนรายงานใหม่ที่เกี่ยวข้อง | Should | ❌ (ตัดสินใจแล้วว่าไม่ wire — ไม่มี concept "subscribe" ในระบบให้เดา fan-out ได้อย่างมีเหตุผล) | 3 |
| แจ้งเตือนเมื่อถูกแชร์รายงาน | Should | ✅ (`REPORT_SHARED`, เฉพาะ `share_type=USER`) | 3 |
| แจ้งเตือนเมื่อรายงานที่ติดตามถูกแก้ไข | Should | ✅ (`REPORT_UPDATED`, แจ้งทุกคนที่ favorite ไว้ ยกเว้นคนที่แก้เอง) | 3 |
| แจ้งเตือนรายงาน/ลิงก์ใกล้หมดอายุ | Should | ✅ (`POST /api/system/jobs/check-report-expiry` — ไม่มี cron ในระบบ จึงเป็น endpoint ที่ต้อง invoke เอง/ผูกกับ scheduler ภายนอก, de-dupe ด้วย `report_shares.expiry_notified_at`) | 4e |
| แจ้งเตือนระบบ (พื้นที่จัดเก็บใกล้เต็ม, ปิดปรับปรุง) | Could | ✅ (`POST /api/system/jobs/check-storage` + `PUT /api/settings/system` toggle maintenance mode — broadcast เท่านั้น ไม่ได้ enforce การปิดกั้นจริง) | 4e |
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
| กราฟแนวโน้มการใช้งานรายวัน/รายเดือน | Should | ✅ (`GET /api/dashboard/trends?granularity=day\|month` มี toggle จริงในหน้า dashboard) | 3/7c |
| Cache/precompute สถิติหนัก (ไม่คำนวณสดทุกครั้ง) | Should | ✅ (Redis cache-aside ทั้ง 4 endpoint dashboard, TTL 60s, fail-open ยืนยันสดแล้วทั้ง cache-hit และตอน Redis ล่ม) | 3/7c |

## 12. User & Department Management (FR-12)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| CRUD ผู้ใช้ (list, form, table) | Must | ✅ | — |
| CRUD แผนก (รองรับโครงสร้างลำดับชั้น parent/child) | Must | ✅ | — |
| CRUD บทบาท + จัดการ permission ต่อบทบาท | Must | ✅ (แก้ permission ของ role ที่มีอยู่แล้วทำได้จริงตั้งแต่ 5c — ก่อนหน้านั้น `GET`/`PUT /api/users/roles/[id]` เป็น `Hello World` stub ทำได้แค่ตอนสร้าง role ใหม่เท่านั้น) | —/5c |
| Activity ของผู้ใช้แต่ละคน (ประวัติการกระทำ) | Should | ✅ (`GET /api/activity-logs?user_id=` + หน้า filter) | 0/3 |

## 13. System Settings (FR-13)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| หน้า Settings อ่าน/เขียนตาราง `settings` จริง | Should | ✅ (`GET`/`PUT /api/settings/system` ตัวใช้งานจริงตัวแรกตั้งแต่ 4e เก็บแค่ 2 คีย์ ขยายเป็น 10 คีย์ครอบ storage+general ใน 5e; `GET /api/settings/public` ใหม่สำหรับค่าที่ต้องแสดงก่อน login เช่น `ORG_NAME`) | 4e/5e |
| ตั้งค่าวิธี login (provider selection) | Should | ❌ (ตัดสินใจตัดออกจากสโคปแล้ว — aspirational, ไม่ทำ) | 4d (dropped) |
| ตั้งค่า storage backend (local/MinIO/S3) | Should | ⚠️ (7d เพิ่ม `StorageBackend` interface จริง — `local` ใช้งานได้เต็มรูปแบบ, `s3.ts` เป็น stub throw "not implemented" ตั้งใจเพราะไม่มี MinIO/S3 จริงให้ทดสอบ — ยังสลับ backend จริงไม่ได้ในทางปฏิบัติ) | 4/5e/7d |
| Persist ธีม (dark/light) ต่อผู้ใช้ฝั่ง server | Should | ✅ (`users.theme_preference` + `/api/settings/theme`, ไม่ใช้ตาราง `settings` เดิมตามที่ตัดสินใจไว้) | 3 |
| จำกัดขนาดไฟล์อัปโหลดสูงสุดต่อ `file_kind` แบบตั้งค่าได้ | Could | ✅ (ตั้งค่าได้จริงผ่านหน้า `/settings/storage` + `PUT /api/settings/system`, มี cache invalidation ทันทีหลัง save — ปิดของค้างที่ 4e ทำได้แค่ค่าคงที่ในโค้ด) | 4e/5e |

## 14. Support Ticket (FR-14 — Optional, ต้องตัดสินใจ scope)

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| ผู้ใช้แจ้งปัญหา/ขอรายงานใหม่ผ่านระบบ ticket | Could | ✅ (`/tickets`, `POST /api/tickets`) | 7e |
| Admin จัดการ ticket (assign, resolve, close) | Could | ✅ (`/tickets/manage`, `PUT /api/tickets/[id]` — ไม่มี DELETE ตั้งใจ, close ปลอดภัยกว่า) | 7e |

## 15. UI / UX Cross-Cutting Features

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| Dark/Light theme switch | Must | ✅ (`next-themes`, persist ต่อผู้ใช้แล้วดู FR-13) | — |
| Sidebar/Navbar responsive layout | Must | ✅ | — |
| Data table มาตรฐาน (`SharedDataTable`) พร้อม sort/pagination | Must | ⚠️ (client-side sort ใช้แพร่หลาย; server-side pagination ผ่าน `parsePagination` ตอนนี้ครอบ reports/browse, activity-logs, report/manage, favorites, departments, users/user, roles — 4 endpoint หลังเป็น opt-in คือคืน full list เหมือนเดิมถ้าไม่ส่ง `page`/`pageSize` มา เพราะมี combobox ที่พึ่ง full list อยู่ — `baseconfig/menus` ตั้งใจไม่ paginate เพราะพึ่ง full-list-adjacency ในการจัดกลุ่ม) | 0/1/7b |
| i18n ไทย/อังกฤษเป็นระบบ (`next-intl`) | Should | ❌ (ปนกันแบบ hardcode) | 2+ |
| Loading/skeleton state มาตรฐานทุกหน้า list | Should | ⚠️ (7b เพิ่ม `SkeletonTable` ให้อีก 5 หน้าที่ไม่มีมาก่อน — `favorites`/`user-department`/`user-list`/`reports/categories`/`reports/tags` — แต่ยังไม่ครบทุกหน้า list ในระบบ ไม่สม่ำเสมอ 100%) | 1/7b |
| Toast notification สำหรับผลลัพธ์ action (`react-hot-toast`) | Must | ✅ | — |

## 16. Security & Compliance Features

| Feature | Priority | สถานะ | Phase |
|---|---|---|---|
| Password hashing (bcrypt) | Must | ✅ | — |
| httpOnly, Secure, SameSite cookie | Must | ✅ (`secure: NODE_ENV==='production'`, `sameSite:'lax'`) | 0 |
| Input validation ด้วย `zod` ทุก endpoint | Must | ✅ (Phase 8c ไล่ตรวจครบทั้ง 28 ไฟล์ที่รับ body จริงเทียบกับ `route.ts` ทั้งหมด 57 ไฟล์ — validate ด้วย zod ก่อนใช้งานครบทุกไฟล์ ไม่พบ gap เลยสักจุด) | ต่อเนื่อง/8c |
| Security headers (CSP, HSTS, X-Content-Type-Options) | Must | ✅ (`next.config.js` `headers()`, ยืนยันสดทุก route ทั้งหน้าเว็บและ `/api/*`) | 4a |
| Antivirus scan ไฟล์อัปโหลด (ClamAV) | Should | ❌ deferred — ไม่มี ClamAV daemon ยืนยันใน deploy environment | 4c (dropped) |
| Dependency vulnerability scanning (CI) | Should | ⚠️ (`.github/workflows/ci.yml` — `npm audit --audit-level=high`, non-blocking ชั่วคราว — `next`/`postcss`/`sharp` advisories ที่เคยเป็นเหตุผลเดิมถูกปิดไปแล้วทั้งหมดโดย `dependency-upgrade-plan.md`, เหตุผลที่เหลือตอนนี้คือของค้าง #9 (`deepmerge-ts` ผ่าน `@prisma/config`) เท่านั้น — ตรงกับ comment ใน `ci.yml` เองแล้ว) | 4f |
| Structured logging + error tracking (pino/Sentry) | Should | ⚠️ (7a mass-replace `console.*` → `lib/logger.ts`'s pino จริงครบทุก API route handler + `lib/*` ที่เกี่ยวข้อง รวม `logDevError` เองก็ต่อ pino แล้วนอก dev — เหลือแค่ client component console.* ที่ตั้งใจไม่แตะเพราะ pino เป็น Node-only, และยังไม่มี error-tracking vendor เช่น Sentry ต่อจาก pino เลย ตัดสินใจไว้แล้วว่าไม่ทำรอบ 7a) | 4f/7a |
| Automated test suite (unit/integration/E2E) | Must | ✅ (Vitest, `lib/report-acl.test.ts` 7 test — integration ต่อ dev DB จริง; E2E ยังไม่ทำ) | 4b |

---

## Summary Counts (ภาพรวมความคืบหน้า)

| สถานะ | จำนวน feature (จาก 100 รายการ) |
|---|---|
| ✅ ทำงานได้จริง | 86 |
| ⚠️ มีบางส่วน/mock/schema เฉย ๆ | 7 |
| ❌ ยังไม่มีเลย | 7 |

> ตัวเลขฐานนับจากตารางด้านบนจริงล่าสุด 2026-08-19 หลัง Phase 5a-5f (รวมทุกแถว feature ไม่รวมแถวหมายเหตุ/ดีไซน์โน้ต) รอบนี้ (2026-08-22) แก้เพิ่ม 7 แถวที่ Phase 7 เปลี่ยนสถานะจริง (ticket ×2, fuzzy search, cleanup job, monthly trend, dashboard cache, storage backend interface) — **ยังไม่ใช่การไล่ตรวจซ้ำทั้ง 100 แถว** แถวอื่นที่ Phase 6/7 อาจแตะไปแล้วบางส่วน (เช่น skeleton loading, structured logging) ปรับ justification text ให้ตรงแล้วแต่สัญลักษณ์ไม่เปลี่ยน ไม่ใช่ story-point estimation — ใช้สื่อสารสัดส่วนงานที่เหลือ ไม่ใช่ใช้วางแผน timeline โดยตรง งานที่เหลือส่วนใหญ่กระจุกอยู่ที่ i18n, E2E test, S3/MinIO backend จริง (interface มีแล้วตั้งแต่ 7d, ตัวจริงยังไม่มี), auth-provider selection (dropped), และ ClamAV AV scan (deferred)
