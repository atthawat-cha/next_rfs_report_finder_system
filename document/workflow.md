# System Workflows — RFS Report Finder System

> อธิบาย workflow ของระบบทั้งหมดแบบ end-to-end ทั้งฝั่งธุรกิจ (business process) และฝั่งเทคนิค (ระบบ/ข้อมูลไหลผ่านจุดใดบ้าง) แต่ละ workflow อ้างอิง sequence/state diagram ที่ตรงกันใน [diagrams.md](./diagrams.md) เอกสารนี้ยึดสถานะปัจจุบันของโค้ด + ส่วนต่อขยายตาม roadmap ใน [new_requirement.md](00-new_requirement.md) และการออกแบบใน [system-design.md](01-system-design.md)
>
> สัญลักษณ์สถานะ: ✅ ทำงานได้จริงวันนี้ · ⚠️ มีบางส่วน/mock · ❌ ยังต้องสร้าง (workflow ที่อธิบายคือ workflow **เป้าหมาย** รวมทุกเฟส)

---

## 1. Authentication & Session Workflow — ⚠️

**Actors**: ผู้ใช้ทุกคน (user/admin/super_admin) · **Diagram**: [diagrams.md §4.1](./diagrams.md#41-sequence--login)

1. ผู้ใช้กรอก username/password ที่ `/login`
2. Client เรียก `POST /api/auth/login`
3. Route handler ตรวจ **rate limit** ก่อน (Redis `INCR` ตาม identifier) — ถ้าเกิน `MAX_ATTEMPTS` ภายใน `WINDOW_MS` → 429 พร้อม `retryAfter`
4. ค้นหา `users` ด้วย username → ถ้าไม่พบ หรือ `bcrypt.compare` ไม่ตรง → บันทึก `activity_logs` (`login_failed`) → 401
5. ถ้าเปิด **2FA** ไว้ (`two_factor_enabled=true`) → ต้องส่ง TOTP code ยืนยันในขั้นต่อไปก่อนจะออก session จริง (Phase 4)
6. ผ่านทุกด่าน → sign JWT (`jose`) บรรจุ `sub/role/departmentId` → set httpOnly cookie `auth-token` → reset rate-limit counter → บันทึก `activity_logs` (`login`) → response 200
7. Middleware (ทุก request ถัดไป) decode cookie → ถ้า path เป็น `/login` และ decode สำเร็จ → redirect `/dashboard`; ถ้า path ไม่ public และ decode ไม่สำเร็จ → redirect `/login?redirect=<path>`
8. Logout: `POST /api/auth/logout` → capture user ก่อนลบ cookie → บันทึก `activity_logs` (`logout`) → เคลียร์ cookie

**Edge cases ที่ต้อง handle**: Redis ล่ม → **fail open** (อนุญาต login ต่อ, log error) เพราะระบบภายในองค์กร rate-limit เป็นแค่ defense-in-depth ไม่ใช่ primary boundary; session หมดอายุกลางการใช้งาน → ทุก API เรียก 401 → frontend redirect ไป `/login` พร้อม `?redirect=` เดิม

---

## 2. Authorization Resolution Workflow (RBAC + Per-Report ACL) — ⚠️/❌

**Actors**: ระบบภายใน (ทุก request ที่แตะข้อมูลรายงาน) · **Diagram**: [diagrams.md §4.6](./diagrams.md#46-flowchart--permission-resolution)

มี 2 ชั้นที่ต้องผ่านคนละจุด:

1. **Route-tier (เมนู/ฟีเจอร์)** — ✅ มีอยู่แล้ว: `requireRole(req, routeAcceptted(access))` เช็คว่า role ของ user อยู่ใน allow-list ของ endpoint นั้นหรือไม่ (`admin`/`user`/`guest`) ผ่านไม่ได้ → 403 ทันที ไม่ต้องแตะ database ต่อ
2. **Report-tier (ต่อ 1 รายงาน)** — ❌ ยังไม่มี วางแผนให้ `lib/report-acl.ts` เป็นจุดตัดสินเดียว:
   - มี override รายบุคคล (`report_permissions` ที่ `subject_type=USER`) สำหรับ (report, user) นี้ไหม → ถ้ามี ใช้ค่านั้นเป็นตัวตัดสิน (ไม่ดู role ต่อ)
   - ไม่มี → มี override ระดับ role (`subject_type=ROLE`) ไหม → ถ้ามี ใช้ค่านั้น
   - ไม่มีทั้งคู่ → fallback ไปที่ `reports.access_level`: `PUBLIC` = มองเห็นได้ (view เท่านั้น), `RESTRICTED`/`PRIVATE` = ปฏิเสธโดย default
3. ผลลัพธ์เป็น object สิทธิ์ 6 ตัว: `can_view/can_edit/can_delete/can_favorite/can_export/can_print` — endpoint ที่เกี่ยวกับ action นั้นเช็ค flag ที่ตรงกันก่อนทำงานเสมอ (เช่น endpoint download เช็ค `can_export`/`can_view`)
4. หน้า list/search ที่ผู้ใช้ทั่วไปเห็น **ต้อง filter ที่ query level** ด้วยผลจากขั้นที่ 2 (ไม่ fetch ทุกแถวมาก่อนแล้วกรองใน frontend — เสี่ยงข้อมูลหลุด + performance)
5. Admin (`routeAcceptted('admin')`) **ข้าม** ชั้นที่ 2 ไปเลยโดยออกแบบ — แก้ metadata ได้ทุกรายงานไม่ว่าจะมี per-report ACL อย่างไร

---

## 3. Report Metadata Management Workflow (Admin CRUD) — ✅/⚠️

**Actors**: Admin/Super Admin · **Diagram**: [diagrams.md §4.3](./diagrams.md#43-sequence--report-create-with-file-upload--versioning)

### 3.1 Create (✅ มีอยู่แล้ว, ต้องต่อเติม output_type + ไฟล์แยกชนิด)
1. Admin เปิด `reports/report-create` → กรอก metadata (ชื่อ TH/EN, code, category, department, description, access_level)
2. เลือก **ประเภทผลลัพธ์รายงาน** (`output_type`) ก่อนอัปโหลดไฟล์ — เป็นตัวกำหนดว่าช่องอัปโหลดที่แสดงจะเป็นชุดไหน (ดู `system-design.md §3.9`):
   - **ใบพิมพ์ (`PRINT_FORM`)** → แสดง 2 ช่องอัปโหลด: ฟอร์มเปล่า (`BLANK_FORM`, pdf) และฟอร์มตัวอย่างที่กรอกข้อมูลแล้ว (`SAMPLE_FILLED_FORM`, pdf)
   - **รายงานข้อมูล (`DATA_REPORT`)** → แสดง 1 ช่องอัปโหลด: ไฟล์ตัวอย่างข้อมูล (`SAMPLE_DATA`, excel) ที่ใช้ทั้ง preview เป็นตารางและดาวน์โหลดตรง ๆ
   - **ไม่มีการอัปโหลดไฟล์ `.jasper` หรือไฟล์ต้นทางใด ๆ ที่ระบบต้อง render** — ทุกไฟล์ที่อัปโหลดเป็นไฟล์สำเร็จรูปที่ผู้ใช้จะได้เห็น/ดาวน์โหลดตรงตามที่อัปโหลดจริง
3. Client validate ด้วย `zod` (รวม validate ว่า file_kind ที่ส่งมาต้องตรงกับ `output_type`) → submit `multipart/form-data` ไป `POST /api/reports/report/manage`
4. Server: `requireRole('admin')` → validate ซ้ำ (`zod`) → สำหรับแต่ละไฟล์: sanitize filename → ตรวจ MIME ให้ตรงกับ `file_kind` (pdf สำหรับฟอร์ม, xlsx สำหรับข้อมูล) → (Phase 4) ClamAV scan → เขียนลง Object Storage → insert `report_files` (ต่อ Phase 2) พร้อม `reports` row หลัก
5. บันทึก `activity_logs` (`create`/`report`) → คืนรายงานที่สร้างแล้ว → redirect ไปหน้า list/detail

### 3.2 เพิ่มคิวรี่/ตัวแปร (❌ ยังไม่มี — Phase 2, applicable เฉพาะ `DATA_REPORT`)
1. Admin เปิดแท็บ "Queries" ในหน้าแก้ไขรายงาน → เพิ่มคิวรี่ใหม่ (ชื่อ, SQL text) → ติ๊ก "เป็นคิวรี่หลัก" ได้แค่ 1 รายการ — **คิวรี่นี้เป็นข้อมูลอ้างอิง/เอกสารเท่านั้น** ระบบไม่รันคิวรี่นี้เลย เก็บไว้เพื่อให้ reporter คนอื่นเห็นว่ารายงานนี้ดึงข้อมูลมาจาก query แบบไหน ก่อนจะไปสร้างรายงานใหม่ซ้ำ
2. Server บังคับด้วย partial unique index (`is_main=true` ต่อ `report_id` ได้แถวเดียว) — ถ้า client ส่งมาซ้ำ → 409 Conflict พร้อมข้อความชัดเจนให้ยกเลิกอันเดิมก่อน
3. เพิ่ม/แก้ตัวแปร (`report_variables`) — name, label, data_type, default_value, is_required เป็น list ที่แก้ได้แบบ inline table (เอกสารอ้างอิงเช่นเดียวกับคิวรี่)

### 3.3 กำหนดสิทธิ์ต่อรายงาน (❌ — Phase 2)
1. Admin เปิดแท็บ "Permissions" ของรายงาน → เพิ่มแถวใหม่: เลือก subject เป็น "ผู้ใช้คนนี้" หรือ "บทบาทนี้" → ติ๊ก flag 6 ตัว (view/edit/delete/favorite/export/print)
2. Save → `POST /api/reports/[id]/permissions` → บันทึกและ (Phase 3) trigger notification ไปยัง subject ว่า "คุณได้รับสิทธิ์เข้าถึงรายงาน X"

### 3.4 แก้ไข/ลบ (❌ ยังไม่มีหน้า edit)
- ต้องสร้างหน้า edit แยก (ปัจจุบันมีแค่ create) ที่โหลด metadata + ไฟล์ + คิวรี่ + ตัวแปรปัจจุบันมาแสดง, การแก้ไฟล์หลักหรือคิวรี่หลักต้อง trigger versioning workflow (§5) ไม่ overwrite ตรง ๆ

---

## 4. Report Discovery & Search Workflow (User) — ❌

**Actors**: User ทั่วไป · **Diagram**: [diagrams.md §4.2](./diagrams.md#42-sequence--report-search--acl-filter)

1. ผู้ใช้พิมพ์ในกล่องค้นหา → debounce 300ms → อัปเดต URL query string (`?q=...&category=...`) ไม่ยิงทุก keystroke
2. Client เรียก `GET /api/reports/browse?q=&category=&department=&tag=&status=&page=&pageSize=`
3. Server: `requireAuth` (ไม่ต้องเป็น admin) → รัน full-text query (Postgres `tsvector`/`pg_trgm`) รวมกับ filter ที่ส่งมา → **join กับผลจาก per-report ACL resolution** (workflow ที่ 2) เพื่อไม่ให้เห็นรายงานที่ไม่มีสิทธิ์เลย
4. คืนผลลัพธ์แบบ pagination พร้อม `meta.total/totalPages`
5. ผู้ใช้คลิกเข้าดูรายละเอียด → ปุ่ม/แท็บที่แสดงขึ้นอยู่กับ flag สิทธิ์ที่ resolve ได้ (ถ้า `can_export=false` ปุ่ม export จะไม่แสดงเลย ไม่ใช่แสดงแล้วกด error)
6. **Preview** (Should): คลิก "ดูตัวอย่าง" → รูปแบบขึ้นอยู่กับ `output_type` ของรายงาน (ไม่มี rendering engine ใด ๆ เกี่ยวข้อง — ดู `system-design.md §3.8`):
   - `PRINT_FORM` → เปิด PDF (`BLANK_FORM`/`SAMPLE_FILLED_FORM`) ใน viewer ของเบราว์เซอร์เอง (`<iframe>`/`<embed>` ชี้ signed URL) แบบ inline ในหน้าเดียวกัน
   - `DATA_REPORT` → `GET /api/reports/[id]/preview` อ่านไฟล์ `SAMPLE_DATA` (excel) จาก Object Storage → parse ด้วย `exceljs` (read mode) ฝั่ง server → คืน `{ columns, rows }` (จำกัดจำนวนแถว preview) → แสดงเป็นตารางด้วย `SharedDataTable`

---

## 5. File & Query Versioning Workflow — ⚠️/❌

**Actors**: Admin · **Diagram**: [diagrams.md §5.1](./diagrams.md#51-state--report-status-lifecycle)

1. Admin อัปโหลดไฟล์ใหม่ทับ (`BLANK_FORM`/`SAMPLE_FILLED_FORM`/`SAMPLE_DATA` ตาม `output_type`) หรือแก้คิวรี่หลักของรายงานที่มีอยู่แล้ว → ระบบ**ไม่ overwrite แถวเดิม**
2. สำหรับไฟล์: insert แถวใหม่ใน `report_versions` (มี schema แล้ว) พร้อม `version` ใหม่ (bump ตาม semver-like string), `change_log` ที่ admin กรอก, mark แถวเก่าเป็นไม่ current
3. สำหรับคิวรี่: insert แถวใหม่ใน `report_query_versions` (ตารางใหม่ Phase 2) ในลักษณะเดียวกัน
4. หน้า "Version History" (❌ ยังไม่มี UI แม้ schema มีแล้ว) แสดง timeline ของทุกเวอร์ชัน พร้อมปุ่ม "Rollback" — rollback = สร้าง version ใหม่ที่คัดลอกเนื้อหาของ version เก่ามาเป็น current ใหม่ (ไม่ใช่ลบของใหม่ทิ้ง เพื่อรักษาประวัติสมบูรณ์)
5. ทุกการสร้าง version บันทึก `activity_logs` (`update`/`report`, metadata ระบุ `from_version`/`to_version`)

---

## 6. Favorites Workflow — ⚠️

**Actors**: User · **Diagram**: —

1. ผู้ใช้กดไอคอนดาวที่การ์ด/แถวรายงาน (มี UI แล้วแต่ผูก mock data อยู่)
2. Client เรียก `POST /api/reports/favorites { report_id }` (ยังไม่มี endpoint จริงวันนี้)
3. Server ตรวจสิทธิ์ `can_favorite` จาก workflow ที่ 2 ก่อน insert (unique constraint `(user_id, report_id)` มีอยู่แล้วใน schema ป้องกันการกดซ้ำสร้างซ้ำ)
4. หน้า Favorites (`reports/favorites`) ต้องเปลี่ยนจากอ่าน `fakedata/fakeReportList.ts` → เรียก `GET /api/reports/favorites` จริง
5. ยกเลิกโปรด: `DELETE /api/reports/favorites/[reportId]`

---

## 7. Download / Export Workflow — ❌

**Actors**: User (และ Admin) · **Diagram**: [diagrams.md §4.4](./diagrams.md#44-sequence--download--export)

ไม่มีขั้นตอน render ใด ๆ ในเวิร์กโฟลว์นี้ — ทุกไฟล์เป็นไฟล์สำเร็จรูปที่ admin อัปโหลดไว้แล้ว server ทำหน้าที่แค่ตรวจสิทธิ์แล้ว **stream ไฟล์เดิมออกไปตรง ๆ**

1. ผู้ใช้กดปุ่มที่ตรงกับ `output_type` ของรายงาน: รายงาน `PRINT_FORM` เห็นปุ่ม "ดาวน์โหลดฟอร์มเปล่า" / "ดาวน์โหลดฟอร์มตัวอย่าง" / "พิมพ์"; รายงาน `DATA_REPORT` เห็นปุ่ม "ดาวน์โหลดไฟล์ Excel" / "พิมพ์ตารางที่ preview อยู่" (ปุ่มที่แสดงขึ้นอยู่กับ `output_type` และ flag สิทธิ์ที่ resolve ได้)
2. Server: resolve ACL (workflow 2) → ตรวจ flag ที่ตรงกับ action (`can_export` สำหรับดาวน์โหลดไฟล์ Excel/ฟอร์มตัวอย่าง, `can_print` สำหรับพิมพ์ฟอร์มเปล่า, `can_view` อย่างน้อยสำหรับดูรายงาน) และ `reports.is_downloadable`
3. ผ่าน → ดึงไฟล์ตัวจริงจาก Object Storage ผ่าน signed-URL proxy → **stream ไฟล์นั้นออกไปตรง ๆ** ไม่มีการแปลง/render รูปแบบใด ๆ (PDF ยังเป็น PDF เดิม, Excel ยังเป็น Excel เดิมที่อัปโหลดไว้)
4. Stream ผลลัพธ์กลับ → **atomic** `UPDATE reports SET download_count = download_count + 1` (ไม่ read-modify-write ใน application code เพื่อกัน race condition เวลามีคนโหลดพร้อมกันหลายคน)
5. Insert แถวใหม่ใน `downloads` (`user_id, report_id, ip_address, user_agent`) → บันทึก `activity_logs`
6. **การพิมพ์** ไม่ผ่าน endpoint ดาวน์โหลดเสมอไป: พิมพ์ PDF ใช้ปุ่มพิมพ์ในตัวของ browser PDF viewer; พิมพ์ตาราง `DATA_REPORT` ใช้ `window.print()` ฝั่ง client บนตารางที่ preview อยู่ (มี CSS `@media print` จัดรูปแบบ) — ทั้งสองกรณีไม่มี backend call เพิ่มเติมสำหรับ "พิมพ์" เอง แต่ถ้าต้องการนับเป็นการ export ให้เรียก endpoint ดาวน์โหลดก่อนแล้วค่อยพิมพ์จากไฟล์ที่โหลดมา

---

## 8. Report Sharing Workflow — ❌

**Actors**: Admin/Report Owner, ผู้รับแชร์ · **Diagram**: [diagrams.md §4.5](./diagrams.md#45-sequence--report-sharing)

1. Admin เปิดแท็บ "Share" ของรายงาน → เลือกวิธีแชร์: `USER` (ระบุผู้รับ), `DEPARTMENT` (ทั้งแผนก), หรือ `LINK` (สร้างลิงก์สาธารณะภายในที่มี token)
2. กำหนด `can_download`, `can_edit`, `expires_at` (optional)
3. `POST /api/reports/[id]/shares` → insert `report_shares` (schema มีอยู่แล้ว) → ถ้าเป็น `LINK` generate `share_token` แบบสุ่มปลอดภัย (ไม่เดาได้)
4. (Phase 3) trigger notification ไปยังผู้รับถ้าเป็น `USER`/`DEPARTMENT`
5. ผู้รับเข้าผ่าน `GET /api/shares/[token]` (สำหรับ LINK) → ตรวจ `expires_at` ยังไม่หมด → ตรวจ `can_download`/`can_edit` ก่อนแสดง action ที่เกี่ยวข้อง
6. Background job รายชั่วโมง (BullMQ) กวาดลบ/ปิดใช้งานลิงก์ที่ `expires_at` ผ่านไปแล้ว

---

## 9. Notification Workflow — ❌

**Actors**: ระบบ (producer), User (consumer) · **Diagram**: —

**Producer events** (แต่ละอันเรียก `lib/notify.ts` หลัง mutation สำเร็จ):
- รายงานใหม่ที่ผู้ใช้อาจสนใจ (`REPORT_NEW`) — ตาม department/role ที่เกี่ยวข้อง
- ถูกแชร์รายงาน (`REPORT_SHARED`)
- รายงานที่ใช้บ่อยถูกแก้ไข (`REPORT_UPDATED`)
- รายงาน/ลิงก์แชร์ใกล้หมดอายุ (`REPORT_EXPIRING`) — จาก cron sweep รายวัน
- เหตุการณ์ระบบ: พื้นที่จัดเก็บใกล้เต็ม (`SYSTEM_STORAGE_LOW`), แจ้งปิดปรับปรุง (`SYSTEM_MAINTENANCE`)
- เหตุการณ์บัญชีผู้ใช้: สร้างบัญชีใหม่ (`USER_CREATED`), เปลี่ยนรหัสผ่าน (`PASSWORD_CHANGED`), สิทธิ์เปลี่ยน (`PERMISSION_CHANGED`), บัญชีถูกระงับ (`ACCOUNT_SUSPENDED`)

**Consumer**: กระดิ่งแจ้งเตือนใน navbar → `GET /api/notifications` (unread count + list) → คลิกอ่าน → `POST /api/notifications/[id]/read` → mark `is_read=true`, `read_at=now()`. Email เป็น consumer เสริม (BullMQ worker ส่ง SMTP) สำหรับ severity สูง (เช่น `ACCOUNT_SUSPENDED`)

---

## 10. Activity Log / Audit Trail Workflow — ⚠️

**Actors**: ระบบ (ทุก mutation), Admin (ผู้ดู log) · **Diagram**: —

1. ทุก route handler ที่ mutate ข้อมูล (create/update/delete บน reports, users, roles, permissions, categories, tags, departments) และทุก auth event (login/login_failed/logout) เรียก `logActivity(req, {...})` **หลัง** action หลักสำเร็จ (หรือหลัง transaction commit ถ้าอยู่ใน `$transaction`)
2. `logActivity` เขียนแบบ fire-and-forget-safe: ถ้าเขียนไม่สำเร็จ log error ไว้เฉย ๆ ไม่ throw ทำให้ response หลักพัง
3. Admin เปิดหน้า `user-management/activity` → เรียก `GET /api/activity-logs?user=&entity=&entityId=&from=&to=&page=` → filter/paginate จริง (หน้ามีอยู่แล้วแต่ต้องต่อ endpoint ที่ filter ได้จริง ไม่ใช่แค่ list ดิบ)
4. แสดงผลเป็นตาราง: เวลา, ผู้ทำ, การกระทำ, entity ที่กระทบ, IP, user agent, รายละเอียดเพิ่มเติมจาก `metadata`

---

## 11. Dashboard & Usage Analytics Workflow — ❌

**Actors**: Admin (และอาจรวม user เห็นสถิติของตนเอง) · **Diagram**: —

1. หน้า dashboard เรียกหลาย endpoint พร้อมกัน (parallel fetch): `GET /api/dashboard/summary` (จำนวนรวม/แยกสถานะ/หมวดหมู่/แผนก), `GET /api/dashboard/top-reports` (ดาวน์โหลด/เข้าชมสูงสุด), `GET /api/dashboard/trends?range=30d` (กราฟรายวัน/รายเดือน), พื้นที่จัดเก็บที่ใช้ไป (รวม `file_size` จาก `report_files`)
2. ค่าที่คำนวณหนัก (เช่น storage usage รวมทุกไฟล์) แคชไว้ใน Redis หรือคำนวณล่วงหน้าด้วย cron รายวันแล้วเก็บผลสรุปไว้ ไม่คำนวณสดทุกครั้งที่เปิดหน้า dashboard
3. แสดงผลด้วยกราฟ (แนะนำ `recharts` หรือไลบรารีที่ทำงานร่วมกับ shadcn/ui ได้ดี) — ตัวเลข top-line เป็น stat card, แนวโน้มเป็น line/area chart

---

## 12. User / Department / Role Management Workflow — ✅

**Actors**: Admin/Super Admin · มีอยู่แล้วครบ CRUD พื้นฐาน — flow มาตรฐาน: list (`*-list`) → form (create/edit) → validate (`zod`) → submit → `requireRole('admin')` → mutate → `logActivity` → refresh list ปรับปรุงเดียวที่ต้องทำ: ปิดช่องโหว่ auth-guard ที่ขาดใน `POST /api/users/user` และ `POST /api/users/user/update` (ดู `system-design.md §3.1`)

---

## 13. Settings Workflow (Auth Provider / Storage / Preferences) — ❌

**Actors**: Super Admin · **Diagram**: —

1. Super Admin เปิดหน้า Settings → เลือกวิธียืนยันตัวตน (Local DB / External API / Email OTP) → เลือก provider เก็บเป็น key ใน `settings` (`auth.provider = "local_db" | "external_api" | "email_otp"`)
2. `lib/auth.ts` อ่านค่านี้ (แคชสั้น ๆ ใน Redis เพื่อไม่ query DB ทุก login) แล้ว dispatch ไปยัง `AuthProvider` implementation ที่ตรงกัน
3. ตั้งค่าอื่น ๆ ในรูปแบบเดียวกัน: storage backend (`storage.driver = "local" | "minio" | "s3"`), ธีม default องค์กร, ขนาดไฟล์อัปโหลดสูงสุดต่อ `file_kind`
4. ทุกการเปลี่ยน settings บันทึก `activity_logs` (`update`/`settings`) เพราะเป็น config ที่กระทบทั้งระบบ ความเปลี่ยนแปลงต้อง traceable

---

## Workflow Ownership Map (สรุปว่าใครแก้ workflow ไหน)

| Workflow | Owner ฝั่งโค้ด | Phase |
|---|---|---|
| Auth & Session | `lib/auth.ts`, `middleware.ts`, `app/api/auth/*` | 0 (fix) → 4 (2FA/pluggable) |
| Authorization Resolution | `lib/report-acl.ts` (ใหม่) | 2 |
| Report Metadata CRUD | `app/(auth)/reports/report-create|report-list`, `app/api/reports/report/manage/*` | ✅ → 2 (files/queries/vars/ACL) |
| Discovery & Search | `components/shared/searchInput.tsx`, `app/api/reports/browse` (ใหม่) | 1 |
| Versioning | `report_versions` (มี), `report_query_versions` (ใหม่), UI ใหม่ | 3 |
| Favorites | `app/(auth)/reports/favorites`, `app/api/reports/favorites` (ใหม่) | 1 |
| Download/Export | `app/api/reports/[id]/download*` (ใหม่), `lib/preview.ts` (excel parse), signed-URL proxy — ไม่มี rendering microservice | 1/2 |
| Sharing | `app/api/reports/[id]/shares` (ใหม่) | 3 |
| Notifications | `lib/notify.ts` (ใหม่), `app/api/notifications` (ใหม่) | 3 |
| Activity Log | `lib/activity-log.ts` (ใหม่), `app/(auth)/user-management/activity` | 0 |
| Dashboard | `app/(auth)/dashboard`, `app/api/dashboard/*` (ใหม่) | 3 |
| User/Dept/Role Mgmt | `app/(auth)/user-management/*`, `app/(auth)/role-management/*` | ✅ |
| Settings | `app/(auth)/settings` (ใหม่), `app/api/settings` (ใหม่) | 3/4 |
