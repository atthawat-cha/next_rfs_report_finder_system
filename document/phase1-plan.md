# Phase 1 — MVP ฝั่งผู้ใช้ (ค้นหา/ดูรายงานได้จริง)

## Context

Phase 0 (`document/phase0-plan.md`) ปิดจบแล้ว (commit `5809f5f`) ตอนนี้เข้า Phase 1 ตาม `document/project-specification.md §6`: search จริง, favorites จริง (แทน mock), download endpoint ที่บันทึก `downloads` + atomic counter, และ endpoint รายงานสำหรับ user ทั่วไปที่กรองตามสิทธิ์แบบหยาบ (ไม่ใช่ per-report ACL เต็มรูปแบบ ซึ่งเป็น Phase 2)

Audit โค้ดจริง (Explore agent, อ่านทุกไฟล์ที่เกี่ยวข้องเต็ม ไม่ใช่แค่ skim) พบว่า:
- Search UI เป็น stub เปล่า: `components/shared/searchInput.tsx` ไม่มี `value/onChange` เลย, `report-list/page.tsx:45` มี `hanelerSearch = () => {}` ว่าง
- ไม่มี Postgres full-text infra เลย (ไม่มี `tsvector`/GIN/`pg_trgm`/`unaccent` ในทั้ง schema และ migration)
- `favorites/page.tsx` อ่านจาก `fakedata/fakeReportList.ts` 100% ไม่มี API call เลย, ไม่มี favorites route ใดๆใน `app/api`
- `downloads` table มีอยู่แล้วใน schema แต่ไม่มี route ไหนเขียนลงเลย, ไม่มี route ไหน stream ไฟล์ให้ดาวน์โหลดเลย
- **บั๊กบล็อกแผนนี้**: `POST /api/reports/report/manage` validate `access_level` ด้วย zod แต่ `createParams` ที่ใช้สร้าง report จริงไม่มี field `access_level` เลย — ทุกรายงานได้ `PUBLIC` (default ของ schema) เสมอ และฟอร์มจริงผูก field นี้กับการเลือก role (ไปหา `roleIds` ที่ query มาแล้วไม่ได้ใช้ที่ไหนต่อ — dead code) ไม่ใช่ enum `PUBLIC/RESTRICTED/PRIVATE` ตาม schema
- `app/(auth)/reports/report-list/components/reportCards.tsx` (card view) render `models` ที่ hardcode เป็นการ์ด AI-model demo ปลอมไว้ในไฟล์ ไม่ได้ใช้ prop `reports` เลย
- `lib/types.ts` `ReportGetDataType.access_level` type เป็น `string[]` ทั้งที่ DB เป็น scalar enum — type ผิดจริง ต้องแก้

Resolved decisions (ยืนยันจากผู้ใช้):
1. Phase 1 browse endpoint ให้ non-admin เห็นเฉพาะ `access_level = PUBLIC` (และ `status = PUBLISHED`) เท่านั้น — `RESTRICTED`/`PRIVATE` รอ per-report ACL เต็มรูปแบบใน Phase 2 (ตรงกับ risk R1 ใน `project-specification.md §7`: ห้ามเปิดกว้างเกิน coarse rule ที่มี)
2. `department_id = NULL` บนรายงาน → เนื่องจาก Phase 1 กรองด้วย `access_level = PUBLIC` เป็นเกณฑ์เดียว department จึงไม่ใช่ access-control gate ใน phase นี้ (`?department=` เป็นแค่ filter สำหรับ narrow ผลค้นหา ไม่ใช่สิทธิ์การมองเห็น) — ยืนยันว่าถ้าใช้ department gate ในอนาคต ให้ถือ NULL = มองเห็นได้ทุกคน
3. แก้บั๊ก `access_level` ที่ฟอร์มสร้างรายงานพร้อมกันใน Phase 1 นี้ (เปลี่ยนเป็น single-select ตาม `AccessLevel` enum, เขียนลง `createParams` จริง, ลบ `roleIds` dead code)

---

## 1. Fix `access_level` persistence bug (prerequisite — ทำก่อนข้ออื่น)

**ปัญหา**: `reportZod.access_level: z.array(z.string())` (`app/api/reports/report/manage/route.ts`) ผูกกับ multi-select ของ role names ในฟอร์ม แต่ (a) ไม่เคยเขียนลง `createParams`, (b) ไม่ตรงกับ schema ที่เป็น scalar `AccessLevel` enum (`PUBLIC|RESTRICTED|PRIVATE`)

