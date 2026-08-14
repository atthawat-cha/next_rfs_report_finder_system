# Phase 3 — Versioning UI, Sharing, Notifications, Dashboard

## Context

Phase 2 (`2a`-`2d`, ปิดจบใน `30d2655`/`c9d640c`) ทำ schema + ACL + `report_files`/`report_queries`/`report_variables`/`report_permissions` CRUD ครบแล้ว เข้า Phase 3 ตาม `feature-list.md` ซึ่งกว้างกว่า Phase 2 มาก ครอบคลุมหลายโมดูลที่ไม่เกี่ยวกัน — เอกสารนี้แบ่งเป็น sub-phase เหมือน `phase2-plan.md` แต่ sub-phase ของ Phase 3 คนละโมดูลกันชัดเจน (ไม่ได้ไล่ตามลำดับ dependency แบบ 2a→2d) เลือกทำได้ไม่ตามลำดับถ้าจำเป็น

Audit โค้ดจริงก่อนวางแผนพบ:
- **`report_versions` เป็นตารางที่ไม่มีจุดเรียกใช้เลย** (`grep -rn report_versions app/` เจอแค่ไฟล์ generated Prisma client, ไม่มีใน `app/api` หรือ `app/(auth)` เลย) — เป็น legacy table ที่ตั้งใจไว้ตอนแรกสำหรับ "1 รายงาน = 1 ไฟล์ = versioned" แต่ตอนนี้ Phase 2 แก้ปัญหานี้ไปแล้วด้วยกลไกอื่น: `report_files` versioned ผ่าน `is_current` toggle (แถวเก่าไม่ถูกลบ แค่ตั้ง `is_current=false`) และ `report_query_versions` เก็บ SQL history อยู่แล้วตั้งแต่ 2c — `report_versions` เลยกลายเป็น dead weight ตามที่ `01-system-design.md §5.2` เตือนไว้ล่วงหน้า
- `app/(auth)/dashboard/page.tsx` เป็น scaffold เริ่มต้นของ starter template เดิม ("พื้นที่ว่างสำหรับ features ของคุณ") ไม่มี query จริงเลยแม้แต่ query เดียว
- `notifications`/`report_shares`/`settings` มี schema ครบแต่ **ไม่มี endpoint ใดๆเรียกใช้เลย** (schema-only ตาม feature-list.md)

Resolved decisions:
1. แบ่ง Phase 3 เป็น 5 sub-phase ทำทีละก้อน:
   - **3a**: Version History + Rollback (ไฟล์ + คิวรี่) — เอกสารนี้ละเอียดเต็มแล้ว, implement ทันที
   - **3b**: Report Sharing (`report_shares` CRUD + share link + token-gated public access)
   - **3c**: Notifications (list/read endpoints + bell UI + wiring เข้า trigger point ที่มีอยู่แล้ว)
   - **3d**: Dashboard & Activity Log analytics
   - **3e**: Settings — persist theme ฝั่ง server (เล็กที่สุด อาจพ่วงกับ 3d ก็ได้)
2. **ไม่ลบ `report_versions` ในรอบนี้** แม้ยืนยันแล้วว่าไม่มีจุดเรียกใช้ — การ drop ตารางเป็น destructive migration บน DB ที่อาจมี dev data อยู่ ควรเป็นการตัดสินใจที่ผู้ใช้ยืนยันเองแยกต่างหาก ไม่ใช่ทำเงียบๆไปพร้อม sub-phase อื่น — 3a จะสร้าง version-history UI จาก `report_files` (แถวเก่าที่ `is_current=false` มีอยู่แล้วตั้งแต่ 2b) และ `report_query_versions` (มีอยู่แล้วตั้งแต่ 2c) ตรงๆ โดยไม่แตะ `report_versions` เลย — ทิ้ง `report_versions` ไว้เป็น follow-up ที่ต้องตัดสินใจแยก (ไม่ใช่ทิ้งไว้เฉยๆไม่มีกำหนดเหมือนที่ design doc เตือน แต่บันทึกไว้ตรงนี้ว่าเป็น dead table ที่ยืนยันแล้ว รอ sign-off ก่อนลบ)

