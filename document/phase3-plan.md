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

## Sub-phase 3b — Report Sharing

Audit ก่อนลงรายละเอียด: `report_shares`/`ShareType` ไม่มีจุดเรียกใช้เลย (`grep -rn "report_shares|ShareType" app/ lib/` เจอแค่ generated Prisma client) — งานนี้เขียนใหม่ทั้งก้อนจริงๆ ไม่มีของเดิมให้ reconcile เหมือน 2b

Resolved decisions:
1. **จัดการ share เป็นงาน admin เท่านั้น** (`routeAcceptted('admin')`) เหมือนงาน report management อื่นทั้งหมดในระบบตอนนี้ — ยังไม่เปิดให้ user ทั่วไปที่มีสิทธิ์ `can_edit` ผ่าน `report_permissions` สร้าง share เอง (ต้องมี UI แยกสำหรับ user ทั่วไปซึ่งไม่มีอยู่เลยตอนนี้ — เกินสโคป รอ phase ถัดไปถ้าต้องการ)
2. **`can_edit` บน `report_shares` เป็น field ที่ยังไม่ enforce ที่ไหนเลยใน sub-phase นี้** — ไม่มี anonymous edit flow ให้คนถือลิงก์แก้ไขรายงานได้โดยไม่ login (จะเป็นช่องโหว่ใหญ่ถ้าทำเร็วๆแบบไม่คิด) เก็บ field ไว้ตาม schema เพื่อไม่เสีย data model แต่ documentation ชัดว่ายังไม่มีผลจริง — เหมือนที่ 3a เจอกับ `report_versions`, ต่างกันที่ตัวนี้ "ยังไม่ build ใช้งาน" ไม่ใช่ "build แล้วแต่ตายไปแล้ว"
3. **Public share page**: `/shares/[token]` ต้องเป็นหน้าที่เข้าได้โดยไม่ login จริง — `middleware.ts`'s `publicPaths` เช็คแบบ exact-match (`publicPaths.includes(pathname)`) ไม่รองรับ dynamic prefix เลย ต้องเพิ่มเงื่อนไข prefix check (`pathname.startsWith('/shares/')`) แยกจาก `publicPaths` array เดิม — แก้ `middleware.ts` เพิ่มเติมใน sub-phase นี้
4. **ไฟล์ที่แชร์ผ่านลิงก์ยังอยู่ใต้ `public/`** เหมือนที่ Phase 1/2 ตัดสินใจไว้ (ไม่ใช่ object storage แยกตามที่ system-design.md §1.1 แนะนำระยะยาว) — หมายความว่าไฟล์เหล่านี้ถูก fetch ได้ตรงๆถ้ารู้ path อยู่แล้วโดยไม่ผ่าน endpoint นี้เลย ไม่ใช่ช่องโหว่ใหม่ที่ 3b สร้างขึ้น เป็น debt เดิมจาก Phase 1/2 ที่ระบุไว้แล้วในเอกสาร — endpoint นี้แค่บอก path ให้คนถือ token ที่ยังไม่หมดอายุ ไม่ได้ทำให้ path เข้าถึงได้ง่ายขึ้นกว่าที่เป็นอยู่แล้ว
5. **Cleanup expired link**: lazy check ตอน query (`WHERE expires_at IS NULL OR expires_at > now()`) ไม่ทำ cron job จริง เพราะยังไม่มี job scheduler ในระบบ (ตรงกับ overview เดิม)

### 1. `report_shares` CRUD ต่อรายงาน

`app/api/reports/[id]/shares/route.ts`:
- **GET**: list share ของรายงาน เรียง `created_at desc` → join ชื่อ user/department ตาม `share_type` (`USER`→`users`, `DEPARTMENT`→`departments`, `LINK`→ไม่ต้อง join คืน `share_token` ตรงๆให้ฝั่ง client ประกอบเป็น URL เต็ม)
- **POST**: body แบบ discriminated union ตาม `share_type`:
  - `USER`/`DEPARTMENT`: ต้องมี `shared_with` → validate ว่ามีอยู่จริงใน `users`/`departments` ตามลำดับ (404 ถ้าไม่เจอ)
  - `LINK`: ห้ามส่ง `shared_with` → generate `share_token` ด้วย `crypto.randomBytes(24).toString('hex')` (ฝั่ง server เท่านั้น ไม่รับ token จาก client)
  - ทุก type: `can_download` (default `true`), `can_edit` (default `false`, ดูข้อ 2), `expires_at` (optional ISO string หรือ `null` = ไม่หมดอายุ) → `logActivity('create', 'report', reportId, ...)`