**แก้**:
- `reportZod`: เปลี่ยน `access_level: z.array(z.string()).min(1, ...)` → `access_level: z.enum(['PUBLIC', 'RESTRICTED', 'PRIVATE'])`
- ลบ block ที่ query `roleIds` จาก `prisma.roles.findMany(...)` ทั้งหมด (dead code)
- เพิ่ม `access_level: data.get("access_level") as string` เข้า `createParams` จริง
- Frontend (`report-create/page.tsx` + form component ที่ render multi-select ตัวนี้): เปลี่ยนจาก multi-select role → single-select 3 ตัวเลือก `PUBLIC/RESTRICTED/PRIVATE` พร้อม label ภาษาไทยอธิบายความหมาย (เผยแพร่ทั่วไป / จำกัดเฉพาะแผนก (รอ Phase 2) / ส่วนตัว (รอ Phase 2)) — ใส่ note ในหน้าฟอร์มว่า RESTRICTED/PRIVATE ยังไม่มีผลกรองจริงจนกว่าจะถึง Phase 2 เพื่อไม่ให้แอดมินเข้าใจผิดว่ากำหนดสิทธิ์ได้ละเอียดแล้ว
- `lib/types.ts`: แก้ `ReportGetDataType.access_level` จาก `string[]` → `AccessLevel` (import จาก `@/app/generated/prisma/enums`)

**Files**: `app/api/reports/report/manage/route.ts`, `app/(auth)/reports/report-create/page.tsx` (+ form component ที่เกี่ยวข้อง), `lib/types.ts`

---

## 2. Full-text search infrastructure (migration ใหม่)

ตาม `system-design.md §5.5`: เริ่มจาก Postgres native ก่อน ไม่ใช้ Meilisearch จนกว่าจะจำเป็นจริง

**Migration ใหม่** (`npx prisma migrate dev --name add_report_search`):
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE reports ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(name_th,'') || ' ' || coalesce(name_en,'') || ' ' || coalesce(description,'') || ' ' || coalesce(code,''))
  ) STORED;