---

## Sub-phase 3a — Version History + Rollback

### 1. `GET /api/reports/[id]/versions` — unified read-only history

รวม 2 แหล่งข้อมูลที่มีอยู่แล้วให้เห็นในที่เดียว (ไม่สร้างตารางใหม่):
- **File history**: `report_files.findMany({where: {report_id}})` (ทุกแถว ไม่ filter `is_current`) group by `file_kind`, sort `created_at desc` ภายในกลุ่ม — แต่ละแถวมี `is_current` บอกอยู่แล้วว่าอันไหนคือปัจจุบัน
- **Query history**: `report_queries.findMany({where: {report_id}, include: {report_query_versions: {orderBy: {created_at: 'desc'}}}})` — แต่ละ query คืนทั้ง live row (`sql_text`/`version` ปัจจุบัน) และ array ของ snapshot เก่า

คืน `{files: Record<FileKind, ReportFileRow[]>, queries: (ReportQueryRow & {report_query_versions: VersionSnapshot[]})[]}`

Auth: `routeAcceptted('admin')` (อ่านประวัติเป็นงาน admin เหมือนหน้า edit ทั้งหน้า)

**Files**: `app/api/reports/[id]/versions/route.ts` (ใหม่, GET เท่านั้น)

### 2. `POST /api/reports/[id]/versions/rollback` — rollback ทั้งไฟล์และคิวรี่