- **DELETE**: query param `?id=` → ลบ (revoke) แถว → `logActivity('delete', ...)`
- **ไม่มี PUT** — ตรงกับ endpoint table ใน `01-system-design.md §4.2` ที่ระบุแค่ `GET/POST/DELETE` (แก้ share ที่มีอยู่ = revoke แล้วสร้างใหม่ ไม่ใช่ edit in place)
- Auth: `routeAcceptted('admin')` ทั้ง 3 method

**Files**: `app/api/reports/[id]/shares/route.ts` (ใหม่)

### 2. Public token-gated access

`app/api/shares/[token]/route.ts` (GET, **ไม่มี auth check** — จุดประสงค์คือให้เข้าได้โดยไม่ login):
- หา `report_shares` ด้วย `share_token` → 404 ถ้าไม่เจอ → 410 (Gone) ถ้า `expires_at` ผ่านไปแล้ว
- คืน report metadata (`code/name_th/name_en/description/output_type`) + `report_files` ที่ `is_current=true` **เฉพาะตอน `can_download=true`** (ถ้า `false` คืน metadata อย่างเดียว ไม่คืน path ไฟล์)
- ไม่เช็ค/ใช้ `can_edit` เลยตามข้อ 2 (ยังไม่มี flow ให้ทำอะไรกับมัน)

`app/shares/[token]/page.tsx` (public page, ต้องเพิ่ม `/shares/` เข้า middleware ตามข้อ 3):
- เรียก endpoint ข้างบน, แสดงข้อมูลรายงาน + ปุ่มดาวน์โหลดไฟล์ (ถ้า `can_download`) หรือข้อความ "ลิงก์หมดอายุ/ไม่พบ" ถ้า 404/410
- ไม่ใช้ `ContentLayout`/sidebar (หน้านี้ไม่ต้อง login) — layout เรียบง่ายแบบเดียวกับ `/login`

**Files**: `app/api/shares/[token]/route.ts` (ใหม่), `app/shares/[token]/page.tsx` (ใหม่), `middleware.ts` (เพิ่ม prefix check)

### 3. UI — Sharing section ในหน้าแก้ไขรายงาน

การ์ดที่ 6 ใน `report-edit/[id]/page.tsx`: list share ที่มีอยู่ (type badge, target name หรือลิงก์เต็มพร้อมปุ่ม copy, วันหมดอายุ, ปุ่ม Revoke) + ฟอร์มสร้าง share ใหม่ (เลือกประเภท → ถ้า USER/DEPARTMENT โชว์ dropdown เลือก user/department, ถ้า LINK ไม่โชว์ dropdown → checkbox `can_download`/`can_edit` → date picker `expires_at` (ไม่บังคับ) → ปุ่มสร้าง)

**Files**: `app/(auth)/reports/report-edit/[id]/page.tsx` (แก้)

### Verification (3b)

- สร้าง share `type=LINK` ไม่มี `expires_at` → เข้า `/shares/<token>` โดยไม่ login เห็นข้อมูลรายงาน + ไฟล์ (ถ้า `can_download=true`)
- สร้าง share `type=LINK`, `expires_at` เป็นอดีต → เข้า endpoint คืน 410
- สร้าง share `type=USER` ด้วย `shared_with` ที่ไม่มีอยู่จริง → 404 ไม่ insert แถว
- Revoke share แล้วเข้า token เดิม → 404
- เข้าหน้า `/shares/<token>` จาก browser ที่ไม่มี cookie login เลย → ไม่ถูก middleware redirect ไป `/login`
- `npx tsc --noEmit` ไม่มี error ใหม่

