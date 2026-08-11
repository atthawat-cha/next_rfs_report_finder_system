# New Requirement — RFS Report Finder System

> เอกสารนี้ต่อยอดจาก `document/requrisement.md` (โจทย์ต้นฉบับ) โดยวิเคราะห์ร่วมกับสถานะจริงของโค้ดในระบบ ณ วันที่ 2026-08-10 เพื่อ (1) เติมช่องว่างของ requirement เดิม (2) ระบุว่าอะไรทำแล้ว/ทำครึ่งเดียว/ยังไม่ทำ (3) เสนอ tech stack ที่เหมาะสม และ (4) เสนอ roadmap การพัฒนาต่อ
>
> **Correction (2026-08-11)**: ระบบนี้**ไม่ต้อง**อ่าน/render ไฟล์ `.jasper` เอง — ต้นทางรายงานอาจสร้างด้วย JasperReports ที่อื่น แต่สิ่งที่ระบบนี้จัดเก็บ/แสดงผล/ให้ดาวน์โหลด/พิมพ์ คือ**ไฟล์ผลลัพธ์ที่ admin อัปโหลดเข้ามาโดยตรง** (PDF สำหรับใบพิมพ์, Excel สำหรับรายงานข้อมูล) ดูรายละเอียดโมเดลที่แก้ไขแล้วใน [system-design.md §3.8-3.9](./system-design.md#38-preview-download--print-design-no-rendering-engine) — ทุกจุดที่กล่าวถึง "JasperReports rendering microservice" ในเอกสารนี้ (เดิม) **ถูกยกเลิก** ไม่ใช่ tech stack ที่ต้องสร้างอีกต่อไป

---

## 1. สรุปปัญหาเดิม (Background)

ผู้ใช้งานหลัก (reporter) สร้างและดูแลรายงานจำนวนมาก โดยรายงานต้นทางสร้างด้วย **JasperReports (`*.jasper`)** และแสดงผลได้ทั้งบนหน้า UI, export เป็น Excel และ PDF เมื่อจำนวนผู้ใช้ ผู้ใช้งานหลายแผนก และจำนวนรายงานเพิ่มขึ้น เกิดปัญหา:

- ไม่มีที่ค้นหารายงานที่มีอยู่แล้วได้ง่าย ทำให้มีการสร้างรายงานซ้ำ/ใกล้เคียงของเดิมโดยไม่รู้ตัว
- ไม่มีการควบคุมสิทธิ์การเข้าถึงรายงานแบบละเอียด (รายบุคคล/รายบทบาท)
- ไม่มีระบบเวอร์ชันของไฟล์/คิวรี่ ทำให้ตามรอยการเปลี่ยนแปลงยาก
- ไม่มี audit log และ dashboard สรุปการใช้งาน

**เป้าหมายของระบบ**: เป็นศูนย์กลาง (single source of truth) สำหรับค้นหา จัดเก็บ จัดหมวดหมู่ และควบคุมสิทธิ์การเข้าถึงรายงานทั้งหมดขององค์กร ลดการสร้างรายงานซ้ำซ้อน และให้ผู้ดูแลระบบมองเห็นภาพรวมการใช้งานได้

---

## 2. ขอบเขตผู้ใช้งาน (User Roles)

จาก schema ปัจจุบัน (`prisma/schema.prisma`) มี `roles` เป็นตารางแยก ไม่ผูกตายตัวกับโค้ด แต่โดย convention ที่ใช้จริงใน `lib/auth.ts` (`routeAcceptted`) มี 3 กลุ่มสิทธิ์หลัก:

| Role (name จริงใน DB) | คำอธิบาย | อิงจาก |
|---|---|---|
| `super_admin` | สิทธิ์สูงสุด เข้าถึงทุกฟังก์ชัน | `routeAcceptted` |
| `admin` | จัดการรายงาน/หมวดหมู่/แท็ก/ผู้ใช้ในขอบเขตที่ได้รับ | `routeAcceptted` |
| `user` | ค้นหา/ดู/ดาวน์โหลดรายงานตามสิทธิ์ที่ได้รับ | `routeAcceptted` |
| `guest` | (ประกาศไว้ใน `routeAcceptted` แต่ยังไม่มี path ไหนใช้จริง) | — |

**ข้อเสนอเพิ่ม**: ควรนิยามบทบาทให้ชัดเจนกว่านี้ตาม requirement เดิมที่พูดถึง "แผนก" เป็นหน่วยสำคัญ:

- **Reporter / Report Owner** — ผู้สร้าง/แก้ไขรายงานของตัวเอง (อาจไม่ใช่ admin เต็มระบบ แต่เป็นเจ้าของ record นั้น ๆ) — ปัจจุบันยังไม่มีแนวคิด "เจ้าของรายงานที่ไม่ใช่ admin" แยกจากกัน ทุกอย่างผูกกับ `routeAcceptted('admin')` เท่านั้น
- **Department Approver** (optional, phase หลัง) — อนุมัติการเผยแพร่รายงานของแผนกตนเองก่อน publish จริง
- **Viewer/User** — ตามเดิม
- **Super Admin** — ตามเดิม

---

## 3. สถานะปัจจุบันของระบบ (Gap Analysis จากการอ่านโค้ดจริง)

ส่วนนี้สำคัญที่สุด เพราะโจทย์เดิมเขียนในเชิง "อยากได้อะไร" แต่ในโค้ดมีการเริ่มพัฒนาไปแล้วบางส่วน จึงต้องรู้ว่าอะไร "เสร็จจริง", "มี UI แต่ยังไม่ผูก backend จริง (mock/stub)", และ "ยังไม่มีเลย"

### ✅ ทำแล้ว (มี schema + API + UI ใช้งานได้จริง)
- Authentication ด้วย JWT (`jose`) + httpOnly cookie, bcrypt hash password
- RBAC พื้นฐาน: `users → roles`, `role_permissions → permissions → menus`
- CRUD หมวดหมู่ (`categories`) และแท็ก (`tags`) พร้อมตาราง/ฟอร์ม
- สร้างรายงานพร้อมอัปโหลดไฟล์ (`app/(auth)/reports/report-create`, `api/reports/report/manage`)
- รายชื่อรายงานพื้นฐาน (`report-list`) ดึงจาก API จริง
- User / Department / Role management (list, form, table)
- Sidebar/menu, theme switch (dark/light) ผ่าน `next-themes`

### ⚠️ มี UI/Schema แต่ยังไม่สมบูรณ์ หรือใช้ข้อมูลปลอม (mock)
- **หน้า Favorites** (`app/(auth)/reports/favorites/page.tsx`) — ยังดึงจาก `fakedata/fakeReportList.ts` ไม่ได้ผูกกับตาราง `favorites` จริงหรือ API ใด ๆ
- **ช่องค้นหา (Search)** — มีคอมโพเนนต์ `SearchInput` ในหลายหน้า (`report-list`, `favorites`) แต่ handler `hanelerSearch` เป็นฟังก์ชันว่างเปล่า/แค่ `console.log` ไม่มีการ filter จริงทั้งฝั่ง client และ server
- **Dashboard** (`app/(auth)/dashboard/page.tsx`) — เป็นหน้า placeholder ล้วน ๆ ไม่มีสถิติ/กราฟการใช้งานตามที่ requirement ต้องการ ("มี dashboard แสดงถึงการใช้งานรายงาน")
- **สิทธิ์รายรายงาน (per-report access control)** — ตอนสร้างรายงานเลือกได้แค่ "access_level" เป็น list ของ role name ธรรมดา ยังไม่รองรับการกำหนดสิทธิ์แบบละเอียด (view/edit/delete/favorite/export/print) ต่อ 1 รายงาน ต่อ "รายบุคคล" ตามที่ requirement ระบุไว้ชัดเจน — ตาราง `role_permissions` ปัจจุบันผูกกับ `menus`/`permissions` (สิทธิ์ระดับเมนู) ไม่ใช่สิทธิ์ระดับ "รายงานแต่ละรายการ"
- **Middleware auth guard** — `protectedPaths` ใน `middleware.ts` อ้าง path แบบ `/(auth)/dashboard` ซึ่งไม่ตรงกับ pathname จริงหลัง Next.js ตัด route group ออก (ดู `CLAUDE.md`) กติกาการป้องกันหน้าที่ทำงานจริงอยู่ที่ `matcher` เท่านั้น ต้องรื้อ logic นี้ใหม่ให้ตรงเจตนา
- Cookie name ไม่ตรงกันระหว่าง `lib/auth.ts` (`auth-token`) กับ log/คอมเมนต์ใน `middleware.ts` (`auth_token`) — ความเสี่ยงที่จะสร้าง bug ซ้ำถ้าใครอ้างชื่อผิด

### ❌ ยังไม่มีเลย (มีอยู่ใน requirement เดิม แต่ไม่มีทั้ง schema และ UI)
1. **คิวรี่ของรายงาน (report queries)** — requirement ระบุชัดว่า 1 รายงานมีคิวรี่ได้หลายชุด และเป็น "คิวรี่หลัก" ได้ 1 ชุดเท่านั้น ปัจจุบัน**ไม่มีตารางนี้ใน schema เลย**
2. **ตัวแปรของรายงาน (report variables)** — เช่นเดียวกัน ไม่มีตารางเก็บ parameter/variable ที่ใช้ในรายงานแต่ละตัว
3. **การแยกประเภทไฟล์แนบตามชนิด และตามประเภทรายงาน** — requirement ต้องการแยกชัดเจนตาม `output_type` ของรายงาน: รายงานแบบ **ใบพิมพ์ (`PRINT_FORM`)** ต้องมี (ก) ฟอร์มเปล่า pdf และ (ข) ฟอร์มตัวอย่างที่กรอกข้อมูลแล้ว pdf; รายงานแบบ **ข้อมูล (`DATA_REPORT`)** ต้องมี (ค) ไฟล์ Excel ตัวอย่างข้อมูลที่ preview เป็นตารางในระบบได้และดาวน์โหลดตรง ๆ ได้ — ไม่มีขั้นตอน render ไฟล์ `.jasper` ใด ๆ ในระบบนี้ ปัจจุบัน `reports` มีแค่ฟิลด์ไฟล์เดียว (`file_path/file_name/file_type/file_size`) และฟอร์ม create ก็รับไฟล์แบบ "attachments" รวมกันหมดไม่แยกชนิด
4. **Preview ตัวอย่างข้อมูล / Export ตัวอย่างข้อมูล** — ยังไม่มีทั้ง UI preview และ endpoint export
5. **ดาวน์โหลดฟอร์มเปล่า** — ยังไม่มี endpoint/ปุ่มแยกต่างหาก
6. **Version control ของไฟล์และคิวรี่** — มีตาราง `report_versions` ใน schema (เก็บ version ของไฟล์ได้) แต่**ไม่มี UI ใด ๆ** ที่อ่าน/เขียนตารางนี้ และไม่มีแนวคิด versioning ของ "คิวรี่" เลย (เพราะยังไม่มีตาราง query)
7. **Report sharing** — มีตาราง `report_shares` (share by user/department/link, expiry) แต่**ไม่มี UI หรือ API route ใด ๆ** เรียกใช้ตารางนี้
8. **Notifications** — มีตาราง `notifications` + enum ชนิดการแจ้งเตือนครบ แต่**ไม่มี UI/endpoint**
9. **Activity log แสดงผล** — มีตาราง `activity_logs` และมีหน้า `user-management/activity/page.tsx` แต่ต้องตรวจสอบว่ามีการ **insert log จริงจากทุก action** (create/update/delete) หรือยัง — จากที่อ่าน route handlers ที่มี (`reports/report/manage`) ไม่พบการเขียนลง `activity_logs` เลยแม้แต่จุดเดียว
10. **Support ticket** — มีตาราง `support_tickets` แต่ไม่มี route/page ใด ๆ อ้างถึง (อาจไม่ใช่ scope MVP แต่ทิ้ง schema ไว้เฉย ๆ ควรตัดสินใจว่าจะทำต่อหรือลบทิ้ง)
11. **การตั้งค่าวิธี login แบบเลือกได้ (API / Database / Email)** — requirement ข้อ 3 ระบุชัด ปัจจุบันระบบ auth เป็น hard-coded เส้นทางเดียว (username+password ในตาราง `users`) ไม่มี abstraction ใด ๆ ที่สลับ provider ได้ และไม่มีตาราง `settings` ถูกใช้เพื่อเก็บ config นี้เลยทั้งที่ตาราง `settings` (key/value) มีอยู่แล้ว
12. **2FA** — มีคอลัมน์ `two_factor_enabled`/`two_factor_secret` ใน `users` แต่ไม่มี logic ใด ๆ เปิดใช้งานจริง
13. **Rate limiter ใช้ in-memory `Map`** (`lib/auth.ts` — `loginAttempts`) — ใช้ได้เฉพาะ instance เดียว ถ้า deploy หลาย instance/serverless จะไม่ sync กัน ต้องย้ายไป shared store (Redis) ก่อนขึ้น production จริงที่มี concurrency

---

## 4. Functional Requirements (ฉบับปรับปรุง)

จัดลำดับความสำคัญแบบ MoSCoW (Must / Should / Could) และระบุสถานะปัจจุบันกำกับไว้ (✅/⚠️/❌ อ้างอิงหัวข้อ 3)

### FR-1 Authentication & Session — ⚠️ (มีพื้นฐาน, ขาด pluggable provider + 2FA)
- **Must**: Login ด้วย username/password ผ่าน DB (มีแล้ว), session หมดอายุอัตโนมัติ, logout เคลียร์ cookie (มีแล้ว)
- **Must**: แก้ไข rate-limit ให้ทำงานถูกต้องข้าม instance (ปัจจุบันเป็น in-memory)
- **Should**: รองรับตั้งค่าวิธียืนยันตัวตนได้จากหน้า Settings — เลือกได้ระหว่าง Local DB / External API (เช่น LDAP/SSO ภายในองค์กร) / Email OTP (passwordless)
- **Could**: 2FA (TOTP) โดยใช้คอลัมน์ที่มีอยู่แล้วในตาราง `users`

### FR-2 Authorization / RBAC — ⚠️ (มีระดับเมนู, ขาดระดับ "รายรายงาน")
- **Must**: สิทธิ์ระดับเมนู/ฟีเจอร์ (มีโครงแล้ว: `role_permissions`)
- **Must**: สิทธิ์ระดับ "1 รายงาน" แยกตาม (ก) รายบุคคล (ข) รายบทบาท ครอบคลุมการกระทำ: view / edit / delete / favorite / export / print — **ต้องเพิ่มตารางใหม่** เช่น `report_permissions` (report_id, subject_type: USER|ROLE, subject_id, can_view, can_edit, can_delete, can_favorite, can_export, can_print)
- **Should**: ผู้ใช้เห็นเฉพาะรายงานที่ตนมีสิทธิ์ `can_view = true` เท่านั้นในทุกหน้า list/search (ปัจจุบัน `GET /api/reports/report/manage` คืนทุกรายงานให้ผู้ใช้ที่เป็น `admin` เท่านั้น ยังไม่มี endpoint สำหรับผู้ใช้ทั่วไปที่กรองตามสิทธิ์)

### FR-3 Report Metadata Management (CRUD) — ✅/⚠️
- **Must**: เพิ่ม/แก้ไข/ลบรายงาน พร้อม metadata (ชื่อ, รหัส, หมวดหมู่, แผนก, สถานะ, คำอธิบาย) — มีแล้วสำหรับ "เพิ่ม", ต้องเติมหน้า "แก้ไข/ลบ" (ยังไม่พบหน้า edit ในโค้ด)
- **Must**: แต่ละรายงานมี `output_type` เป็น `PRINT_FORM` (ใบพิมพ์) หรือ `DATA_REPORT` (รายงานข้อมูล) เพื่อกำหนดชุดไฟล์แนบที่ต้องมี — `PRINT_FORM` ต้องมี `BLANK_FORM` (pdf ฟอร์มเปล่า) + `SAMPLE_FILLED_FORM` (pdf ฟอร์มตัวอย่างที่กรอกข้อมูลแล้ว); `DATA_REPORT` ต้องมี `SAMPLE_DATA` (ไฟล์ Excel ที่ทั้งใช้ preview เป็นตารางในระบบและดาวน์โหลดได้ตรง ๆ) — **ไม่มีไฟล์ `.jasper` หรือ engine render ใด ๆ ในระบบนี้** ทุกไฟล์เป็นผลลัพธ์สำเร็จรูปที่ admin อัปโหลดเข้ามาเอง — ต้องปรับ schema `reports` เพิ่มคอลัมน์ `output_type` และแยกเป็นตาราง `report_files` (report_id, file_kind: BLANK_FORM|SAMPLE_FILLED_FORM|SAMPLE_DATA, file_path, file_name, file_size, version)
- **Should**: เพิ่มรายการ "ตัวแปรที่ใช้ในรายงาน" ผ่านตาราง `report_variables` (report_id, name, label, data_type, default_value, is_required)
- **Should**: เพิ่มรายการ "คิวรี่ที่ใช้ในรายงาน" ผ่านตาราง `report_queries` (report_id, name, sql_text, is_main: boolean, created_by, version) — บังคับด้วย logic/DB constraint ว่า `is_main = true` ได้แค่ 1 แถวต่อ report_id (partial unique index)

### FR-4 Versioning (ไฟล์ + คิวรี่) — ⚠️ (มี schema ไฟล์บางส่วน, ไม่มี UI, ไม่มี version คิวรี่)
- **Must**: ทุกครั้งที่แก้ไขไฟล์รายงานหรือคิวรี่หลัก ต้องสร้าง version ใหม่ ไม่ overwrite ของเดิม (ตาราง `report_versions` มีแล้ว, ต้องขยายให้ครอบคลุม query version ด้วย หรือสร้างตาราง `report_query_versions` แยก)
- **Should**: หน้า UI ดู/เปรียบเทียบ/rollback เวอร์ชันย้อนหลัง

### FR-5 Report Discovery & Search — ❌ (มีแค่ input กล่องเปล่า)
- **Must**: ค้นหาด้วยชื่อ/รหัส/คำอธิบาย/แท็ก (full-text, รองรับภาษาไทย+อังกฤษ) ต่อจาก `SearchInput` ที่มีอยู่แล้วในหลายหน้า ให้ยิง query จริงไปที่ backend
- **Must**: กรองผลลัพธ์ตาม category / department / tag / status
- **Should**: Preview ตัวอย่างข้อมูล/หน้าตารายงานก่อนดาวน์โหลด
- **Could**: ค้นหาแบบ fuzzy/typo-tolerant (ดูหัวข้อ tech stack เรื่อง search engine)

### FR-6 Favorites — ⚠️ (มี schema, ไม่มี API, หน้า UI ใช้ mock)
- **Must**: เพิ่ม/ลบรายการโปรด เขียนลงตาราง `favorites` จริง ผ่าน endpoint ใหม่ (`POST/DELETE /api/reports/favorites`)
- **Must**: หน้า Favorites ดึงจาก endpoint จริงแทน `fakedata/fakeReportList.ts`

### FR-7 Download / Export — ❌
- **Must**: ดาวน์โหลดไฟล์รายงาน (ตรวจสิทธิ์ + `is_downloadable` ก่อนเสมอ), บันทึกลง `downloads` ทุกครั้ง (ตารางมีอยู่แล้วแต่ยังไม่มีจุดเขียน)
- **Must**: Export ตัวอย่างข้อมูลเป็น Excel/PDF
- **Must**: ดาวน์โหลดฟอร์มเปล่า (pdf) แยกจากไฟล์รายงานหลัก
- **Should**: นับ `download_count` / `view_count` บนตาราง `reports` แบบ atomic increment (คอลัมน์มีอยู่แล้วแต่ยังไม่พบจุด update)

### FR-8 Report Sharing — ❌ (มี schema เฉย ๆ)
- **Should**: แชร์รายงานให้ user/department อื่น หรือสร้างลิงก์แชร์ (มี `share_token`, `expires_at` ในตารางแล้ว) พร้อมสิทธิ์ download/edit ที่กำหนดได้

### FR-9 Notifications — ❌ (มี schema เฉย ๆ)
- **Should**: แจ้งเตือนเมื่อมีรายงานใหม่/ถูกแชร์/ถูกแก้ไข/ใกล้หมดอายุ, แจ้งเตือนระบบ (พื้นที่จัดเก็บใกล้เต็ม ฯลฯ) — enum ครบแล้วใน schema รอแค่ producer (ฝั่ง backend เขียน) และ consumer (UI แสดงกระดิ่งแจ้งเตือน)

### FR-10 Activity Log / Audit Trail — ⚠️
- **Must**: ทุก mutation (create/update/delete ของ reports, users, roles, permissions, categories, tags) ต้อง insert `activity_logs` — ปัจจุบันยังไม่มีจุดไหน insert เลยแม้แต่จุดเดียว ควรทำเป็น middleware/helper กลาง (`logActivity(...)`) เรียกจากทุก route handler แทนเขียนซ้ำ
- **Should**: หน้า audit log filter ตาม user / entity / วันที่

### FR-11 Dashboard & Usage Analytics — ❌ (placeholder ล้วน)
- **Must**: สรุปจำนวนรายงานทั้งหมด, แยกตามสถานะ/หมวดหมู่/แผนก, รายงานที่ถูกดาวน์โหลด/เข้าชมมากสุด, พื้นที่จัดเก็บที่ใช้ไป
- **Should**: กราฟแนวโน้มการใช้งานรายวัน/รายเดือน

### FR-12 User & Department Management — ✅
- มีอยู่แล้วครบระดับ CRUD พื้นฐาน

### FR-13 System Settings — ❌ (ตาราง `settings` มีแต่ไม่ถูกใช้)
- **Should**: หน้า settings อ่าน/เขียนตาราง `settings` (key/value) จริง — ธีม (มีแล้วฝั่ง client ด้วย next-themes แต่ยังไม่ persist ต่อ user ใน DB), การตั้งค่าวิธี login, การตั้งค่าพื้นที่จัดเก็บไฟล์, ฯลฯ

### FR-14 Support Ticket — ❌ (Could, ตัดสินใจ scope)
- ตัดสินใจว่าจะพัฒนาต่อ (ผู้ใช้แจ้งปัญหา/ขอรายงานใหม่ผ่านระบบ ticket) หรือจะลบตารางทิ้งถ้าไม่อยู่ใน scope

---

## 5. Non-Functional Requirements

| หัวข้อ | รายละเอียด | สถานะ |
|---|---|---|
| **Security** | ป้องกัน OWASP Top 10 พื้นฐานมีแล้วบางส่วน (httpOnly cookie, bcrypt, zod validation, rate limit เบื้องต้น) — ยังขาด: virus scan ไฟล์อัปโหลด, CSRF protection บน form ที่ไม่ใช่ JSON, security header (CSP/HSTS) ผ่าน `next.config.js`, secret rotation policy | ⚠️ |
| **Performance** | ยังไม่มี pagination บน list รายงาน/ผู้ใช้ (โหลดทั้งหมดมาแสดงในครั้งเดียว) จะมีปัญหาเมื่อข้อมูลเยอะขึ้นตามที่โจทย์ระบุ (“รายงานเยอะขึ้น หลายแผนก”) | ❌ |
| **Scalability** | Rate limiter + ไฟล์เก็บใน `public/` local disk ไม่รองรับ multi-instance/serverless — ต้องแก้ก่อนขยายสเกล | ⚠️ |
| **Availability/Backup** | ยังไม่มีนโยบาย backup ฐานข้อมูล/ไฟล์ที่ระบุในเอกสาร | ❌ |
| **i18n** | schema รองรับ `name_th`/`name_en` คู่กันแล้วในตาราง `reports` แต่ UI ปัจจุบันเป็นภาษาอังกฤษ+ไทยปนกันไม่ทั่วถึง ควรทำ i18n ให้เป็นระบบ (`next-intl`) | ⚠️ |
| **Observability** | ไม่มี structured logging/error tracking นอกจาก `console.log` | ❌ |
| **Testing** | ไม่มี automated test ในโปรเจกต์เลย | ❌ |

---

## 6. Tech Stack ที่แนะนำ

### สิ่งที่ใช้อยู่แล้วและควร**เก็บไว้** (เหมาะสมดีแล้ว)
- **Next.js 14 (App Router) + React 18 + TypeScript** — เหมาะกับงาน internal tool ที่มีทั้งหน้าเว็บและ API ในโปรเจกต์เดียว
- **Tailwind CSS + shadcn/ui (new-york style)** — ให้ความเร็วในการสร้าง UI ตาราง/ฟอร์มจำนวนมากซึ่งเป็นงานหลักของระบบนี้
- **Prisma 7 + PostgreSQL** (`@prisma/adapter-pg`) — เหมาะกับ relational data ที่ซับซ้อน (reports ↔ categories ↔ tags ↔ permissions ↔ versions) และ PostgreSQL รองรับ full-text search + JSON ในตัวซึ่งจะได้ใช้ต่อ
- **jose (JWT) + bcryptjs** — เพียงพอสำหรับ auth แบบ credential-based ปัจจุบัน ไม่จำเป็นต้องเปลี่ยนไปทั้งระบบ
- **Zustand** สำหรับ client state, **@tanstack/react-table** สำหรับตารางข้อมูล, **zod** สำหรับ validate — ทั้งหมดเหมาะสมแล้ว ไม่ต้องเปลี่ยน

### สิ่งที่ควร**เพิ่ม**เข้ามา

| ความต้องการ | เทคโนโลยีที่แนะนำ | เหตุผล |
|---|---|---|
| อ่าน/parse ไฟล์ Excel ที่อัปโหลดเพื่อแสดงเป็นตาราง preview | **exceljs** (read mode) | ไฟล์ Excel เป็นผลลัพธ์สำเร็จรูปที่ admin อัปโหลดเข้ามาเอง ไม่มีการ render จาก source อื่น — แค่ parse เป็น JSON rows/columns แล้วแสดงด้วย `SharedDataTable`; **ไม่ต้องมี rendering engine/microservice แยกใด ๆ** (ตัด JasperReports ออกจาก stack ทั้งหมด — ระบบไม่อ่าน/render `.jasper`) |
| แสดง preview + สั่งพิมพ์ไฟล์ PDF (ฟอร์มเปล่า/ฟอร์มตัวอย่าง) | **Browser native PDF viewer** ผ่าน `<iframe>`/`<embed>` ชี้ signed URL ตรง ๆ | PDF ที่อัปโหลดมาเป็นไฟล์สำเร็จรูปแล้ว เบราว์เซอร์ render + มีปุ่มพิมพ์ในตัวอยู่แล้ว ไม่ต้องมี backend rendering เพิ่ม |
| จัดเก็บไฟล์ (PDF ฟอร์ม, Excel รายงาน/ตัวอย่างข้อมูล) | **ย้ายจาก `public/` → Object Storage (MinIO self-host หรือ S3 บน cloud)** พร้อม signed URL | ปัจจุบันเขียนไฟล์ลง `public/` runtime — ใช้ไม่ได้กับ serverless (เช่น Vercel) และไม่ scale เมื่อไฟล์เยอะ/หลาย instance |
| Full-text search ภาษาไทย+อังกฤษ | เริ่มจาก **PostgreSQL native** (`tsvector` + `pg_trgm` + `unaccent`) ก่อน ถ้าข้อมูลโตมากหรือต้องการ fuzzy/typo-tolerant ค่อยเสริมด้วย **Meilisearch** (self-host ง่าย, รองรับ tokenizer หลายภาษา) | ไม่ over-engineer ตั้งแต่แรก—เริ่มจากของที่มีอยู่ (Postgres) ก่อนเพิ่มระบบใหม่ |
| Background job (generate excel/pdf ใหญ่, ส่งอีเมลแจ้งเตือน, ลบ share link หมดอายุ) | **BullMQ + Redis** | งาน export/แจ้งเตือนไม่ควร block request-response ของ API route |
| Shared cache / rate-limit store | **Redis** | แก้ปัญหา in-memory rate limiter ที่ไม่ sync ข้าม instance |
| ส่งอีเมล (OTP, แจ้งเตือน, reset password) | **Nodemailer (SMTP ภายในองค์กร)** หรือ Resend/SendGrid ถ้าใช้ cloud | รองรับ requirement "เข้าสู่ระบบผ่าน email" |
| Pluggable auth provider (API / DB / Email) | เขียน **AuthProvider interface** เองใน `lib/auth` (Strategy pattern) เก็บ provider ที่เลือกไว้ในตาราง `settings` ที่มีอยู่แล้ว — ไม่แนะนำ migrate ทั้งระบบไป Auth.js/NextAuth เพราะ role/department/permission ผูกกับ payload คุกกี้ที่ custom ไว้ลึกแล้ว การ migrate จะ cost สูงกว่าการเพิ่ม abstraction layer เอง | โจทย์ต้องการ "ตั้งค่าได้" ไม่ใช่ "เปลี่ยนทั้งระบบไปใช้ของนอก" |
| 2FA | **otplib** (TOTP) ใช้คอลัมน์ `two_factor_secret` ที่มีอยู่แล้ว | ไม่ต้องเปลี่ยน schema |
| Antivirus scan ไฟล์อัปโหลด | **ClamAV** (รันเป็น sidecar container, สแกนก่อนย้ายไฟล์เข้า object storage) | ระบบรับไฟล์จากหลายแผนกจำนวนมาก ความเสี่ยง malware สูงกว่าระบบทั่วไป |
| Testing | **Vitest + React Testing Library** (unit/component), **Playwright** (E2E สำหรับ flow ค้นหา/ดาวน์โหลด/สิทธิ์) | ปัจจุบันไม่มี test เลย ความเสี่ยง regression สูงเมื่อ auth/permission logic ซับซ้อนขึ้น |
| Observability | **pino** (structured log) + **Sentry** (error tracking) | แทน `console.log` ที่กระจายอยู่ทุก route handler ตอนนี้ |
| CI/CD | **GitHub Actions**: lint → typecheck → build → `prisma migrate diff` check | ป้องกัน schema drift และ build พัง |
| Deployment | **Docker Compose**: Next.js app + PostgreSQL + Redis + MinIO (บน VM/on-prem ตามลักษณะข้อมูลภายในองค์กร) — ถ้าจะใช้ Vercel/serverless ต้องย้าย storage ออกจาก local disk ก่อนเท่านั้น | ต้องสอดคล้องกับข้อจำกัดเรื่อง local file write ที่มีอยู่ตอนนี้ (ไม่ต้องมี Jasper microservice — ระบบไม่ render `.jasper`) |
| i18n | **next-intl** | รองรับ UI ไทย/อังกฤษให้เป็นระบบแทนการ hardcode ปนกัน |

---

## 7. Roadmap ที่แนะนำ

### Phase 0 — Foundation & Bug Fix (ควรทำก่อนเพิ่มฟีเจอร์ใหม่)
- แก้ `middleware.ts` (`protectedPaths` ไม่ match ของจริง), รวมชื่อ cookie ให้ตรงกัน
- ย้าย rate limiter ไป Redis (หรืออย่างน้อย reset ทุก deploy ให้ปลอดภัยกว่าเดิมถ้ายังไม่มี Redis)
- เพิ่ม pagination ให้ `GET /api/reports/report/manage` และหน้า list อื่น ๆ
- สร้าง helper กลาง `logActivity()` แล้วเรียกจากทุก mutation endpoint

### Phase 1 — MVP ตามโจทย์เดิม (ฝั่งผู้ใช้ค้นหา/ดูรายงานได้จริง)
- ผูก Search จริง (FR-5), ผูก Favorites จริง (FR-6)
- Endpoint รายงานสำหรับ "user" ที่กรองตามสิทธิ์ที่มองเห็นได้จริง (ไม่ใช่ admin-only เหมือนปัจจุบัน)
- Download endpoint ที่บันทึกลง `downloads` + เพิ่ม `download_count`/`view_count`

### Phase 2 — โครงสร้างข้อมูลรายงานให้ครบตามโจทย์แอดมิน
- เพิ่มตาราง `report_files` (แยกชนิดไฟล์), `report_queries` (พร้อม constraint คิวรี่หลัก 1 อัน), `report_variables`
- เพิ่มตาราง `report_permissions` (สิทธิ์ระดับรายงาน ต่อ user/role)
- หน้า UI แก้ไขรายงาน + จัดการคิวรี่/ตัวแปร/สิทธิ์ต่อรายงาน

### Phase 3 — Versioning, Sharing, Notification, Dashboard
- UI version history (ไฟล์ + คิวรี่) พร้อม rollback
- ผูก UI ให้ `report_shares` ใช้งานได้จริง (share link + expiry)
- Producer/consumer ของ `notifications`
- Dashboard analytics จริง (จำนวนรายงาน, top downloaded, storage usage, กราฟรายเดือน)

### Phase 4 — Hardening & Scale-out
- ย้าย file storage ไป Object Storage
- 2FA, pluggable auth provider (API/Email)
- Background job queue, observability (Sentry/pino), test suite, CI/CD
- ตัดสินใจ scope ของ `support_tickets` (ทำต่อ หรือ ตัดออกจาก schema)

---

## 8. สมมติฐานและคำถามเปิด (Assumptions & Open Questions)

เอกสารนี้เขียนจากการอ่านโค้ด + requirement เดิมเท่านั้น มีจุดที่ต้องได้คำตอบจากเจ้าของระบบก่อนลงมือ Phase 2 เป็นต้นไป:

1. ~~องค์กรมี JasperReports Server อยู่แล้วหรือไม่~~ — **ตัดออกแล้ว**: ระบบนี้ไม่ render `.jasper`, จัดการเฉพาะไฟล์ PDF/Excel สำเร็จรูปที่ admin อัปโหลด (ดู correction ที่หัวเอกสารนี้ และ `system-design.md §3.8-3.9`)
2. ระบบจะ deploy แบบ on-prem/VM ภายในองค์กร หรือ cloud (มีผลต่อการเลือก object storage: MinIO vs S3 จริง)
3. มี SMTP/mail server ภายในองค์กรให้ใช้หรือไม่ (สำหรับ email OTP/แจ้งเตือน)
4. ประมาณจำนวนผู้ใช้พร้อมกัน (concurrent) และจำนวนรายงานที่คาดว่าจะมีในปีแรก เพื่อประเมินว่าจำเป็นต้องใช้ search engine แยก (Meilisearch) ตั้งแต่ Phase 1 หรือ Postgres เพียงพอ
5. `support_tickets` จะพัฒนาต่อเป็นฟีเจอร์จริงหรือไม่ (ปัจจุบันมีแค่ schema เปล่า)
6. ต้องรองรับ SSO/LDAP ภายในองค์กรหรือไม่ (มีผลโดยตรงต่อ FR-1 เรื่อง pluggable auth provider)