Body แบบ discriminated union ตาม `target`:
- `{target: 'file', report_files_id}` → หาแถวเป้าหมาย (ต้อง `report_id` ตรง) → transaction: ตั้ง `is_current=false` ให้ทุกแถวอื่นที่ `file_kind` เดียวกันของรายงานนี้ → ตั้งแถวเป้าหมาย `is_current=true` → `syncReportFileCache(reportId)` (helper เดิมจาก 2b, reuse ตรงๆ) → **ไม่สร้างแถวใหม่** (แค่ toggle กลับไปที่แถวเก่า ไม่ duplicate ไฟล์เดิม) → `logActivity('update', 'report', reportId, 'Rolled back <file_kind> to v<version>')`
- `{target: 'query', version_id}` → หา `report_query_versions` row เป้าหมาย + query แม่ (`report_queries`) ที่มัน join อยู่ (ต้อง `query.report_id` ตรงกับ path) → **snapshot ค่าปัจจุบันก่อนเสมอ** (สร้าง `report_query_versions` ใหม่จากค่าที่ query มีอยู่ตอนนี้ — กันไม่ให้ rollback ทำให้ค่าก่อน rollback หายไปจาก history) → update `report_queries.sql_text` เป็นค่าจาก version เป้าหมาย, bump `version` (`parseFloat + 0.1`, scheme เดิม) → `logActivity('update', 'report', reportId, 'Rolled back query "<name>" to v<version>')`
- ทั้งสองกรณี reuse logic เดียวกับที่มีอยู่แล้วใน 2b (`report-file-cache.ts`)/2c (`queries/route.ts` PUT's snapshot-then-bump pattern) ไม่เขียน logic versioning ใหม่จากศูนย์

Auth: `routeAcceptted('admin')`

**Files**: `app/api/reports/[id]/versions/rollback/route.ts` (ใหม่, POST เท่านั้น)

### 3. UI — "Version History" card ที่ 5 ใน `report-edit/[id]/page.tsx`

- Fetch จาก `GET .../versions` พร้อมกับที่ fetch อื่นๆใน `fetchAll` (`Promise.all` เดิม)
- แสดงไฟล์แต่ละ `file_kind`: list เวอร์ชันเรียงใหม่→เก่า, badge "ปัจจุบัน" ที่แถว `is_current`, ปุ่ม "Rollback" ที่แถวอื่น (เรียก `POST rollback` แล้ว `fetchAll()` ใหม่)
- แสดงคิวรี่แต่ละตัว: list `report_query_versions` ของมัน (ถ้ามี) พร้อมปุ่ม Rollback ต่อแถว, ถ้าไม่มี version เก่าเลยแสดง "ยังไม่มีประวัติการแก้ไข"
- ไม่ทำ diff SQL text ระหว่างเวอร์ชัน (Could-priority ใน feature-list.md, เกินสโคปรอบนี้)

**Files**: `app/(auth)/reports/report-edit/[id]/page.tsx` (แก้)

### Verification (3a)

- แทนที่ `BLANK_FORM` 2 ครั้ง (มี 3 เวอร์ชันรวม current) → `GET versions` เห็นครบ 3 แถว, `is_current` ตรงกับแถวล่าสุดเท่านั้น
- Rollback ไปแถวที่ 1 → แถวที่ 1 กลาย `is_current=true`, แถวอื่นเป็น `false`, `reports.file_path` cache sync ตรงกับแถวที่ 1
- แก้ `sql_text` ของ query 2 ครั้ง (มี 2 snapshot ใน `report_query_versions`) → rollback ไป snapshot แรก → query ปัจจุบันมี `sql_text` เท่ากับ snapshot แรก, และมี snapshot ใหม่เกิดขึ้นเก็บค่าก่อน rollback ไว้ (ไม่หาย)
- `npx tsc --noEmit` ไม่มี error ใหม่

---

## Sub-phase 3b (overview) — Report Sharing

- `report_shares` CRUD ต่อรายงาน (`GET/POST/DELETE /api/reports/[id]/shares`) — แชร์ให้ user รายบุคคล (`shared_with`) หรือสร้าง link token (`share_type=LINK`, `share_token` สุ่ม, `expires_at`)
- `GET /api/shares/[token]` — public-token-gated read access (ไม่ต้อง login), เช็ค `expires_at` ก่อนเสมอ, เช็ค `can_download`/`can_edit` ตาม flag บน share row
- Cleanup งาน expired link: ตัดสินใจก่อนว่าเป็น cron job จริง (ต้องมี job runner) หรือ soft-check ตอน query (`WHERE expires_at IS NULL OR expires_at > now()`) แบบ lazy — แนะนำ lazy check ก่อนสำหรับ MVP เพราะยังไม่มี job scheduler ในระบบ

## Sub-phase 3c (overview) — Notifications

- `GET /api/notifications`, `POST /api/notifications/[id]/read` — list + mark-read สำหรับ user ปัจจุบัน (`user_id` จาก session)
- กระดิ่งแจ้งเตือนใน UI (navbar) — unread count badge, dropdown list
- Trigger points ที่ต้อง insert `notifications` row: report ใหม่ publish (`REPORT_NEW`), แชร์รายงาน (`REPORT_SHARED`, ผูกกับ 3b), แก้ไขรายงานที่ favorite ไว้ (`REPORT_UPDATED`) — เลือก wire เท่าที่ endpoint mutation มีอยู่แล้วก่อน ไม่สร้าง trigger ใหม่ที่ยังไม่มี use case ชัด
- Email สำหรับ severity สูง: เกิน scope (ต้องมี mail service) — deferred ไป Phase 4 ตาม feature-list.md

## Sub-phase 3d (overview) — Dashboard & Activity Log

- `GET /api/dashboard/summary`, `/trends`, `/top-reports` — aggregate count ตาม status/category/department, top-N download/view, ใช้ query จริงแทน placeholder
- แทนที่ `app/(auth)/dashboard/page.tsx` ทั้งหน้าด้วย stat cards + กราฟจริง (ใช้ `dataviz` skill ตอนสร้างกราฟ ตามที่ระบุไว้ใน system instructions)
- เติม filter ให้ endpoint audit log ที่มีอยู่ (by user/entity/date range) ตามที่ `feature-list.md` ระบุว่ายังไม่ครบ

## Sub-phase 3e (overview) — Settings (theme persistence)

- `GET/PUT /api/settings/theme` (หรือ key ทั่วไปใน `settings` table) ผูกกับ `next-themes` ที่มีอยู่แล้วฝั่ง client — เก็บค่าต่อ user (ต้องเพิ่ม `user_id` scoping ไม่ใช่ table `settings` แบบ global key/value เฉยๆ ถ้าต้องการ per-user — ตัดสินใจตอนถึงตา sub-phase นี้)