## Sub-phase 3c — Notifications

Audit ก่อนลงรายละเอียด: `notifications`/`NotificationType` ไม่มีจุดเรียกใช้เลย (schema-only เหมือน `report_shares` ก่อน 3b) — เขียนใหม่ทั้งก้อน

Resolved decisions:
1. **Trigger point ที่ wire จริงใน sub-phase นี้มีแค่ 2 จาก 4 ที่ระบุไว้ใน overview เดิม**:
   - `REPORT_SHARED` — ตอนสร้าง share `share_type=USER` (ผูกกับ 3b ตรงๆ, มี `user_id` เป้าหมายชัดเจนอยู่แล้วจาก `shared_with`) — **ไม่ wire** `share_type=DEPARTMENT` เพราะจะต้อง fan-out แจ้งเตือนทุกคนในแผนก ซึ่งเป็นการตัดสินใจ product ที่ควรถามก่อน ไม่ใช่เดาทำเงียบๆ
   - `REPORT_UPDATED` — ตอน `PUT /api/reports/report/manage/[id]` สำเร็จ แจ้งทุก user ที่มี `favorites` แถวผูกกับรายงานนั้น (relation ที่มีอยู่แล้วชัดเจนตั้งแต่ Phase 1)
   - **ไม่ wire** `REPORT_NEW` — ไม่มี concept "ใครสนใจ category/department ไหน" (follow/subscribe) อยู่ในระบบเลย การเดา fan-out ไปทั้งแผนกของรายงานตอน publish จะเป็นการสร้าง behavior ที่ไม่มีใครขอ ต้องมี subscribe model ก่อนถึงจะ wire ได้แบบมีเหตุผล — ทิ้งไว้เป็น follow-up ที่ต้องออกแบบเพิ่ม ไม่ใช่ deferred เงียบๆแบบไม่บอก
   - Email severity สูง: เกิน scope (ต้องมี mail service) — deferred ไป Phase 4 ตาม `feature-list.md` เหมือน overview เดิม
2. **Mark-read ทำได้แค่ทีละรายการ** ตาม endpoint ที่ระบุใน `01-system-design.md §4.2` (`POST /api/notifications/[id]/read`) — ไม่เพิ่ม "mark all read" เพราะไม่มีอยู่ใน spec เดิม (คลิกรายการในกระดิ่งทีละอันแทน)

### 1. `lib/notifications.ts` — helper กลาง

`createNotification(userId, type, title, message, link?)` — insert แถวเดียวลง `notifications` (id ผ่าน `faker.string.uuid()` ตาม convention เดิม) reuse จากทุก trigger point ไม่เขียน insert ซ้ำในแต่ละ route (เหมือน `logActivity`) — swallow error เหมือน `logActivity` (แจ้งเตือนพลาดต้องไม่ทำให้ mutation หลักพัง)

**Files**: `lib/notifications.ts` (ใหม่)

### 2. `GET /api/notifications` + `POST /api/notifications/[id]/read`

`app/api/notifications/route.ts`:
- **GET**: list การแจ้งเตือนของ user ปัจจุบัน (`user_id` จาก session, ไม่รับจาก query param) เรียง `created_at desc` จำกัด 50 แถวล่าสุด + คืน `unread_count` (นับแยก ไม่ใช่นับจาก array ที่ตัดมาแค่ 50 — ถ้ามี unread เกิน 50 ต้องเห็นตัวเลขจริง)
- Auth: แค่ login (`requireAuth`, ไม่ใช่ `requireRole('admin')` — เป็นฟีเจอร์ user ทุกคน)

`app/api/notifications/[id]/read/route.ts`:
- **POST**: ตั้ง `is_read=true, read_at=now()` ให้แถวที่ `id` ตรงและ `user_id` ตรงกับ session เท่านั้น (404 ถ้าไม่ตรง — กัน user คนอื่น mark read แจ้งเตือนของคนอื่น)

**Files**: `app/api/notifications/route.ts` (ใหม่, GET เท่านั้น), `app/api/notifications/[id]/read/route.ts` (ใหม่, POST เท่านั้น)