CREATE INDEX reports_search_vector_idx ON reports USING GIN (search_vector);
CREATE INDEX reports_department_id_idx ON reports (department_id);
CREATE INDEX reports_status_category_id_idx ON reports (status, category_id);
```
ใช้ `'simple'` config (ไม่ใช่ `'english'`) เพราะข้อมูลผสมไทย/อังกฤษ และ `unaccent`/`pg_trgm` จะใช้เสริมสำหรับ fuzzy match ฝั่ง query (`similarity()`/`%` operator) ไม่ใช่ตัว `tsvector` เอง

Prisma 7 ไม่ generate `tsvector` type ให้ query ตรงในสคีมาได้สะดวก — ฝั่ง read ใช้ `prisma.$queryRaw`/`$queryRawUnsafe` (ระมัดระวัง SQL injection: ใช้ parameterized `$queryRaw` เท่านั้น ห้าม string-concat query ของผู้ใช้)

**Files**: migration ใหม่ใน `prisma/migrations/`, `prisma/schema.prisma` (เพิ่ม field `search_vector` แบบ `Unsupported("tsvector")` เพื่อให้ Prisma รู้จัก แม้ query ตรงไม่ได้)

---

## 3. `GET /api/reports/browse` — endpoint ใหม่สำหรับ non-admin

**Auth**: `requireRole(req, routeAcceptted('user'))` (ไม่ใช่ `'admin'`)

**Query params**: `q, category, department, tag, status, page, pageSize` (ตาม `system-design.md §4.2`)

**Query logic**:
```ts
const where = {
  status: 'PUBLISHED',       // baseline เสมอ ไม่รับ status จาก query param มา override เป็นค่าอื่นสำหรับ non-admin
  access_level: 'PUBLIC',    // Phase 1 coarse rule — ตัดสินใจแล้ว
  ...(category && { category_id: category }),
  ...(department && { department_id: department }),
  ...(tag && { report_tags: { some: { tags: { slug: tag } } } }),
};
```
ถ้ามี `q`: ใช้ raw query ผ่าน `$queryRaw` กับ `search_vector @@ to_tsquery('simple', ...)` แล้ว join กลับด้วย id ที่ได้ (หรือ query สอง pass: raw query หา matching ids ก่อน แล้ว `prisma.reports.findMany({ where: { id: { in: ids }, ...where } })` เพื่อคง type safety ของ field อื่น — เลือกวิธีนี้เพื่อลด raw SQL ให้เหลือแค่ส่วนค้นหา)

Response envelope: `{success, data, meta: {page, pageSize, total, totalPages}}` — ใช้ `lib/pagination.ts` เดิมจาก Phase 0

**Files**: `app/api/reports/browse/route.ts` (ใหม่)

---

## 4. ต่อ UI ค้นหาที่เป็น stub ให้ทำงานจริง

- `components/shared/searchInput.tsx`: เติม `value`/`onChange`, ลบ hardcode `"12 results"` → ใช้ `countRes` prop จริง
- `report-list/page.tsx`: แทน `hanelerSearch = () => {}` ด้วย debounce 300ms → `router.replace(pathname + '?' + params.toString())` ตาม `system-design.md §2.3`
- `*MainTable.tsx` ของหน้านี้: อ่าน `useSearchParams()` แล้ว fetch จาก `/api/reports/browse` (ไม่ใช่ `/api/reports/report/manage` เดิมที่ admin-only) เมื่อ role เป็น user; ถ้าหน้านี้ยังใช้ร่วมกับ admin ให้ switch endpoint ตาม role ของ session
- `reportCards.tsx`: ลบ hardcoded fake AI-model cards ทั้งหมด แก้ให้ render จาก prop `reports` จริง (ดูตัวอย่างโครงจาก `favReportCard.tsx` ที่ทำถูกอยู่แล้ว)

**Files**: `components/shared/searchInput.tsx`, `app/(auth)/reports/report-list/page.tsx`, `.../report-list/components/*MainTable.tsx`, `.../report-list/components/reportCards.tsx`

---

## 5. Favorites CRUD จริง

**New routes**:
- `POST /api/reports/favorites` `{ report_id }` — auth guard user, ตรวจว่ารายงานนั้น "มองเห็นได้" ตาม Phase 1 rule เดียวกับ browse (`status=PUBLISHED, access_level=PUBLIC`) ก่อนอนุญาตให้ favorite (นี่คือ `can_favorite` แบบง่ายของ Phase 1 แทนที่จะรอ per-report ACL ของ Phase 2 — ตาม design doc ที่ยังไม่ reconcile จุดนี้ชัดเจน จึงกำหนด rule เองตรงนี้), ใช้ `@@unique([user_id, report_id])` ที่มีอยู่แล้วกัน duplicate ไม่ต้องเช็คซ้ำมือ
- `GET /api/reports/favorites` — list รายงานที่ user คนนี้ favorite ไว้ (join `favorites` → `reports`)
- `DELETE /api/reports/favorites/[reportId]` — ลบ favorite ของ user ปัจจุบัน (`where: { user_id_report_id: {...} }`)
- ทุก route เขียน `logActivity` (เพิ่ม `'favorite'`/`'unfavorite'` เข้า `ActivityAction` union ใน `lib/activity-log.ts`)

**UI**:
- `favorites/page.tsx`: ลบ import `fakedata/fakeReportList`, เรียก `GET /api/reports/favorites` จริง
- `favReportColumn.tsx`: ลบ dropdown `Edit`/`Delete` ที่ไม่มี `onClick` เลย (ของ admin เอามาแปะผิด) แทนด้วยปุ่ม "เลิกโปรด" ที่เรียก `DELETE`
- ปุ่ม favorite/unfavorite บนหน้า browse (`report-list`) ให้เรียก `POST`/`DELETE` เดียวกันนี้ (ปัจจุบันไม่มีปุ่มนี้เลย ต้องเพิ่ม)

**Files**: `app/api/reports/favorites/route.ts` (ใหม่), `app/api/reports/favorites/[reportId]/route.ts` (ใหม่), `lib/activity-log.ts` (แก้ type union), `app/(auth)/reports/favorites/page.tsx`, `.../favorites/components/favReportColumn.tsx`, `.../report-list/` (เพิ่มปุ่ม favorite)

---

## 6. Download endpoint

`GET /api/reports/[id]/download`:
1. `requireRole(req, routeAcceptted('user'))`
2. โหลด report, เช็ค visibility rule เดียวกับ browse + `is_downloadable === true` (ถ้าเป็น admin ข้าม visibility check ได้)
3. อ่านไฟล์จาก `public/{file_path}` ด้วย `fs.readFile`, ส่งกลับเป็น `NextResponse` พร้อม header `Content-Disposition: attachment` และ `Content-Type` ตาม `file_type` — **ไม่** redirect ไปที่ static path ตรงๆ (ตาม `system-design.md §3.8`: ต้องผ่าน route เพื่อให้ ACL check + log เกิดก่อนเสมอ)
4. Atomic increment: `prisma.reports.update({ where: { id }, data: { download_count: { increment: 1 } } })`
5. `prisma.downloads.create({ data: { id: faker.string.uuid(), user_id, report_id, ip_address, user_agent } })`
6. `logActivity` (เพิ่ม `'download'` เข้า `ActivityAction` union)

ถือเป็น scope-reduction ที่ตั้งใจจาก `system-design.md §3.8` เต็มรูปแบบ (ซึ่งพูดถึง `output_type`/`report_files`/PRINT_FORM vs DATA_REPORT ที่เป็น schema เพิ่มของ Phase 2) — Phase 1 มีแค่ `file_path` เดียวต่อรายงาน จึงทำ single-file download ธรรมดาไปก่อน

ปุ่ม "ดาวน์โหลด" บนหน้า browse/favorites ต้อง link ไปที่ endpoint นี้ (ไม่ใช่ `file_path` ตรงๆ ที่อาจมีการอ้างอิงอยู่บ้างแล้วในโค้ดเดิม)

**Files**: `app/api/reports/[id]/download/route.ts` (ใหม่), ปุ่ม download ใน `report-list`/`favorites` components

---

## Sequencing

1. ข้อ 1 (fix access_level bug) ก่อนเสมอ — ข้อ 3/5/6 ทั้งหมดพึ่งพา `access_level` ที่ถูกต้องจริงในการกรอง ถ้าไม่แก้ก่อน ทุกรายงานจะเป็น `PUBLIC` เหมือนเดิมและมองไม่เห็นบั๊กจนกว่าจะมีการสร้างรายงาน RESTRICTED/PRIVATE จริง
2. ข้อ 2 (migration) ก่อนข้อ 3 (browse endpoint พึ่ง `search_vector` สำหรับ `q`)
3. ข้อ 3-4 (browse endpoint + UI) คู่กัน — endpoint ว่างจาก UI ก็ทดสอบได้แค่ผ่าน curl
4. ข้อ 5-6 (favorites, download) ทำคู่กันได้ independent จากข้อ 3-4 เพราะใช้ visibility rule เดียวกันที่นิยามไว้แล้ว แต่แนะนำ抽出เป็น helper กลาง (`lib/report-visibility.ts` เล็กๆ) ที่ทั้ง browse/favorites/download เรียกร่วม เพื่อไม่ให้ rule เขียนซ้ำ 3 ที่แล้ว drift กันเองภายหลัง (สร้างตอนนี้เพื่อเตรียมสลับเป็น `lib/report-acl.ts` เต็มรูปแบบใน Phase 2 ได้ง่ายกว่า)

## Verification

- `npx tsc --noEmit` และ `npm run build` ต้องไม่มี error ใหม่ (มี pre-existing errors อยู่แล้วจาก Phase 0 ที่ไม่เกี่ยวกัน — ดู `favorites/page.tsx` type mismatch ที่จะหายไปเองหลังข้อ 5 แก้ favorites ให้ใช้ type จริง)
- สร้างรายงานผ่านฟอร์มแอดมิน 3 รายงานด้วย access_level ต่างกัน (PUBLIC/RESTRICTED/PRIVATE) → query DB ตรงยืนยันว่า column เก็บค่าตรงกับที่เลือกจริง (แก้บั๊กข้อ 1 สำเร็จ)
- `GET /api/reports/browse` ไม่มี query → เห็นแค่รายงานที่ PUBLIC+PUBLISHED เท่านั้น; ใส่ `?q=` ด้วยคำที่มีทั้งใน `name_th` ภาษาไทยและ `name_en` ภาษาอังกฤษ → คืนผลถูกทั้งคู่
- Favorite รายงาน PUBLIC สำเร็จ → เห็นในหน้า Favorites; พยายาม favorite รายงาน PRIVATE ผ่าน curl ตรง → ถูกปฏิเสธ (ไม่ใช่ 500)
- ดาวน์โหลดรายงานที่ `is_downloadable=false` → ถูกปฏิเสธ; ดาวน์โหลดที่อนุญาต → ไฟล์มาถูกต้อง + `downloads` table มีแถวใหม่ + `reports.download_count` เพิ่มขึ้น 1 (ทดสอบ concurrent 2 request พร้อมกันด้วย ยืนยันว่าไม่เกิด race condition เพราะใช้ atomic increment)