### 3. Wire trigger points

- `app/api/reports/[id]/shares/route.ts` POST: หลัง insert share สำเร็จ ถ้า `share_type === 'USER'` เรียก `createNotification(shared_with, 'REPORT_SHARED', ...)` พร้อม `link: /reports/report-edit/${reportId}` (ถ้าผู้รับเป็น admin) — เดายากว่าผู้รับเป็น admin หรือ user ทั่วไป เพราะไม่มีหน้า report view สำหรับ user ทั่วไปที่ผูกกับ report id ตรงๆนอกจาก report-list — ใช้ `link: null` ไปก่อน (แจ้งแค่ title/message พอ ไม่ใส่ link ที่อาจ 404 สำหรับ user ทั่วไป)
- `app/api/reports/report/manage/[id]/route.ts` PUT: หลัง update สำเร็จ query `favorites.findMany({where: {report_id}})` → `createNotification` วนทุก `user_id` (ยกเว้นถ้าเป็นคนที่กำลังแก้ไขเอง — เช็ค `favorite.user_id !== authResult.user.id`)

**Files**: `app/api/reports/[id]/shares/route.ts` (แก้), `app/api/reports/report/manage/[id]/route.ts` (แก้)

### 4. UI — Notification Bell ใน navbar

`components/layouts/notification-bell.tsx` (ใหม่, client component, pattern เดียวกับ `user-nav.tsx`): `DropdownMenu` + bell icon + unread count badge, fetch `GET /api/notifications` ตอน mount และ poll ทุก 30s (`setInterval`, เบาสุดสำหรับ MVP ที่ยังไม่มี websocket/SSE) → คลิกรายการ → เรียก mark-read แล้ว refetch, ถ้ามี `link` ให้ navigate ไปด้วย

`components/layouts/navbar.tsx`: เพิ่ม `<NotificationBell />` ข้าง `<ModeToggle />`/`<UserNav />`

**Files**: `components/layouts/notification-bell.tsx` (ใหม่), `components/layouts/navbar.tsx` (แก้)

### Verification (3c)

- สร้าง share `type=USER` → user เป้าหมาย login แล้วเห็น notification ใหม่ใน bell, unread count +1
- แก้ไขรายงานที่มีคน favorite ไว้ 2 คน → ทั้ง 2 คนได้ notification `REPORT_UPDATED`, คนที่แก้ไขเอง (ถ้า favorite รายงานตัวเองด้วย) ไม่ได้รับ
- คลิก mark-read รายการเดียว → เฉพาะรายการนั้น `is_read=true`, unread count ลดลง 1
- user คนอื่น mark-read notification ที่ไม่ใช่ของตัวเอง (ยิง id ตรงๆ) → 404
- `npx tsc --noEmit` ไม่มี error ใหม่

## Sub-phase 3d (overview) — Dashboard & Activity Log

## Sub-phase 3d (overview) — Dashboard & Activity Log

- `GET /api/dashboard/summary`, `/trends`, `/top-reports` — aggregate count ตาม status/category/department, top-N download/view, ใช้ query จริงแทน placeholder
- แทนที่ `app/(auth)/dashboard/page.tsx` ทั้งหน้าด้วย stat cards + กราฟจริง (ใช้ `dataviz` skill ตอนสร้างกราฟ ตามที่ระบุไว้ใน system instructions)
- เติม filter ให้ endpoint audit log ที่มีอยู่ (by user/entity/date range) ตามที่ `feature-list.md` ระบุว่ายังไม่ครบ

## Sub-phase 3e (overview) — Settings (theme persistence)

- `GET/PUT /api/settings/theme` (หรือ key ทั่วไปใน `settings` table) ผูกกับ `next-themes` ที่มีอยู่แล้วฝั่ง client — เก็บค่าต่อ user (ต้องเพิ่ม `user_id` scoping ไม่ใช่ table `settings` แบบ global key/value เฉยๆ ถ้าต้องการ per-user — ตัดสินใจตอนถึงตา sub-phase นี้)
